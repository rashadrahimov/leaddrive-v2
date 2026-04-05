export interface LibraryTemplate {
  id: string
  name: string
  category: string
  description: string
  designJson: any
}

// Pre-built Unlayer design templates
export const EMAIL_TEMPLATE_LIBRARY: LibraryTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    category: "welcome",
    description: "Onboarding welcome email with CTA button",
    designJson: {
      counters: { u_column: 2, u_row: 3, u_content_text: 3, u_content_button: 1, u_content_divider: 1 },
      body: {
        id: "welcome-body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [{
              id: "col-1",
              contents: [{
                id: "text-1",
                type: "text",
                values: {
                  text: "<h1 style='text-align:center'>Welcome, {{client_name}}!</h1><p style='text-align:center'>We're excited to have {{company}} on board. Let's get you started.</p>",
                },
              }],
            }],
          },
          {
            id: "row-2",
            cells: [1],
            columns: [{
              id: "col-2",
              contents: [{
                id: "btn-1",
                type: "button",
                values: {
                  text: "Get Started",
                  href: { name: "web", values: { href: "#" } },
                  buttonColors: { color: "#ffffff", backgroundColor: "#3b82f6" },
                  size: { autoWidth: false, width: "50%" },
                  textAlign: "center",
                  lineHeight: "200%",
                  padding: "10px 20px",
                },
              }],
            }],
          },
        ],
        values: {
          backgroundColor: "#f8fafc",
          contentWidth: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
        },
      },
    },
  },
  {
    id: "newsletter",
    name: "Monthly Newsletter",
    category: "marketing",
    description: "Newsletter layout with header and content sections",
    designJson: {
      counters: { u_column: 3, u_row: 4, u_content_text: 4, u_content_divider: 2, u_content_image: 1 },
      body: {
        id: "newsletter-body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [{
              id: "col-1",
              contents: [{
                id: "text-1",
                type: "text",
                values: {
                  text: "<h1 style='text-align:center;color:#1e40af'>{{company}} Newsletter</h1><p style='text-align:center;color:#64748b'>{{month}} {{year}}</p>",
                },
              }],
            }],
          },
          {
            id: "row-2",
            cells: [1],
            columns: [{
              id: "col-2",
              contents: [{
                id: "divider-1",
                type: "divider",
                values: { width: "100%", border: { borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "#e2e8f0" } },
              }],
            }],
          },
          {
            id: "row-3",
            cells: [1],
            columns: [{
              id: "col-3",
              contents: [{
                id: "text-3",
                type: "text",
                values: {
                  text: "<h2>What's New</h2><p>Share your latest updates, product improvements, and company news here.</p><h2>Tips & Resources</h2><p>Helpful resources and best practices for your clients.</p>",
                },
              }],
            }],
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          contentWidth: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
        },
      },
    },
  },
  {
    id: "follow-up",
    name: "Sales Follow-up",
    category: "follow_up",
    description: "Clean follow-up email for sales outreach",
    designJson: {
      counters: { u_column: 1, u_row: 2, u_content_text: 2 },
      body: {
        id: "followup-body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [{
              id: "col-1",
              contents: [{
                id: "text-1",
                type: "text",
                values: {
                  text: "<p>Hi {{client_name}},</p><p>I wanted to follow up on our recent conversation about {{service}}. I'd love to discuss how we can help {{company}} achieve its goals.</p><p>Would you be available for a quick call this week?</p><p>Best regards</p>",
                },
              }],
            }],
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          contentWidth: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
        },
      },
    },
  },
  {
    id: "proposal",
    name: "Proposal / Offer",
    category: "proposal",
    description: "Professional proposal email with pricing section",
    designJson: {
      counters: { u_column: 2, u_row: 4, u_content_text: 4, u_content_button: 1, u_content_divider: 1 },
      body: {
        id: "proposal-body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [{
              id: "col-1",
              contents: [{
                id: "text-1",
                type: "text",
                values: {
                  text: "<h1 style='color:#1e40af'>Proposal for {{company}}</h1><p style='color:#64748b'>Prepared on {{date}}</p>",
                },
              }],
            }],
          },
          {
            id: "row-2",
            cells: [1],
            columns: [{
              id: "col-2",
              contents: [{
                id: "text-2",
                type: "text",
                values: {
                  text: "<p>Dear {{client_name}},</p><p>Thank you for considering our {{service}} solution. Below you'll find our proposal tailored to your needs.</p><h3>Scope of Work</h3><p>Describe the deliverables, timeline, and pricing here.</p>",
                },
              }],
            }],
          },
          {
            id: "row-3",
            cells: [1],
            columns: [{
              id: "col-3",
              contents: [{
                id: "btn-1",
                type: "button",
                values: {
                  text: "Accept Proposal",
                  href: { name: "web", values: { href: "#" } },
                  buttonColors: { color: "#ffffff", backgroundColor: "#16a34a" },
                  size: { autoWidth: false, width: "50%" },
                  textAlign: "center",
                  lineHeight: "200%",
                  padding: "10px 20px",
                },
              }],
            }],
          },
        ],
        values: {
          backgroundColor: "#f8fafc",
          contentWidth: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
        },
      },
    },
  },
  {
    id: "ticket-resolved",
    name: "Ticket Resolved",
    category: "notification",
    description: "Support ticket resolution notification",
    designJson: {
      counters: { u_column: 1, u_row: 3, u_content_text: 3, u_content_button: 1 },
      body: {
        id: "resolved-body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [{
              id: "col-1",
              contents: [{
                id: "text-1",
                type: "text",
                values: {
                  text: "<div style='text-align:center;padding:20px'><h1 style='color:#16a34a'>Ticket Resolved</h1><p style='color:#64748b'>Your support request has been addressed</p></div>",
                },
              }],
            }],
          },
          {
            id: "row-2",
            cells: [1],
            columns: [{
              id: "col-2",
              contents: [{
                id: "text-2",
                type: "text",
                values: {
                  text: "<p>Hi {{client_name}},</p><p>We're happy to let you know that your support ticket has been resolved. If you have any further questions, don't hesitate to reach out.</p>",
                },
              }],
            }],
          },
          {
            id: "row-3",
            cells: [1],
            columns: [{
              id: "col-3",
              contents: [{
                id: "btn-1",
                type: "button",
                values: {
                  text: "Rate Your Experience",
                  href: { name: "web", values: { href: "#" } },
                  buttonColors: { color: "#ffffff", backgroundColor: "#3b82f6" },
                  size: { autoWidth: false, width: "50%" },
                  textAlign: "center",
                  lineHeight: "200%",
                  padding: "10px 20px",
                },
              }],
            }],
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          contentWidth: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
        },
      },
    },
  },
  {
    id: "meeting-confirmation",
    name: "Meeting Confirmation",
    category: "notification",
    description: "Meeting date/time confirmation email",
    designJson: {
      counters: { u_column: 1, u_row: 2, u_content_text: 2 },
      body: {
        id: "meeting-body",
        rows: [
          {
            id: "row-1",
            cells: [1],
            columns: [{
              id: "col-1",
              contents: [{
                id: "text-1",
                type: "text",
                values: {
                  text: "<h1 style='text-align:center'>Meeting Confirmed</h1><p style='text-align:center;color:#64748b'>{{date}}</p>",
                },
              }],
            }],
          },
          {
            id: "row-2",
            cells: [1],
            columns: [{
              id: "col-2",
              contents: [{
                id: "text-2",
                type: "text",
                values: {
                  text: "<p>Hi {{client_name}},</p><p>This is to confirm our upcoming meeting. We look forward to discussing {{service}} with the {{company}} team.</p><p>Please feel free to reach out if you need to reschedule.</p>",
                },
              }],
            }],
          },
        ],
        values: {
          backgroundColor: "#ffffff",
          contentWidth: "600px",
          fontFamily: { label: "Arial", value: "arial,helvetica,sans-serif" },
        },
      },
    },
  },
]
