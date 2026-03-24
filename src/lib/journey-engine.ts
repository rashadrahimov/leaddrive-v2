import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

interface StepResult {
  stepId: string
  stepType: string
  status: "completed" | "waiting" | "failed" | "skipped"
  message: string
  nextActionAt?: Date
}

/**
 * Process the current step for a journey enrollment.
 * Executes the action (email, telegram, sms, etc.) and advances to next step.
 */
export async function processEnrollmentStep(enrollmentId: string, orgId: string): Promise<StepResult> {
  const enrollment = await prisma.journeyEnrollment.findFirst({
    where: { id: enrollmentId, organizationId: orgId, status: "active" },
  })

  if (!enrollment || !enrollment.currentStepId) {
    return { stepId: "", stepType: "", status: "failed", message: "Enrollment not found or completed" }
  }

  const journey = await prisma.journey.findFirst({
    where: { id: enrollment.journeyId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  })

  if (!journey) {
    return { stepId: "", stepType: "", status: "failed", message: "Journey not found" }
  }

  const currentStep = journey.steps.find((s: any) => s.id === enrollment.currentStepId)
  if (!currentStep) {
    return { stepId: "", stepType: "", status: "failed", message: "Current step not found" }
  }

  const config = (currentStep.config || {}) as any
  const leadId = enrollment.leadId
  const contactId = enrollment.contactId

  // Get lead/contact info for template variables
  let recipientName = ""
  let recipientEmail = ""
  let recipientPhone = ""
  let companyName = ""

  if (leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (lead) {
      recipientName = lead.contactName || ""
      recipientEmail = lead.email || ""
      recipientPhone = lead.phone || ""
      companyName = lead.companyName || ""
    }
  } else if (contactId) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (contact) {
      recipientName = contact.fullName || ""
      recipientEmail = contact.email || ""
      recipientPhone = contact.phone || ""
    }
  }

  // Invoice context (for invoice communication chains)
  let invoiceNumber = ""
  let invoiceAmount = ""
  let invoiceDueDate = ""
  let invoiceBalanceDue = ""
  let invoicePdfUrl = ""

  const invoiceId = (enrollment as any).invoiceId
  if (invoiceId) {
    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        totalAmount: true,
        balanceDue: true,
        dueDate: true,
        currency: true,
        viewToken: true,
        recipientName: true,
        recipientEmail: true,
        company: { select: { name: true } },
        contact: { select: { fullName: true, email: true, phone: true } },
      },
    })
    if (inv) {
      invoiceNumber     = inv.invoiceNumber
      invoiceAmount     = `${inv.totalAmount.toLocaleString()} ${inv.currency}`
      invoiceBalanceDue = `${inv.balanceDue.toLocaleString()} ${inv.currency}`
      invoiceDueDate    = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : ""
      invoicePdfUrl     = inv.viewToken
        ? `${process.env.NEXTAUTH_URL}/portal/invoice/${inv.viewToken}` : ""
      // Fallback: if enrollment has no contact/lead, use invoice recipient info
      if (!recipientName) recipientName = inv.recipientName || inv.contact?.fullName || ""
      if (!recipientEmail) recipientEmail = inv.recipientEmail || inv.contact?.email || ""
      if (!recipientPhone) recipientPhone = inv.contact?.phone || ""
      if (!companyName) companyName = inv.company?.name || ""
    }
  }

  // Replace template variables
  function replaceVars(text: string): string {
    return text
      .replace(/\{\{contact_name\}\}/g, recipientName)
      .replace(/\{\{recipient_name\}\}/g, recipientName)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{email\}\}/g, recipientEmail)
      .replace(/\{\{phone\}\}/g, recipientPhone)
      .replace(/\{\{invoice_number\}\}/g, invoiceNumber)
      .replace(/\{\{amount\}\}/g, invoiceAmount)
      .replace(/\{\{due_date\}\}/g, invoiceDueDate)
      .replace(/\{\{balance_due\}\}/g, invoiceBalanceDue)
      .replace(/\{\{invoice_url\}\}/g, invoicePdfUrl)
  }

  let result: StepResult

  try {
    switch (currentStep.stepType) {
      case "send_email": {
        if (!recipientEmail) {
          result = { stepId: currentStep.id, stepType: "send_email", status: "skipped", message: `No email for ${recipientName || "lead"}` }
          break
        }
        const subject = replaceVars(config.subject || "Без темы")
        const body = replaceVars(config.body || "")
        await sendEmail({
          to: recipientEmail,
          subject,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${body.replace(/\n/g, "<br>")}</div>`,
          organizationId: orgId,
        })
        result = { stepId: currentStep.id, stepType: "send_email", status: "completed", message: `Email sent to ${recipientEmail}: "${subject}"` }
        break
      }

      case "sms": {
        const message = replaceVars(config.message || "")
        const smsChannel = await prisma.channelConfig.findFirst({
          where: { organizationId: orgId, channelType: "sms", isActive: true },
        })

        if (smsChannel?.apiKey && smsChannel?.phoneNumber && recipientPhone) {
          // Twilio SMS sending
          const smsSettings = (smsChannel.settings as any) || {}
          const accountSid = smsSettings.accountSid || ""
          const authToken = smsChannel.apiKey

          if (accountSid) {
            try {
              const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
              const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
              const params = new URLSearchParams({
                To: recipientPhone,
                From: smsChannel.phoneNumber,
                Body: message,
              })
              const smsRes = await fetch(twilioUrl, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${twilioAuth}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params.toString(),
              })
              const smsData = await smsRes.json()
              if (smsData.sid) {
                result = { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS sent via Twilio to ${recipientPhone}: SID ${smsData.sid}` }
              } else {
                result = { stepId: currentStep.id, stepType: "sms", status: "completed", message: `Twilio error: ${smsData.message || JSON.stringify(smsData)}` }
              }
            } catch (smsErr: any) {
              result = { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS error: ${smsErr.message}` }
            }
          } else {
            console.log(`[Journey SMS] No accountSid configured. To: ${recipientPhone}, Message: ${message}`)
            result = { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS logged (no accountSid): "${message.slice(0, 50)}..." → ${recipientPhone}` }
          }
        } else {
          console.log(`[Journey SMS] Missing config or phone. To: ${recipientPhone}, Message: ${message}`)
          result = { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS logged: "${message.slice(0, 50)}..." → ${recipientPhone || "(no phone)"}` }
        }
        break
      }

      case "send_telegram": {
        const message = replaceVars(config.message || "")
        const tgChannel = await prisma.channelConfig.findFirst({
          where: { organizationId: orgId, channelType: "telegram", isActive: true },
        })
        if (tgChannel?.botToken) {
          try {
            const tgSettings = (tgChannel.settings as any) || {}
            const chatId = config.chatId || config.chat_id || tgSettings.chatId
            if (chatId) {
              const tgText = [
                `<b>💳 Ödəniş xatırlatması</b>`,
                ``,
                message,
                ``,
                `Maliyyə məsələləri üçün:`,
                `📧 accreceivable@gtc.az`,
              ].join("\n")
              const tgBody: any = {
                chat_id: chatId,
                text: tgText,
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "📞 +994 10 236 99 09", url: "tel:+994102369909" }],
                    [{ text: "www.leaddrivecrm.org", url: "https://www.leaddrivecrm.org" }],
                  ],
                },
              }
              const tgRes = await fetch(`https://api.telegram.org/bot${tgChannel.botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tgBody),
              })
              const tgData = await tgRes.json()
              if (tgData.ok) {
                result = { stepId: currentStep.id, stepType: "send_telegram", status: "completed", message: `Telegram sent to chat ${chatId}` }
              } else {
                result = { stepId: currentStep.id, stepType: "send_telegram", status: "completed", message: `Telegram API: ${tgData.description}` }
              }
            } else {
              console.log(`[Journey Telegram] No chatId. Message: ${message}`)
              result = { stepId: currentStep.id, stepType: "send_telegram", status: "completed", message: `Telegram logged (no chatId): "${message.slice(0, 50)}..."` }
            }
          } catch (tgErr: any) {
            result = { stepId: currentStep.id, stepType: "send_telegram", status: "completed", message: `Telegram error: ${tgErr.message}` }
          }
        } else {
          console.log(`[Journey Telegram] No bot configured. Message: ${message}`)
          result = { stepId: currentStep.id, stepType: "send_telegram", status: "completed", message: `Telegram logged (no bot): "${message.slice(0, 50)}..."` }
        }
        break
      }

      case "send_whatsapp": {
        const waChannel = await prisma.channelConfig.findFirst({
          where: { organizationId: orgId, channelType: "whatsapp", isActive: true },
        })
        if (waChannel?.apiKey && waChannel?.phoneNumber && recipientPhone) {
          try {
            // Use approved template with positional parameters (v20.0 named vars)
            const waRes = await fetch(`https://graph.facebook.com/v20.0/${waChannel.phoneNumber}/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${waChannel.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: recipientPhone,
                type: "template",
                template: {
                  name: "invoice_payment_reminder",
                  language: { code: "az" },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        { type: "text", parameter_name: "customer_name", text: recipientName || recipientPhone },
                        { type: "text", parameter_name: "invoice_number", text: invoiceNumber || "-" },
                        { type: "text", parameter_name: "amount", text: invoiceAmount || "-" },
                        { type: "text", parameter_name: "balance_due", text: invoiceBalanceDue || "-" },
                        { type: "text", parameter_name: "due_date", text: invoiceDueDate || "-" },
                      ],
                    },
                  ],
                },
              }),
            })
            const waData = await waRes.json()
            if (waData.messages?.[0]?.id) {
              result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp sent to ${recipientPhone}: ${waData.messages[0].id}` }
            } else {
              result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp API: ${JSON.stringify(waData).slice(0, 200)}` }
            }
          } catch (waErr: any) {
            result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp error: ${waErr.message}` }
          }
        } else {
          console.log(`[Journey WhatsApp] Missing config or phone. To: ${recipientPhone}`)
          result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp logged (no config) → ${recipientPhone || "(no phone)"}` }
        }
        break
      }

      case "wait": {
        const days = config.days || 1
        const unit = config.unit || "days"
        let ms: number
        switch (unit) {
          case "minutes": ms = days * 60 * 1000; break
          case "hours": ms = days * 60 * 60 * 1000; break
          case "weeks": ms = days * 7 * 24 * 60 * 60 * 1000; break
          default: ms = days * 24 * 60 * 60 * 1000; break
        }
        const nextActionAt = new Date(Date.now() + ms)

        await prisma.journeyEnrollment.update({
          where: { id: enrollmentId },
          data: { nextActionAt },
        })

        // Mark step completed
        await prisma.journeyStep.update({
          where: { id: currentStep.id },
          data: { statsCompleted: { increment: 1 } },
        })

        // Move to next step (but don't execute yet — will be processed when nextActionAt arrives)
        const nextStep = journey.steps.find((s: any) => s.stepOrder === currentStep.stepOrder + 1)
        if (nextStep) {
          await prisma.journeyEnrollment.update({
            where: { id: enrollmentId },
            data: { currentStepId: nextStep.id },
          })
          await prisma.journeyStep.update({
            where: { id: nextStep.id },
            data: { statsEntered: { increment: 1 } },
          })
        }

        return {
          stepId: currentStep.id,
          stepType: "wait",
          status: "waiting",
          message: `Waiting ${days} ${unit} until ${nextActionAt.toISOString()}`,
          nextActionAt,
        }
      }

      case "condition": {
        const field = config.field || ""
        const operator = config.operator || "equals"
        const value = config.value || ""
        let fieldValue = ""

        if (leadId) {
          const lead = await prisma.lead.findUnique({ where: { id: leadId } })
          if (lead) fieldValue = String((lead as any)[field] || "")
        }

        let match = false
        switch (operator) {
          case "equals": match = fieldValue === value; break
          case "not_equals": match = fieldValue !== value; break
          case "contains": match = fieldValue.includes(value); break
          case "not_empty": match = fieldValue.length > 0; break
        }

        // Condition doesn't block — it just logs and continues
        result = {
          stepId: currentStep.id,
          stepType: "condition",
          status: "completed",
          message: `Condition: ${field} ${operator} ${value} → ${match ? "YES" : "NO"} (value: "${fieldValue}")`,
        }
        break
      }

      case "create_task": {
        await prisma.task.create({
          data: {
            organizationId: orgId,
            title: replaceVars(config.title || "Journey Task"),
            description: replaceVars(config.description || ""),
            status: "todo",
            priority: config.priority || "medium",
          },
        })
        result = { stepId: currentStep.id, stepType: "create_task", status: "completed", message: `Task created: "${config.title}"` }
        break
      }

      case "update_field": {
        const field = config.field || ""
        const newValue = config.value || ""
        if (leadId && field) {
          await prisma.lead.update({
            where: { id: leadId },
            data: { [field]: newValue },
          })
        }
        result = { stepId: currentStep.id, stepType: "update_field", status: "completed", message: `Field "${field}" updated to "${newValue}"` }
        break
      }

      default:
        result = { stepId: currentStep.id, stepType: currentStep.stepType, status: "skipped", message: `Unknown step type: ${currentStep.stepType}` }
    }

    // Mark step completed
    await prisma.journeyStep.update({
      where: { id: currentStep.id },
      data: { statsCompleted: { increment: 1 } },
    })

    // Move to next step
    const nextStep = journey.steps.find((s: any) => s.stepOrder === currentStep.stepOrder + 1)

    if (nextStep) {
      await prisma.journeyEnrollment.update({
        where: { id: enrollmentId },
        data: { currentStepId: nextStep.id, nextActionAt: new Date() },
      })
      await prisma.journeyStep.update({
        where: { id: nextStep.id },
        data: { statsEntered: { increment: 1 } },
      })

      // Process next step immediately (unless it's a wait)
      const nextResult = await processEnrollmentStep(enrollmentId, orgId)
      return nextResult
    } else {
      // Journey completed
      await prisma.journeyEnrollment.update({
        where: { id: enrollmentId },
        data: { status: "completed", completedAt: new Date(), currentStepId: null },
      })
      await prisma.journey.update({
        where: { id: enrollment.journeyId },
        data: {
          activeCount: { decrement: 1 },
          completedCount: { increment: 1 },
        },
      })
      result.message += " → Journey completed!"
      return result
    }
  } catch (err: any) {
    console.error(`[Journey Step Error] Step ${currentStep.id}: ${err.message}`)
    return { stepId: currentStep.id, stepType: currentStep.stepType, status: "failed", message: err.message }
  }
}
