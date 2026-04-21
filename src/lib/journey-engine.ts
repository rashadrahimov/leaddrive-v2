import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { sendSms } from "@/lib/sms"

// Whitelist of fields that journey steps are allowed to update per entity type
const SAFE_UPDATE_FIELDS: Record<string, Set<string>> = {
  lead: new Set(["status", "priority", "assignedTo", "notes", "source", "tags"]),
  contact: new Set(["status", "notes", "tags"]),
}

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

  // Escape HTML special characters to prevent injection
  function escHtml(s: unknown): string {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  // Replace template variables (values are HTML-escaped to prevent injection)
  function replaceVars(text: string): string {
    return text
      .replace(/\{\{contact_name\}\}/g, escHtml(recipientName))
      .replace(/\{\{recipient_name\}\}/g, escHtml(recipientName))
      .replace(/\{\{company_name\}\}/g, escHtml(companyName))
      .replace(/\{\{email\}\}/g, escHtml(recipientEmail))
      .replace(/\{\{phone\}\}/g, escHtml(recipientPhone))
      .replace(/\{\{invoice_number\}\}/g, escHtml(invoiceNumber))
      .replace(/\{\{amount\}\}/g, escHtml(invoiceAmount))
      .replace(/\{\{due_date\}\}/g, escHtml(invoiceDueDate))
      .replace(/\{\{balance_due\}\}/g, escHtml(invoiceBalanceDue))
      .replace(/\{\{invoice_url\}\}/g, escHtml(invoicePdfUrl))
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
        if (!recipientPhone) {
          result = { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS skipped (no phone): "${message.slice(0, 50)}..."` }
          break
        }
        const smsResult = await sendSms({ to: recipientPhone, message, organizationId: orgId })
        result = smsResult.success
          ? { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS sent to ${recipientPhone}${smsResult.messageId ? ` (id ${smsResult.messageId})` : ""}` }
          : { stepId: currentStep.id, stepType: "sms", status: "completed", message: `SMS error: ${smsResult.error || "unknown"}` }
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
              // Previously this wrapped the message in a hardcoded Azerbaijani
              // "Ödəniş xatırlatması" header and the Güvən Technology finance
              // address (accreceivable@gtc.az, +994 10 236 99 09). That leaked
              // the old brand into every tenant's Telegram messages regardless
              // of language. The message itself is already localized by
              // invoice-chain-template.ts based on invoice.documentLanguage,
              // so we just send it as-is.
              const tgBody: any = {
                chat_id: chatId,
                text: message,
                parse_mode: "HTML",
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
        // Journey "send_whatsapp" step. The step's config.templateName wins;
        // otherwise we fall back to the org's default
        // ChannelConfig.settings.whatsappJourneyDefaultTemplate. If neither is
        // set → skip with a log entry instead of sending the old hardcoded
        // Azerbaijani invoice_payment_reminder to whomever happens to be the
        // enrollment target.
        if (!recipientPhone) {
          result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp skipped (no phone)` }
          break
        }
        const waChannel = await prisma.channelConfig.findFirst({
          where: { organizationId: orgId, channelType: "whatsapp", isActive: true },
        })
        const configTemplate = (config as any).templateName as string | undefined
        const settingsTemplate = (waChannel?.settings as any)?.whatsappJourneyDefaultTemplate as string | undefined
        const templateName = configTemplate || settingsTemplate
        if (!templateName) {
          result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp skipped (no template configured; set step.config.templateName or ChannelConfig.settings.whatsappJourneyDefaultTemplate)` }
          break
        }
        try {
          const { sendWhatsAppTemplate } = await import("@/lib/whatsapp")
          const waRes = await sendWhatsAppTemplate({
            to: recipientPhone,
            templateName,
            languageCode: (config as any).languageCode,
            variables: {
              "1": recipientName || recipientPhone,
              "2": invoiceNumber || "-",
              "3": invoiceAmount || "-",
              "4": invoiceBalanceDue || "-",
              "5": invoiceDueDate || "-",
              customer_name: recipientName || recipientPhone,
              invoice_number: invoiceNumber || "-",
              amount: invoiceAmount || "-",
              balance_due: invoiceBalanceDue || "-",
              due_date: invoiceDueDate || "-",
            },
            organizationId: orgId,
          })
          if (waRes.success) {
            result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp sent to ${recipientPhone}: ${waRes.messageId}` }
          } else {
            result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp error: ${waRes.error}` }
          }
        } catch (waErr: any) {
          result = { stepId: currentStep.id, stepType: "send_whatsapp", status: "completed", message: `WhatsApp error: ${waErr.message}` }
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
        const onFalse = config.onFalse || "continue" // continue | skip_next | skip_2 | stop | restart
        const onTrue = config.onTrue || "continue"
        let fieldValue = ""

        // Get field value — check invoice first, then lead/contact
        if (field.startsWith("invoice_") || field === "balance_due") {
          // Invoice-specific fields
          if (invoiceId) {
            const inv = await prisma.invoice.findUnique({
              where: { id: invoiceId },
              select: { status: true, balanceDue: true, totalAmount: true },
            })
            if (inv) {
              if (field === "invoice_status") fieldValue = inv.status || ""
              else if (field === "balance_due") fieldValue = String(inv.balanceDue || 0)
            }
          }
        } else if (leadId) {
          const lead = await prisma.lead.findUnique({ where: { id: leadId } })
          if (lead) fieldValue = String((lead as any)[field] || "")
        } else if (contactId) {
          const contact = await prisma.contact.findUnique({ where: { id: contactId } })
          if (contact) fieldValue = String((contact as any)[field] || "")
        }

        let match = false
        switch (operator) {
          case "equals": match = fieldValue.toLowerCase() === value.toLowerCase(); break
          case "not_equals": match = fieldValue.toLowerCase() !== value.toLowerCase(); break
          case "contains": match = fieldValue.toLowerCase().includes(value.toLowerCase()); break
          case "not_empty": match = fieldValue.length > 0; break
        }

        if (match) {
          // Condition TRUE — apply onTrue action
          if (onTrue === "stop") {
            await prisma.journeyEnrollment.update({
              where: { id: enrollmentId },
              data: { status: "completed", completedAt: new Date(), currentStepId: null, nextActionAt: null },
            })
            return {
              stepId: currentStep.id, stepType: "condition", status: "completed",
              message: `Condition TRUE → Journey stopped. ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
            }
          }
          if (onTrue === "restart") {
            const firstStep = journey.steps.find((s: any) => s.stepOrder === 1)
            if (firstStep) {
              await prisma.journeyStep.update({ where: { id: currentStep.id }, data: { statsCompleted: { increment: 1 } } })
              await prisma.journeyEnrollment.update({
                where: { id: enrollmentId },
                data: { currentStepId: firstStep.id, nextActionAt: new Date() },
              })
              await prisma.journeyStep.update({ where: { id: firstStep.id }, data: { statsEntered: { increment: 1 } } })
              return {
                stepId: currentStep.id, stepType: "condition", status: "completed",
                message: `Condition TRUE → Restarting from step 1. ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
              }
            }
          }
          // Default: continue to next step
          result = {
            stepId: currentStep.id,
            stepType: "condition",
            status: "completed",
            message: `Condition TRUE: ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
          }
        } else {
          // Condition FALSE — apply onFalse action
          if (onFalse === "stop") {
            // Stop the entire journey
            await prisma.journeyEnrollment.update({
              where: { id: enrollmentId },
              data: { status: "completed", completedAt: new Date(), currentStepId: null, nextActionAt: null },
            })
            return {
              stepId: currentStep.id,
              stepType: "condition",
              status: "completed",
              message: `Condition FALSE → Journey stopped. ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
            }
          }

          if (onFalse === "restart") {
            // Restart from step 1 (loop)
            const firstStep = journey.steps.find((s: any) => s.stepOrder === 1)
            if (firstStep) {
              await prisma.journeyStep.update({ where: { id: currentStep.id }, data: { statsCompleted: { increment: 1 } } })
              await prisma.journeyEnrollment.update({
                where: { id: enrollmentId },
                data: { currentStepId: firstStep.id, nextActionAt: new Date() },
              })
              await prisma.journeyStep.update({ where: { id: firstStep.id }, data: { statsEntered: { increment: 1 } } })
              return {
                stepId: currentStep.id,
                stepType: "condition",
                status: "completed",
                message: `Condition FALSE → Restarting from step 1. ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
              }
            }
          }

          const skipCount = onFalse === "skip_2" ? 2 : onFalse === "skip_next" ? 1 : 0
          if (skipCount > 0) {
            // Skip N steps by advancing stepOrder
            const targetOrder = currentStep.stepOrder + 1 + skipCount
            const targetStep = journey.steps.find((s: any) => s.stepOrder >= targetOrder)
            if (targetStep) {
              await prisma.journeyStep.update({ where: { id: currentStep.id }, data: { statsCompleted: { increment: 1 } } })
              await prisma.journeyEnrollment.update({
                where: { id: enrollmentId },
                data: { currentStepId: targetStep.id, nextActionAt: new Date() },
              })
              await prisma.journeyStep.update({ where: { id: targetStep.id }, data: { statsEntered: { increment: 1 } } })
              return {
                stepId: currentStep.id,
                stepType: "condition",
                status: "completed",
                message: `Condition FALSE → Skipped ${skipCount} step(s). ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
              }
            }
            // No more steps after skip — complete journey
            await prisma.journeyEnrollment.update({
              where: { id: enrollmentId },
              data: { status: "completed", completedAt: new Date(), currentStepId: null, nextActionAt: null },
            })
            return {
              stepId: currentStep.id,
              stepType: "condition",
              status: "completed",
              message: `Condition FALSE → Skipped past end → Journey completed. ${field} ${operator} ${value || ""}`,
            }
          }

          // Default: continue (same as TRUE)
          result = {
            stepId: currentStep.id,
            stepType: "condition",
            status: "completed",
            message: `Condition FALSE (continue): ${field} ${operator} ${value || ""} (value: "${fieldValue}")`,
          }
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
        const entityType = leadId ? "lead" : contactId ? "contact" : ""
        const allowedFields = entityType ? SAFE_UPDATE_FIELDS[entityType] : undefined
        if (!allowedFields || !allowedFields.has(field)) {
          console.error(`[Journey] Blocked update of restricted field: ${entityType || "unknown"}.${field}`)
          result = { stepId: currentStep.id, stepType: "update_field", status: "skipped", message: `Blocked restricted field: ${field}` }
          break
        }
        if (leadId && field) {
          await prisma.lead.update({
            where: { id: leadId },
            data: { [field]: newValue },
          })
        } else if (contactId && field) {
          await prisma.contact.update({
            where: { id: contactId },
            data: { [field]: newValue },
          })
        }
        result = { stepId: currentStep.id, stepType: "update_field", status: "completed", message: `Field "${field}" updated to "${newValue}"` }
        break
      }

      case "ab_split": {
        // A/B split: random routing by percentages
        const paths = (currentStep as any).splitPaths as { percentage: number; nextStepId: string }[] | null
        if (!paths || paths.length === 0) {
          result = { stepId: currentStep.id, stepType: "ab_split", status: "skipped", message: "No split paths configured" }
          break
        }
        const rand = Math.random() * 100
        let cumulative = 0
        let selectedPath = paths[paths.length - 1]
        for (const path of paths) {
          cumulative += path.percentage
          if (rand <= cumulative) { selectedPath = path; break }
        }
        // Navigate directly to the selected path step
        if (selectedPath.nextStepId) {
          const targetStep = journey.steps.find((s: any) => s.id === selectedPath.nextStepId)
          if (targetStep) {
            await prisma.journeyStep.update({ where: { id: currentStep.id }, data: { statsCompleted: { increment: 1 } } })
            await prisma.journeyEnrollment.update({
              where: { id: enrollmentId },
              data: { currentStepId: targetStep.id, nextActionAt: new Date() },
            })
            await prisma.journeyStep.update({ where: { id: targetStep.id }, data: { statsEntered: { increment: 1 } } })
            return await processEnrollmentStep(enrollmentId, orgId)
          }
        }
        result = { stepId: currentStep.id, stepType: "ab_split", status: "completed", message: `A/B split: routed to path` }
        break
      }

      case "goal_check": {
        // Check goal condition — if met, complete enrollment
        const goalField = config.field || ""
        const goalValue = config.value || ""
        let goalMet = false

        if (leadId) {
          const lead = await prisma.lead.findUnique({ where: { id: leadId } })
          if (lead) goalMet = String((lead as any)[goalField] || "") === goalValue
        } else if (contactId) {
          const contact = await prisma.contact.findUnique({ where: { id: contactId } })
          if (contact) goalMet = String((contact as any)[goalField] || "") === goalValue
        }

        if (goalMet) {
          await prisma.journeyEnrollment.update({
            where: { id: enrollmentId },
            data: { status: "completed", exitReason: "goal_reached", goalReachedAt: new Date(), completedAt: new Date() },
          })
          await prisma.journey.update({
            where: { id: enrollment.journeyId },
            data: { conversionCount: { increment: 1 }, activeCount: { decrement: 1 } },
          })
          return { stepId: currentStep.id, stepType: "goal_check", status: "completed", message: `Goal reached: ${goalField} = ${goalValue}` }
        }
        result = { stepId: currentStep.id, stepType: "goal_check", status: "completed", message: `Goal not met: ${goalField} ≠ ${goalValue}` }
        break
      }

      case "webhook": {
        // Fire-and-forget HTTP POST
        const url = config.url || ""
        if (!url) {
          result = { stepId: currentStep.id, stepType: "webhook", status: "skipped", message: "No webhook URL configured" }
          break
        }
        try {
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollmentId, journeyId: enrollment.journeyId,
              contactId, leadId, stepId: currentStep.id,
              recipientName, recipientEmail,
            }),
            signal: AbortSignal.timeout(10000),
          })
          result = { stepId: currentStep.id, stepType: "webhook", status: "completed", message: `Webhook sent to ${url}` }
        } catch (webhookErr: any) {
          result = { stepId: currentStep.id, stepType: "webhook", status: "completed", message: `Webhook error: ${webhookErr.message}` }
        }
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

    // Get next step using branching (Phase 4) or fallback to stepOrder
    let nextStep: any = null

    // For condition steps: use yes/no branching based on the result
    if (currentStep.stepType === "condition" || currentStep.stepType === "goal_check") {
      const conditionPassed = result.message.includes("TRUE") || result.message.includes("Goal reached") || result.message.includes("Met")
      const nextStepId = conditionPassed
        ? (currentStep as any).yesNextStepId
        : (currentStep as any).noNextStepId
      if (nextStepId) {
        nextStep = journey.steps.find((s: any) => s.id === nextStepId)
      }
    }

    // For regular steps: follow yesNextStepId (default path)
    if (!nextStep && (currentStep as any).yesNextStepId) {
      nextStep = journey.steps.find((s: any) => s.id === (currentStep as any).yesNextStepId)
    }

    // Fallback: stepOrder + 1 (backward compatibility)
    if (!nextStep) {
      nextStep = journey.steps.find((s: any) => s.stepOrder === currentStep.stepOrder + 1)
    }

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
      // Journey completed — no more steps
      await prisma.journeyEnrollment.update({
        where: { id: enrollmentId },
        data: { status: "completed", completedAt: new Date(), currentStepId: null, exitReason: "completed" },
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
