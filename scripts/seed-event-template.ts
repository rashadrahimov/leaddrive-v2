/**
 * Seed script: Create event invitation email template
 * Run: npx tsx scripts/seed-event-template.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ORG_ID = "cmmxg74k10000td3rr37dl6am"

const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 50%,#EC4899 100%);padding:40px 40px 30px;text-align:center;">
              <div style="font-size:14px;color:rgba(255,255,255,0.8);letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">You're Invited</div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.3;">{{event_name}}</h1>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding:30px 40px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:40px;vertical-align:top;">
                          <div style="width:36px;height:36px;background:#EEF2FF;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📅</div>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Date & Time</div>
                          <div style="font-size:15px;color:#1F2937;font-weight:600;margin-top:2px;">{{event_date}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:40px;vertical-align:top;">
                          <div style="width:36px;height:36px;background:#F0FDF4;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📍</div>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Location</div>
                          <div style="font-size:15px;color:#1F2937;font-weight:600;margin-top:2px;">{{event_location}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:40px;vertical-align:top;">
                          <div style="width:36px;height:36px;background:#FEF3C7;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">👤</div>
                        </td>
                        <td style="padding-left:12px;">
                          <div style="font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">Your Role</div>
                          <div style="font-size:15px;color:#1F2937;font-weight:600;margin-top:2px;">{{participant_role}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding:0 40px 20px;">
              <div style="background:#F9FAFB;border-radius:12px;padding:20px;">
                <p style="margin:0;font-size:14px;color:#4B5563;line-height:1.6;">{{event_description}}</p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding:10px 40px 30px;text-align:center;">
              <a href="{{confirm_url}}" style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.5px;">
                Confirm Attendance
              </a>
              <p style="margin:12px 0 0;font-size:12px;color:#9CA3AF;">Or copy this link: {{confirm_url}}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:24px 40px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:13px;color:#6B7280;">
                Sent by <strong>{{company_name}}</strong> via LeadDrive CRM
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#9CA3AF;">
                {{client_name}}, you received this because you were invited to this event.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

async function main() {
  console.log("Creating event invitation email template...")

  const existing = await prisma.emailTemplate.findFirst({
    where: { organizationId: ORG_ID, name: "Event Invitation" },
  })

  if (existing) {
    await prisma.emailTemplate.update({
      where: { id: existing.id },
      data: { htmlBody, subject: "You're Invited: {{event_name}}" },
    })
    console.log("Updated existing template:", existing.id)
  } else {
    const template = await prisma.emailTemplate.create({
      data: {
        organizationId: ORG_ID,
        name: "Event Invitation",
        subject: "You're Invited: {{event_name}}",
        htmlBody,
        textBody: "You're invited to {{event_name}}!\n\nDate: {{event_date}}\nLocation: {{event_location}}\n\n{{event_description}}\n\nConfirm: {{confirm_url}}",
        variables: ["event_name", "event_date", "event_location", "event_description", "participant_role", "confirm_url", "client_name", "company_name"],
        category: "event",
        language: "en",
        isActive: true,
      },
    })
    console.log("Created template:", template.id, template.name)
  }

  console.log("Done!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
