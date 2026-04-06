import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Find all organizations
  const orgs = await prisma.organization.findMany({ select: { id: true } })

  for (const org of orgs) {
    // Check if agents already exist
    const existing = await prisma.aiAgentConfig.count({ where: { organizationId: org.id } })
    if (existing > 0) {
      console.log(`Org ${org.id} already has ${existing} agents, skipping`)
      continue
    }

    const agents = [
      {
        organizationId: org.id,
        configName: "Sales Agent",
        agentType: "sales",
        model: "claude-sonnet-4-20250514",
        systemPrompt: "You are a sales specialist. Help with deals, pricing, proposals, and customer acquisition.",
        toolsEnabled: ["create_deal", "update_deal_stage", "log_activity", "add_note", "send_email", "create_task"],
        isActive: true,
        priority: 10,
        intents: ["sales_inquiry"],
        maxToolRounds: 5,
      },
      {
        organizationId: org.id,
        configName: "Support Agent",
        agentType: "support",
        model: "claude-haiku-4-5-20251001",
        systemPrompt: "You are a support specialist. Help resolve customer issues, manage tickets, and ensure satisfaction.",
        toolsEnabled: ["create_ticket", "add_note", "log_activity", "create_task"],
        isActive: true,
        priority: 10,
        intents: ["support_request", "billing_question"],
        maxToolRounds: 5,
      },
      {
        organizationId: org.id,
        configName: "Marketing Agent",
        agentType: "marketing",
        model: "claude-haiku-4-5-20251001",
        systemPrompt: "You are a marketing specialist. Help with campaigns, analytics, and lead generation strategies.",
        toolsEnabled: ["log_activity", "add_note", "create_task"],
        isActive: true,
        priority: 5,
        intents: ["marketing_info"],
        maxToolRounds: 3,
      },
      {
        organizationId: org.id,
        configName: "Da Vinci",
        agentType: "general",
        model: "claude-sonnet-4-20250514",
        systemPrompt: "You are Da Vinci, a general-purpose CRM assistant. Help with any CRM-related questions and tasks.",
        toolsEnabled: ["add_note", "log_activity", "create_task"],
        isActive: true,
        priority: 0,
        intents: ["general", "data_analysis"],
        maxToolRounds: 5,
      },
    ]

    for (const agent of agents) {
      await prisma.aiAgentConfig.create({ data: agent })
    }
    console.log(`Created 4 default agents for org ${org.id}`)
  }
}

main()
  .then(() => { console.log("Done"); process.exit(0) })
  .catch(e => { console.error(e); process.exit(1) })
