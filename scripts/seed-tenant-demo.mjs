// Seed demo data into a specific tenant
// Usage: node scripts/seed-tenant-demo.mjs --slug=zeytunpharm
//        node scripts/seed-tenant-demo.mjs --slug=zeytunpharm --password=Demo1234!

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function getArg(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`))
  return arg ? arg.split("=").slice(1).join("=") : null
}

async function main() {
  const slug = getArg("slug")
  if (!slug) {
    console.error("Usage: node scripts/seed-tenant-demo.mjs --slug=<tenant-slug>")
    process.exit(1)
  }

  const password = getArg("password") || "Demo2026!"

  // Find tenant
  const org = await prisma.organization.findUnique({ where: { slug } })
  if (!org) {
    console.error(`Tenant "${slug}" not found!`)
    process.exit(1)
  }

  const orgId = org.id
  console.log(`\nTenant: ${org.name} (${slug})`)
  console.log(`Plan: ${org.plan}`)
  console.log("─".repeat(50))

  // ─── Admin User ───
  let user = await prisma.user.findFirst({ where: { organizationId: orgId, role: "admin" } })
  if (!user) {
    const hash = await bcrypt.hash(password, 12)
    user = await prisma.user.create({
      data: {
        organizationId: orgId,
        email: `admin@${slug}.com`,
        name: "Demo Admin",
        passwordHash: hash,
        role: "admin",
        isActive: true,
      },
    })
    console.log(`Created admin user: ${user.email} / ${password}`)
  } else {
    // Update password for existing admin
    const hash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
    console.log(`Admin user: ${user.email} (password updated to: ${password})`)
  }

  // Create additional team members
  const teamMembers = [
    { name: "Sarah Johnson", email: `sarah@${slug}.com`, role: "manager" },
    { name: "Alex Chen", email: `alex@${slug}.com`, role: "member" },
    { name: "Maria Lopez", email: `maria@${slug}.com`, role: "member" },
  ]

  for (const tm of teamMembers) {
    const existing = await prisma.user.findFirst({ where: { organizationId: orgId, email: tm.email } })
    if (!existing) {
      const hash = await bcrypt.hash(password, 12)
      await prisma.user.create({
        data: { ...tm, organizationId: orgId, passwordHash: hash, isActive: true },
      })
    }
  }
  console.log(`Team members: ${teamMembers.length}`)

  // ─── Pipeline + Stages ───
  let pipeline = await prisma.pipeline.findFirst({ where: { organizationId: orgId, isDefault: true } })
  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: { organizationId: orgId, name: "Sales Pipeline", isDefault: true, sortOrder: 0 },
    })
    console.log("Pipeline: created")
  } else {
    console.log(`Pipeline: ${pipeline.name} (existing)`)
  }

  let stages = await prisma.pipelineStage.findMany({
    where: { organizationId: orgId, pipelineId: pipeline.id },
    orderBy: { sortOrder: "asc" },
  })
  if (stages.length === 0) {
    // Check if stages exist without pipelineId (legacy provisioning) and fix them
    const orphanStages = await prisma.pipelineStage.findMany({
      where: { organizationId: orgId, pipelineId: null },
    })
    if (orphanStages.length > 0) {
      for (const s of orphanStages) {
        await prisma.pipelineStage.update({ where: { id: s.id }, data: { pipelineId: pipeline.id } })
      }
      stages = await prisma.pipelineStage.findMany({
        where: { organizationId: orgId, pipelineId: pipeline.id },
        orderBy: { sortOrder: "asc" },
      })
      console.log(`Pipeline stages: ${stages.length} (fixed orphans → linked to pipeline)`)
    } else {
      const stageData = [
        { name: "LEAD", displayName: "New Lead", color: "#6366f1", probability: 10, sortOrder: 0 },
        { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 1 },
        { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 2 },
        { name: "NEGOTIATION", displayName: "Negotiation", color: "#8b5cf6", probability: 75, sortOrder: 3 },
        { name: "WON", displayName: "Won", color: "#10b981", probability: 100, sortOrder: 4, isWon: true },
        { name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 5, isLost: true },
      ]
      for (const s of stageData) {
        await prisma.pipelineStage.create({ data: { ...s, organizationId: orgId, pipelineId: pipeline.id } })
      }
      stages = await prisma.pipelineStage.findMany({
        where: { organizationId: orgId, pipelineId: pipeline.id },
        orderBy: { sortOrder: "asc" },
      })
      console.log(`Pipeline stages: ${stages.length} (created)`)
    }
  } else {
    console.log(`Pipeline stages: ${stages.length} (existing)`)
  }

  // ─── Companies ───
  const companies = [
    { name: "Pfizer Inc.", industry: "Pharmaceuticals", website: "pfizer.com", phone: "+1 212-733-2323", email: "contact@pfizer.com", city: "New York", country: "USA", employeeCount: 79000, annualRevenue: 58000000, status: "active", category: "client" },
    { name: "Roche Holding AG", industry: "Pharmaceuticals", website: "roche.com", phone: "+41 61 688 1111", email: "info@roche.com", city: "Basel", country: "Switzerland", employeeCount: 101000, annualRevenue: 65000000, status: "active", category: "client" },
    { name: "Novartis AG", industry: "Pharmaceuticals", website: "novartis.com", phone: "+41 61 324 1111", email: "info@novartis.com", city: "Basel", country: "Switzerland", employeeCount: 108000, annualRevenue: 51000000, status: "active", category: "client" },
    { name: "AstraZeneca PLC", industry: "Biotechnology", website: "astrazeneca.com", phone: "+44 20 3749 5000", email: "info@astrazeneca.com", city: "Cambridge", country: "UK", employeeCount: 83000, annualRevenue: 45000000, status: "active", category: "prospect" },
    { name: "Merck & Co.", industry: "Pharmaceuticals", website: "merck.com", phone: "+1 908-740-4000", email: "contact@merck.com", city: "Rahway", country: "USA", employeeCount: 69000, annualRevenue: 60000000, status: "active", category: "client" },
    { name: "BioGenesis Labs", industry: "Biotechnology", website: "biogenesislabs.com", phone: "+49 30 555 1234", email: "info@biogenesislabs.com", city: "Berlin", country: "Germany", employeeCount: 450, annualRevenue: 12000000, status: "active", category: "client" },
    { name: "MedTech Solutions", industry: "Medical Devices", website: "medtechsol.com", phone: "+44 20 7946 0958", email: "sales@medtechsol.com", city: "London", country: "UK", employeeCount: 320, annualRevenue: 8500000, status: "active", category: "prospect" },
    { name: "PharmaCare Distribution", industry: "Distribution", website: "pharmacare-dist.eu", phone: "+48 22 123 4567", email: "info@pharmacare-dist.eu", city: "Warsaw", country: "Poland", employeeCount: 180, annualRevenue: 25000000, status: "active", category: "partner" },
    { name: "NeuroPharma Inc.", industry: "Neuroscience", website: "neuropharma.com", phone: "+1 617-555-0199", email: "research@neuropharma.com", city: "Boston", country: "USA", employeeCount: 600, annualRevenue: 15000000, status: "active", category: "client" },
    { name: "GreenBio Therapeutics", industry: "Biotechnology", website: "greenbio.co", phone: "+46 8 123 4567", email: "hello@greenbio.co", city: "Stockholm", country: "Sweden", employeeCount: 95, annualRevenue: 3200000, status: "active", category: "prospect" },
    { name: "Apex Clinical Research", industry: "Clinical Trials", website: "apexclinical.com", phone: "+1 415-555-0177", email: "trials@apexclinical.com", city: "San Francisco", country: "USA", employeeCount: 250, annualRevenue: 18000000, status: "active", category: "client" },
    { name: "EuroMed Supplies", industry: "Medical Supplies", website: "euromed-supplies.de", phone: "+49 89 555 7890", email: "orders@euromed-supplies.de", city: "Munich", country: "Germany", employeeCount: 140, annualRevenue: 9500000, status: "active", category: "partner" },
  ]

  const createdCompanies = []
  for (const c of companies) {
    const existing = await prisma.company.findFirst({ where: { organizationId: orgId, name: c.name } })
    if (existing) {
      createdCompanies.push(existing)
    } else {
      const created = await prisma.company.create({ data: { ...c, organizationId: orgId } })
      createdCompanies.push(created)
    }
  }
  console.log(`Companies: ${createdCompanies.length}`)

  // ─── Contacts ───
  const contacts = [
    { fullName: "Dr. James Mitchell", email: "j.mitchell@pfizer.com", phone: "+1 212-733-2400", position: "VP of IT", department: "Information Technology", companyIdx: 0, engagementScore: 92 },
    { fullName: "Sophie Dubois", email: "s.dubois@roche.com", phone: "+41 61 688 2200", position: "Chief Digital Officer", department: "Digital", companyIdx: 1, engagementScore: 88 },
    { fullName: "Marco Bernasconi", email: "m.bernasconi@novartis.com", phone: "+41 61 324 3300", position: "Head of Procurement", department: "Procurement", companyIdx: 2, engagementScore: 75 },
    { fullName: "Emily Watson", email: "e.watson@astrazeneca.com", phone: "+44 20 3749 5100", position: "IT Director", department: "IT", companyIdx: 3, engagementScore: 68 },
    { fullName: "Robert Kim", email: "r.kim@merck.com", phone: "+1 908-740-4100", position: "CTO", department: "Technology", companyIdx: 4, engagementScore: 85 },
    { fullName: "Dr. Anna Schneider", email: "a.schneider@biogenesislabs.com", phone: "+49 30 555 1300", position: "CEO", department: "Executive", companyIdx: 5, engagementScore: 95 },
    { fullName: "Thomas Clarke", email: "t.clarke@medtechsol.com", phone: "+44 20 7946 1100", position: "Sales Director", department: "Sales", companyIdx: 6, engagementScore: 62 },
    { fullName: "Katarzyna Nowak", email: "k.nowak@pharmacare-dist.eu", phone: "+48 22 123 4600", position: "Operations Manager", department: "Operations", companyIdx: 7, engagementScore: 80 },
    { fullName: "Dr. Michael Torres", email: "m.torres@neuropharma.com", phone: "+1 617-555-0200", position: "VP Research", department: "R&D", companyIdx: 8, engagementScore: 78 },
    { fullName: "Erik Lindberg", email: "e.lindberg@greenbio.co", phone: "+46 8 123 4600", position: "Co-founder & CTO", department: "Technology", companyIdx: 9, engagementScore: 58 },
    { fullName: "Jennifer Park", email: "j.park@apexclinical.com", phone: "+1 415-555-0200", position: "Director of Partnerships", department: "Business Dev", companyIdx: 10, engagementScore: 82 },
    { fullName: "Hans Muller", email: "h.muller@euromed-supplies.de", phone: "+49 89 555 7900", position: "Managing Director", department: "Management", companyIdx: 11, engagementScore: 73 },
    { fullName: "Lisa Chen", email: "l.chen@pfizer.com", phone: "+1 212-733-2500", position: "Project Manager", department: "PMO", companyIdx: 0, engagementScore: 70 },
    { fullName: "David Fontaine", email: "d.fontaine@roche.com", phone: "+41 61 688 3300", position: "Lab Systems Manager", department: "Lab Ops", companyIdx: 1, engagementScore: 65 },
    { fullName: "Rachel Adams", email: "r.adams@merck.com", phone: "+1 908-740-4200", position: "Compliance Officer", department: "Compliance", companyIdx: 4, engagementScore: 55 },
  ]

  const createdContacts = []
  for (const c of contacts) {
    const existing = await prisma.contact.findFirst({ where: { organizationId: orgId, email: c.email } })
    if (existing) {
      createdContacts.push(existing)
    } else {
      const { companyIdx, ...rest } = c
      const created = await prisma.contact.create({
        data: { ...rest, organizationId: orgId, companyId: createdCompanies[companyIdx].id, isActive: true, tags: [] },
      })
      createdContacts.push(created)
    }
  }
  console.log(`Contacts: ${createdContacts.length}`)

  // ─── Deals ───
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const deals = [
    { name: "Pfizer CRM Integration", companyIdx: 0, contactIdx: 0, stage: "NEGOTIATION", valueAmount: 285000, probability: 75, currency: "USD" },
    { name: "Roche Digital Transformation", companyIdx: 1, contactIdx: 1, stage: "PROPOSAL", valueAmount: 520000, probability: 50, currency: "EUR" },
    { name: "Novartis Procurement Platform", companyIdx: 2, contactIdx: 2, stage: "WON", valueAmount: 195000, probability: 100, currency: "EUR" },
    { name: "AstraZeneca Data Analytics", companyIdx: 3, contactIdx: 3, stage: "LEAD", valueAmount: 150000, probability: 15, currency: "GBP" },
    { name: "Merck Lab Management System", companyIdx: 4, contactIdx: 4, stage: "WON", valueAmount: 410000, probability: 100, currency: "USD" },
    { name: "BioGenesis LIMS Upgrade", companyIdx: 5, contactIdx: 5, stage: "NEGOTIATION", valueAmount: 89000, probability: 80, currency: "EUR" },
    { name: "MedTech Inventory Solution", companyIdx: 6, contactIdx: 6, stage: "QUALIFIED", valueAmount: 67000, probability: 25, currency: "GBP" },
    { name: "PharmaCare WMS Integration", companyIdx: 7, contactIdx: 7, stage: "PROPOSAL", valueAmount: 135000, probability: 50, currency: "PLN" },
    { name: "NeuroPharma Trial Tracker", companyIdx: 8, contactIdx: 8, stage: "PROPOSAL", valueAmount: 175000, probability: 45, currency: "USD" },
    { name: "GreenBio ERP Setup", companyIdx: 9, contactIdx: 9, stage: "LEAD", valueAmount: 42000, probability: 10, currency: "SEK" },
    { name: "Apex Clinical Portal", companyIdx: 10, contactIdx: 10, stage: "NEGOTIATION", valueAmount: 230000, probability: 70, currency: "USD" },
    { name: "EuroMed Supply Chain", companyIdx: 11, contactIdx: 11, stage: "WON", valueAmount: 98000, probability: 100, currency: "EUR" },
  ]

  for (const d of deals) {
    const existing = await prisma.deal.findFirst({ where: { organizationId: orgId, name: d.name } })
    if (!existing) {
      await prisma.deal.create({
        data: {
          organizationId: orgId,
          pipelineId: pipeline.id,
          name: d.name,
          companyId: createdCompanies[d.companyIdx].id,
          contactId: createdContacts[d.contactIdx].id,
          stage: d.stage,
          valueAmount: d.valueAmount,
          probability: d.probability,
          currency: d.currency,
          assignedTo: user.id,
          expectedClose: new Date(now + (15 + Math.random() * 75) * DAY),
          tags: [],
        },
      })
    }
  }
  console.log(`Deals: ${deals.length}`)

  // ─── Leads ───
  const leads = [
    { contactName: "Dr. Sarah Miller", companyName: "VaxTech Innovations", email: "s.miller@vaxtech.io", phone: "+1 858-555-0123", source: "website", status: "new", priority: "high", score: 88, estimatedValue: 120000 },
    { contactName: "Pierre Lefevre", companyName: "Lyon Biotech SAS", email: "p.lefevre@lyonbiotech.fr", phone: "+33 4 72 55 1234", source: "referral", status: "contacted", priority: "high", score: 82, estimatedValue: 95000 },
    { contactName: "Yuki Tanaka", companyName: "OsakaMed Corp", email: "y.tanaka@osakamed.jp", phone: "+81 6 6555 0123", source: "exhibition", status: "qualified", priority: "medium", score: 75, estimatedValue: 180000 },
    { contactName: "Carlos Mendez", companyName: "LatAm Pharma Group", email: "c.mendez@latampharma.com", phone: "+52 55 5555 0123", source: "linkedin", status: "new", priority: "medium", score: 68, estimatedValue: 65000 },
    { contactName: "Aisha Patel", companyName: "Mumbai Medical Tech", email: "a.patel@mumbaimedtech.in", phone: "+91 22 5555 0123", source: "webinar", status: "contacted", priority: "high", score: 91, estimatedValue: 145000 },
    { contactName: "Jan Kowalski", companyName: "PolPharma Digital", email: "j.kowalski@polpharma-dig.pl", phone: "+48 58 555 0123", source: "cold_call", status: "new", priority: "low", score: 45, estimatedValue: 35000 },
    { contactName: "Maria Rossi", companyName: "Torino Life Sciences", email: "m.rossi@torinolife.it", phone: "+39 011 555 0123", source: "partner", status: "qualified", priority: "high", score: 85, estimatedValue: 110000 },
    { contactName: "Brian O'Sullivan", companyName: "Dublin Diagnostics", email: "b.osullivan@dublindiag.ie", phone: "+353 1 555 0123", source: "website", status: "contacted", priority: "medium", score: 72, estimatedValue: 78000 },
  ]

  for (const l of leads) {
    const existing = await prisma.lead.findFirst({ where: { organizationId: orgId, email: l.email } })
    if (!existing) {
      await prisma.lead.create({ data: { ...l, organizationId: orgId, assignedTo: user.id } })
    }
  }
  console.log(`Leads: ${leads.length}`)

  // ─── Tasks ───
  const tasks = [
    { title: "Prepare Pfizer Q2 proposal deck", status: "in_progress", priority: "high", dueDate: new Date(now + 3 * DAY) },
    { title: "Schedule Roche demo call", status: "pending", priority: "high", dueDate: new Date(now + 5 * DAY) },
    { title: "Send Novartis contract for signing", status: "completed", priority: "high", dueDate: new Date(now - 2 * DAY) },
    { title: "Review AstraZeneca requirements doc", status: "pending", priority: "medium", dueDate: new Date(now + 7 * DAY) },
    { title: "Follow up with Merck on Phase 2", status: "in_progress", priority: "high", dueDate: new Date(now + 1 * DAY) },
    { title: "BioGenesis onboarding kickoff", status: "pending", priority: "medium", dueDate: new Date(now + 10 * DAY) },
    { title: "Update MedTech pricing model", status: "in_progress", priority: "medium", dueDate: new Date(now + 4 * DAY) },
    { title: "PharmaCare integration testing", status: "pending", priority: "low", dueDate: new Date(now + 14 * DAY) },
    { title: "NeuroPharma security audit review", status: "completed", priority: "high", dueDate: new Date(now - 5 * DAY) },
    { title: "Prepare monthly sales report", status: "pending", priority: "medium", dueDate: new Date(now + 2 * DAY) },
    { title: "GreenBio initial discovery call", status: "completed", priority: "low", dueDate: new Date(now - 3 * DAY) },
    { title: "Apex Clinical API documentation", status: "in_progress", priority: "medium", dueDate: new Date(now + 6 * DAY) },
  ]

  for (const t of tasks) {
    const existing = await prisma.task.findFirst({ where: { organizationId: orgId, title: t.title } })
    if (!existing) {
      await prisma.task.create({
        data: { ...t, organizationId: orgId, assignedTo: user.id, createdBy: user.id },
      })
    }
  }
  console.log(`Tasks: ${tasks.length}`)

  // ─── Tickets ───
  const tickets = [
    { ticketNumber: "TK-1001", subject: "Login issues after SSO migration", description: "Multiple users unable to authenticate after the recent SSO provider change. Error: SAML assertion invalid.", priority: "high", status: "in_progress", category: "technical", contactIdx: 0, companyIdx: 0 },
    { ticketNumber: "TK-1002", subject: "Dashboard loading slowly", description: "Analytics dashboard takes 15+ seconds to load with large datasets. Need query optimization.", priority: "medium", status: "new", category: "performance", contactIdx: 1, companyIdx: 1 },
    { ticketNumber: "TK-1003", subject: "Invoice PDF generation error", description: "PDF generation fails for invoices with more than 50 line items. Returns 500 error.", priority: "high", status: "new", category: "bug", contactIdx: 2, companyIdx: 2 },
    { ticketNumber: "TK-1004", subject: "Request: Custom report builder", description: "Need ability to create custom reports with drag-and-drop fields and scheduling.", priority: "low", status: "new", category: "feature_request", contactIdx: 4, companyIdx: 4 },
    { ticketNumber: "TK-1005", subject: "API rate limit exceeded", description: "Integration hitting 429 errors during batch sync. Need rate limit increase or better queuing.", priority: "medium", status: "in_progress", category: "integration", contactIdx: 5, companyIdx: 5 },
    { ticketNumber: "TK-1006", subject: "Mobile app calendar sync broken", description: "Calendar events not syncing to mobile. Last sync timestamp shows 3 days ago.", priority: "medium", status: "resolved", category: "bug", contactIdx: 7, companyIdx: 7 },
    { ticketNumber: "TK-1007", subject: "Data export compliance question", description: "Need confirmation that data export meets GDPR requirements for EU clinical trial data.", priority: "high", status: "new", category: "compliance", contactIdx: 8, companyIdx: 8 },
    { ticketNumber: "TK-1008", subject: "User role permissions not applying", description: "New 'Lab Technician' role not restricting access to financial modules as configured.", priority: "high", status: "in_progress", category: "bug", contactIdx: 10, companyIdx: 10 },
  ]

  for (const t of tickets) {
    const existing = await prisma.ticket.findFirst({ where: { organizationId: orgId, ticketNumber: t.ticketNumber } })
    if (!existing) {
      const { contactIdx, companyIdx, ...rest } = t
      await prisma.ticket.create({
        data: {
          ...rest,
          organizationId: orgId,
          contactId: createdContacts[contactIdx].id,
          companyId: createdCompanies[companyIdx].id,
          assignedTo: user.id,
          createdBy: user.id,
          tags: [],
          escalationLevel: 0,
        },
      })
    }
  }
  console.log(`Tickets: ${tickets.length}`)

  // ─── Campaigns ───
  const campaigns = [
    { name: "Q2 Product Launch — Clinical Suite", type: "email", status: "sent", subject: "Introducing Clinical Suite 3.0", totalRecipients: 2400, totalSent: 2350, totalOpened: 980, totalClicked: 312, budget: 5000, actualCost: 4200 },
    { name: "Pharma Innovation Webinar Series", type: "email", status: "running", subject: "Join our free webinar: AI in Drug Discovery", totalRecipients: 1850, totalSent: 1800, totalOpened: 720, totalClicked: 198, budget: 3000, actualCost: 2100 },
    { name: "Customer Success Stories", type: "email", status: "draft", subject: "How Merck saved 40% on lab management", totalRecipients: 0, totalSent: 0, totalOpened: 0, totalClicked: 0, budget: 1500, actualCost: 0 },
    { name: "Annual Conference Invite — BioConnect 2026", type: "email", status: "sent", subject: "You're invited to BioConnect 2026", totalRecipients: 3200, totalSent: 3150, totalOpened: 1450, totalClicked: 567, budget: 8000, actualCost: 7200 },
    { name: "Compliance Update Newsletter", type: "email", status: "sent", subject: "Important: New EU MDR compliance requirements", totalRecipients: 1600, totalSent: 1580, totalOpened: 890, totalClicked: 234, budget: 500, actualCost: 380 },
  ]

  for (const c of campaigns) {
    const existing = await prisma.campaign.findFirst({ where: { organizationId: orgId, name: c.name } })
    if (!existing) {
      await prisma.campaign.create({
        data: {
          ...c,
          organizationId: orgId,
          createdBy: user.id,
          sentAt: c.status === "sent" ? new Date(now - (5 + Math.random() * 25) * DAY) : undefined,
        },
      })
    }
  }
  console.log(`Campaigns: ${campaigns.length}`)

  // ─── Activities (recent timeline) ───
  const activities = [
    { type: "call", subject: "Discovery call with Pfizer IT team", description: "Discussed current pain points with existing CRM. Very interested in our pharma-specific features.", contactId: createdContacts[0].id, companyId: createdCompanies[0].id },
    { type: "email", subject: "Sent proposal to Roche", description: "Emailed digital transformation proposal with ROI analysis and timeline.", contactId: createdContacts[1].id, companyId: createdCompanies[1].id },
    { type: "meeting", subject: "Contract signing — Novartis", description: "Signed 2-year procurement platform contract. Implementation starts next month.", contactId: createdContacts[2].id, companyId: createdCompanies[2].id },
    { type: "note", subject: "AstraZeneca — initial research", description: "Reviewed their annual report. Strong digital transformation budget. Key decision maker is Emily Watson.", contactId: createdContacts[3].id, companyId: createdCompanies[3].id },
    { type: "call", subject: "Merck Phase 2 check-in", description: "Discussed lab module customization. They need GxP validation support.", contactId: createdContacts[4].id, companyId: createdCompanies[4].id },
    { type: "meeting", subject: "BioGenesis CEO meeting", description: "Dr. Schneider wants full demo for board next week. Very promising deal.", contactId: createdContacts[5].id, companyId: createdCompanies[5].id },
    { type: "email", subject: "Follow-up: MedTech pricing", description: "Sent revised pricing with volume discount for 50+ users.", contactId: createdContacts[6].id, companyId: createdCompanies[6].id },
    { type: "call", subject: "PharmaCare integration requirements", description: "Discussed WMS API integration. They use SAP for warehousing.", contactId: createdContacts[7].id, companyId: createdCompanies[7].id },
  ]

  for (const a of activities) {
    const existing = await prisma.activity.findFirst({ where: { organizationId: orgId, subject: a.subject } })
    if (!existing) {
      await prisma.activity.create({
        data: {
          ...a,
          organizationId: orgId,
          createdBy: user.id,
          createdAt: new Date(now - Math.random() * 14 * DAY),
        },
      })
    }
  }
  console.log(`Activities: ${activities.length}`)

  // ─── 1. Products ───
  try {
    const existingProduct = await prisma.product.findFirst({ where: { organizationId: orgId } })
    if (!existingProduct) {
      const products = [
        { name: "Clinical Suite Platform", description: "End-to-end clinical trial management platform with GxP compliance", category: "product", price: 45000, currency: "USD", features: ["GxP validation", "21 CFR Part 11", "Audit trail"], tags: ["clinical", "enterprise"] },
        { name: "LIMS Integration Module", description: "Laboratory Information Management System connector for major LIMS vendors", category: "addon", price: 12000, currency: "USD", features: ["API gateway", "Bi-directional sync", "HL7 support"], tags: ["integration", "lab"] },
        { name: "Pharma CRM License (Annual)", description: "Per-user annual license for pharma-specific CRM features", category: "service", price: 2400, currency: "USD", features: ["Contact management", "Compliance tracking", "Territory mapping"], tags: ["crm", "license"] },
        { name: "Data Analytics Dashboard", description: "Real-time analytics and reporting for clinical and commercial operations", category: "addon", price: 8500, currency: "USD", features: ["Custom dashboards", "Predictive analytics", "Export to PDF/Excel"], tags: ["analytics", "reporting"] },
        { name: "Regulatory Compliance Package", description: "Automated regulatory submission tracking and documentation management", category: "service", price: 18000, currency: "USD", features: ["FDA submissions", "EMA compliance", "Document versioning"], tags: ["regulatory", "compliance"] },
        { name: "Implementation & Training", description: "On-site implementation, data migration, and team training (per day)", category: "consulting", price: 3500, currency: "USD", features: ["On-site support", "Data migration", "Custom training"], tags: ["services", "onboarding"] },
        { name: "24/7 Premium Support", description: "Round-the-clock dedicated support with 1-hour SLA for critical issues", category: "service", price: 5000, currency: "USD", features: ["24/7 coverage", "1h SLA", "Dedicated engineer"], tags: ["support", "premium"] },
      ]
      for (const p of products) {
        await prisma.product.create({ data: { ...p, organizationId: orgId, isActive: true } })
      }
      console.log(`Products: ${products.length}`)
    } else {
      console.log("Products: (existing, skipped)")
    }
  } catch (e) { console.log(`Products: ERROR — ${e.message}`) }

  // ─── 2. Contracts ───
  try {
    const existingContract = await prisma.contract.findFirst({ where: { organizationId: orgId } })
    if (!existingContract) {
      const contracts = [
        { contractNumber: "CTR-2026-001", title: "Pfizer CRM Implementation Agreement", companyId: createdCompanies[0].id, contactId: createdContacts[0].id, type: "service_agreement", status: "active", startDate: new Date(now - 90 * DAY), endDate: new Date(now + 275 * DAY), valueAmount: 285000, currency: "USD" },
        { contractNumber: "CTR-2026-002", title: "Roche Digital Transformation MSA", companyId: createdCompanies[1].id, contactId: createdContacts[1].id, type: "service_agreement", status: "draft", startDate: new Date(now + 30 * DAY), endDate: new Date(now + 395 * DAY), valueAmount: 520000, currency: "EUR" },
        { contractNumber: "CTR-2025-018", title: "Novartis Procurement Platform License", companyId: createdCompanies[2].id, contactId: createdContacts[2].id, type: "service_agreement", status: "active", startDate: new Date(now - 180 * DAY), endDate: new Date(now + 185 * DAY), valueAmount: 195000, currency: "EUR" },
        { contractNumber: "CTR-2025-015", title: "Merck Lab Management — Phase 1", companyId: createdCompanies[4].id, contactId: createdContacts[4].id, type: "service_agreement", status: "active", startDate: new Date(now - 120 * DAY), endDate: new Date(now + 245 * DAY), valueAmount: 410000, currency: "USD" },
        { contractNumber: "CTR-2024-042", title: "EuroMed Supply Chain SLA", companyId: createdCompanies[11].id, contactId: createdContacts[11].id, type: "service_agreement", status: "expired", startDate: new Date(now - 400 * DAY), endDate: new Date(now - 35 * DAY), valueAmount: 98000, currency: "EUR" },
        { contractNumber: "CTR-2026-003", title: "BioGenesis LIMS Upgrade Contract", companyId: createdCompanies[5].id, contactId: createdContacts[5].id, type: "service_agreement", status: "draft", startDate: new Date(now + 14 * DAY), endDate: new Date(now + 194 * DAY), valueAmount: 89000, currency: "EUR" },
      ]
      for (const c of contracts) {
        await prisma.contract.create({ data: { ...c, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Contracts: ${contracts.length}`)
    } else {
      console.log("Contracts: (existing, skipped)")
    }
  } catch (e) { console.log(`Contracts: ERROR — ${e.message}`) }

  // ─── 3. Offers + OfferItems ───
  try {
    const existingOffer = await prisma.offer.findFirst({ where: { organizationId: orgId } })
    if (!existingOffer) {
      const offersData = [
        { offerNumber: "OFF-2026-001", title: "Pfizer CRM Integration — Commercial Offer", companyId: createdCompanies[0].id, contactId: createdContacts[0].id, type: "commercial", status: "sent", totalAmount: 285000, currency: "USD", validUntil: new Date(now + 30 * DAY), items: [
          { name: "Clinical Suite Platform License", quantity: 1, unitPrice: 45000, total: 45000 },
          { name: "Implementation & Customization (60 days)", quantity: 60, unitPrice: 3500, total: 210000 },
          { name: "First Year Premium Support", quantity: 1, unitPrice: 30000, total: 30000 },
        ]},
        { offerNumber: "OFF-2026-002", title: "Roche Digital Transformation Proposal", companyId: createdCompanies[1].id, contactId: createdContacts[1].id, type: "commercial", status: "draft", totalAmount: 520000, currency: "EUR", validUntil: new Date(now + 45 * DAY), items: [
          { name: "Platform License (Enterprise)", quantity: 1, unitPrice: 120000, total: 120000 },
          { name: "Data Migration & Integration", quantity: 1, unitPrice: 180000, total: 180000 },
          { name: "Custom Module Development", quantity: 1, unitPrice: 220000, total: 220000 },
        ]},
        { offerNumber: "OFF-2026-003", title: "MedTech Inventory Solution Quote", companyId: createdCompanies[6].id, contactId: createdContacts[6].id, type: "commercial", status: "sent", totalAmount: 67000, currency: "GBP", validUntil: new Date(now + 21 * DAY), items: [
          { name: "Inventory Management Module", quantity: 1, unitPrice: 35000, total: 35000 },
          { name: "Barcode/RFID Integration", quantity: 1, unitPrice: 22000, total: 22000 },
          { name: "Training (5 days)", quantity: 5, unitPrice: 2000, total: 10000 },
        ]},
        { offerNumber: "OFF-2026-004", title: "NeuroPharma Trial Tracker Offer", companyId: createdCompanies[8].id, contactId: createdContacts[8].id, type: "commercial", status: "approved", totalAmount: 175000, currency: "USD", validUntil: new Date(now + 60 * DAY), items: [
          { name: "Trial Tracker Platform", quantity: 1, unitPrice: 85000, total: 85000 },
          { name: "Regulatory Compliance Add-on", quantity: 1, unitPrice: 45000, total: 45000 },
          { name: "Implementation & Go-live Support", quantity: 1, unitPrice: 45000, total: 45000 },
        ]},
        { offerNumber: "OFF-2025-019", title: "Apex Clinical Portal — Renewal", companyId: createdCompanies[10].id, contactId: createdContacts[10].id, type: "commercial", status: "rejected", totalAmount: 280000, currency: "USD", validUntil: new Date(now - 15 * DAY), items: [
          { name: "Portal License Renewal (2 years)", quantity: 1, unitPrice: 180000, total: 180000 },
          { name: "Advanced Analytics Module", quantity: 1, unitPrice: 100000, total: 100000 },
        ]},
      ]
      for (const o of offersData) {
        const { items, ...offerData } = o
        const offer = await prisma.offer.create({ data: { ...offerData, organizationId: orgId, createdBy: user.id } })
        for (let i = 0; i < items.length; i++) {
          await prisma.offerItem.create({ data: { ...items[i], offerId: offer.id, sortOrder: i } })
        }
      }
      console.log(`Offers: ${offersData.length} (with items)`)
    } else {
      console.log("Offers: (existing, skipped)")
    }
  } catch (e) { console.log(`Offers: ERROR — ${e.message}`) }

  // ─── 4. Invoices + InvoiceItems ───
  try {
    const existingInvoice = await prisma.invoice.findFirst({ where: { organizationId: orgId } })
    if (!existingInvoice) {
      const invoicesData = [
        { invoiceNumber: "INV-2026-001", title: "Novartis — Q1 License Fee", companyId: createdCompanies[2].id, contactId: createdContacts[2].id, status: "paid", subtotal: 48750, taxRate: 0, taxAmount: 0, totalAmount: 48750, paidAmount: 48750, balanceDue: 0, currency: "EUR", issueDate: new Date(now - 60 * DAY), dueDate: new Date(now - 30 * DAY), paidAt: new Date(now - 28 * DAY), items: [
          { name: "Procurement Platform License — Q1 2026", quantity: 1, unitPrice: 48750, total: 48750 },
        ]},
        { invoiceNumber: "INV-2026-002", title: "Merck — Implementation Phase 1", companyId: createdCompanies[4].id, contactId: createdContacts[4].id, status: "paid", subtotal: 136000, taxRate: 0, taxAmount: 0, totalAmount: 136000, paidAmount: 136000, balanceDue: 0, currency: "USD", issueDate: new Date(now - 45 * DAY), dueDate: new Date(now - 15 * DAY), paidAt: new Date(now - 12 * DAY), items: [
          { name: "Lab Management System — Phase 1 Delivery", quantity: 1, unitPrice: 100000, total: 100000 },
          { name: "Data Migration Services", quantity: 1, unitPrice: 36000, total: 36000 },
        ]},
        { invoiceNumber: "INV-2026-003", title: "Pfizer — Discovery & Planning", companyId: createdCompanies[0].id, contactId: createdContacts[0].id, status: "sent", subtotal: 85000, taxRate: 0, taxAmount: 0, totalAmount: 85000, paidAmount: 0, balanceDue: 85000, currency: "USD", issueDate: new Date(now - 10 * DAY), dueDate: new Date(now + 20 * DAY), items: [
          { name: "CRM Integration — Discovery Phase", quantity: 1, unitPrice: 55000, total: 55000 },
          { name: "Architecture & Planning", quantity: 1, unitPrice: 30000, total: 30000 },
        ]},
        { invoiceNumber: "INV-2026-004", title: "EuroMed — Final Delivery", companyId: createdCompanies[11].id, contactId: createdContacts[11].id, status: "paid", subtotal: 32500, taxRate: 0, taxAmount: 0, totalAmount: 32500, paidAmount: 32500, balanceDue: 0, currency: "EUR", issueDate: new Date(now - 90 * DAY), dueDate: new Date(now - 60 * DAY), paidAt: new Date(now - 55 * DAY), items: [
          { name: "Supply Chain Module — Final Milestone", quantity: 1, unitPrice: 32500, total: 32500 },
        ]},
        { invoiceNumber: "INV-2026-005", title: "BioGenesis — LIMS Assessment", companyId: createdCompanies[5].id, contactId: createdContacts[5].id, status: "overdue", subtotal: 22000, taxRate: 0.19, taxAmount: 4180, totalAmount: 26180, paidAmount: 0, balanceDue: 26180, currency: "EUR", issueDate: new Date(now - 40 * DAY), dueDate: new Date(now - 10 * DAY), items: [
          { name: "LIMS Assessment & Gap Analysis", quantity: 1, unitPrice: 15000, total: 15000 },
          { name: "Technical Architecture Review", quantity: 1, unitPrice: 7000, total: 7000 },
        ]},
        { invoiceNumber: "INV-2026-006", title: "Apex Clinical — Portal Phase 1", companyId: createdCompanies[10].id, contactId: createdContacts[10].id, status: "sent", subtotal: 115000, taxRate: 0, taxAmount: 0, totalAmount: 115000, paidAmount: 0, balanceDue: 115000, currency: "USD", issueDate: new Date(now - 5 * DAY), dueDate: new Date(now + 25 * DAY), items: [
          { name: "Clinical Portal — Core Platform", quantity: 1, unitPrice: 75000, total: 75000 },
          { name: "Patient Data Integration", quantity: 1, unitPrice: 25000, total: 25000 },
          { name: "Compliance & Validation", quantity: 1, unitPrice: 15000, total: 15000 },
        ]},
        { invoiceNumber: "INV-2026-007", title: "PharmaCare — WMS Integration Deposit", companyId: createdCompanies[7].id, contactId: createdContacts[7].id, status: "draft", subtotal: 40500, taxRate: 0.23, taxAmount: 9315, totalAmount: 49815, paidAmount: 0, balanceDue: 49815, currency: "PLN", issueDate: new Date(now), dueDate: new Date(now + 30 * DAY), items: [
          { name: "WMS Integration — Phase 1 Deposit (30%)", quantity: 1, unitPrice: 40500, total: 40500 },
        ]},
      ]
      for (const inv of invoicesData) {
        const { items, ...invoiceData } = inv
        const invoice = await prisma.invoice.create({ data: { ...invoiceData, organizationId: orgId, createdBy: user.id } })
        for (let i = 0; i < items.length; i++) {
          await prisma.invoiceItem.create({ data: { ...items[i], invoiceId: invoice.id, sortOrder: i } })
        }
      }
      console.log(`Invoices: ${invoicesData.length} (with items)`)
    } else {
      console.log("Invoices: (existing, skipped)")
    }
  } catch (e) { console.log(`Invoices: ERROR — ${e.message}`) }

  // ─── 5. Bills ───
  try {
    const existingBill = await prisma.bill.findFirst({ where: { organizationId: orgId } })
    if (!existingBill) {
      const bills = [
        { billNumber: "BILL-2026-001", vendorName: "AWS", title: "Cloud Infrastructure — March 2026", status: "paid", totalAmount: 8450, paidAmount: 8450, balanceDue: 0, currency: "USD", issueDate: new Date(now - 30 * DAY), dueDate: new Date(now - 15 * DAY), paidAt: new Date(now - 14 * DAY), category: "software" },
        { billNumber: "BILL-2026-002", vendorName: "WeWork Warsaw", title: "Office Rent — April 2026", status: "pending", totalAmount: 4200, paidAmount: 0, balanceDue: 4200, currency: "EUR", issueDate: new Date(now - 5 * DAY), dueDate: new Date(now + 10 * DAY), category: "rent" },
        { billNumber: "BILL-2026-003", vendorName: "Figma Inc.", title: "Design Tool Licenses (Annual)", status: "paid", totalAmount: 1680, paidAmount: 1680, balanceDue: 0, currency: "USD", issueDate: new Date(now - 60 * DAY), dueDate: new Date(now - 45 * DAY), paidAt: new Date(now - 44 * DAY), category: "software" },
        { billNumber: "BILL-2026-004", vendorName: "Hetzner Online GmbH", title: "Dedicated Servers — Q2 2026", status: "overdue", totalAmount: 2890, paidAmount: 0, balanceDue: 2890, currency: "EUR", issueDate: new Date(now - 20 * DAY), dueDate: new Date(now - 5 * DAY), category: "equipment" },
      ]
      for (const b of bills) {
        await prisma.bill.create({ data: { ...b, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Bills: ${bills.length}`)
    } else {
      console.log("Bills: (existing, skipped)")
    }
  } catch (e) { console.log(`Bills: ERROR — ${e.message}`) }

  // ─── 6. BankAccounts ───
  try {
    const existingBank = await prisma.bankAccount.findFirst({ where: { organizationId: orgId } })
    if (!existingBank) {
      const bankAccounts = [
        { accountName: "Primary Operating Account", bankName: "PKO Bank Polski", accountNumber: "PL61109010140000071219812874", currency: "PLN", isDefault: true, isActive: true, swiftCode: "BPKOPLPW" },
        { accountName: "USD Revenue Account", bankName: "Citibank Europe", accountNumber: "PL27114020040000310276543210", currency: "USD", isDefault: false, isActive: true, swiftCode: "CABORUPW" },
      ]
      for (const ba of bankAccounts) {
        await prisma.bankAccount.create({ data: { ...ba, organizationId: orgId } })
      }
      console.log(`Bank Accounts: ${bankAccounts.length}`)
    } else {
      console.log("Bank Accounts: (existing, skipped)")
    }
  } catch (e) { console.log(`Bank Accounts: ERROR — ${e.message}`) }

  // ─── 7. Funds ───
  try {
    const existingFund = await prisma.fund.findFirst({ where: { organizationId: orgId } })
    if (!existingFund) {
      const funds = [
        { name: "Tax Reserve", description: "Quarterly tax obligations reserve fund", targetAmount: 50000, currentBalance: 32400, currency: "USD", color: "#ef4444", isActive: true },
        { name: "Payroll Buffer", description: "3-month payroll safety buffer", targetAmount: 120000, currentBalance: 98000, currency: "USD", color: "#3b82f6", isActive: true },
        { name: "R&D Investment Fund", description: "Product development and innovation fund", targetAmount: 80000, currentBalance: 15600, currency: "USD", color: "#10b981", isActive: true },
      ]
      for (const f of funds) {
        await prisma.fund.create({ data: { ...f, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Funds: ${funds.length}`)
    } else {
      console.log("Funds: (existing, skipped)")
    }
  } catch (e) { console.log(`Funds: ERROR — ${e.message}`) }

  // ─── 8. KB Categories + Articles ───
  try {
    const existingKb = await prisma.kbCategory.findFirst({ where: { organizationId: orgId } })
    if (!existingKb) {
      const categories = [
        { name: "Getting Started", sortOrder: 0 },
        { name: "Integrations & API", sortOrder: 1 },
        { name: "Troubleshooting", sortOrder: 2 },
      ]
      const createdCategories = []
      for (const cat of categories) {
        const created = await prisma.kbCategory.create({ data: { ...cat, organizationId: orgId } })
        createdCategories.push(created)
      }

      const articles = [
        { title: "Quick Start Guide", content: "# Quick Start Guide\n\nWelcome to the platform. Follow these steps to get started:\n\n1. Set up your organization profile\n2. Import your contacts\n3. Configure your sales pipeline\n4. Invite team members\n\n## Need Help?\nContact our support team or use the in-app chat.", categoryId: createdCategories[0].id, status: "published", viewCount: 342, helpfulCount: 89 },
        { title: "Setting Up Your First Pipeline", content: "# Pipeline Configuration\n\nPipelines help you track deals through your sales process.\n\n## Default Stages\n- **Lead** — Initial contact\n- **Qualified** — Budget and need confirmed\n- **Proposal** — Offer sent\n- **Negotiation** — Terms being finalized\n- **Won/Lost** — Outcome\n\n## Custom Stages\nGo to Settings > Pipelines to add custom stages.", categoryId: createdCategories[0].id, status: "published", viewCount: 218, helpfulCount: 56 },
        { title: "User Roles and Permissions", content: "# User Roles\n\n| Role | Access Level |\n|------|-------------|\n| Admin | Full access to all modules |\n| Manager | Team management + reporting |\n| Sales | Deals, contacts, activities |\n| Support | Tickets, KB, customer portal |\n| Viewer | Read-only access |\n\n## Custom Permissions\nEnterprise plans support field-level permissions.", categoryId: createdCategories[0].id, status: "published", viewCount: 156, helpfulCount: 42 },
        { title: "REST API Authentication", content: "# API Authentication\n\n## API Keys\nGenerate API keys from Settings > API Keys.\n\n```bash\ncurl -H 'Authorization: Bearer YOUR_API_KEY' \\\n     https://api.example.com/v1/contacts\n```\n\n## Rate Limits\n- Standard: 100 requests/minute\n- Enterprise: 1000 requests/minute\n\n## Webhooks\nConfigure webhooks for real-time event notifications.", categoryId: createdCategories[1].id, status: "published", viewCount: 445, helpfulCount: 112 },
        { title: "LIMS Integration Guide", content: "# LIMS Integration\n\nConnect your Laboratory Information Management System.\n\n## Supported Systems\n- LabWare LIMS\n- STARLIMS\n- Thermo Fisher SampleManager\n\n## Setup Steps\n1. Navigate to Settings > Integrations\n2. Select your LIMS vendor\n3. Enter API credentials\n4. Map data fields\n5. Run test sync", categoryId: createdCategories[1].id, status: "published", viewCount: 189, helpfulCount: 34 },
        { title: "Webhook Configuration", content: "# Webhooks\n\nReceive real-time notifications when events occur.\n\n## Available Events\n- `deal.created`, `deal.updated`, `deal.won`\n- `ticket.created`, `ticket.resolved`\n- `contact.created`, `invoice.paid`\n\n## Payload Format\n```json\n{\n  \"event\": \"deal.won\",\n  \"data\": { ... },\n  \"timestamp\": \"2026-04-10T12:00:00Z\"\n}\n```", categoryId: createdCategories[1].id, status: "published", viewCount: 267, helpfulCount: 71 },
        { title: "Login & Authentication Issues", content: "# Authentication Troubleshooting\n\n## Common Issues\n\n### Cannot Login\n1. Verify your email address is correct\n2. Reset your password via 'Forgot Password'\n3. Check if 2FA is enabled on your account\n4. Clear browser cache and cookies\n\n### 2FA Problems\n- Use backup codes if authenticator app is unavailable\n- Contact admin to reset 2FA\n\n### SSO Errors\nVerify SAML configuration with your IT team.", categoryId: createdCategories[2].id, status: "published", viewCount: 534, helpfulCount: 145 },
        { title: "Performance Optimization Tips", content: "# Performance Tips\n\n## Slow Dashboard\n- Reduce date range for reports\n- Use filters to limit data\n- Archive old records\n\n## Import Issues\n- Maximum 10,000 records per CSV\n- Use UTF-8 encoding\n- Remove duplicate emails before import\n\n## Browser Requirements\n- Chrome 90+, Firefox 88+, Safari 15+, Edge 90+", categoryId: createdCategories[2].id, status: "draft", viewCount: 78, helpfulCount: 12 },
      ]
      for (const a of articles) {
        await prisma.kbArticle.create({ data: { ...a, organizationId: orgId, authorId: user.id, tags: [] } })
      }
      console.log(`KB: ${categories.length} categories, ${articles.length} articles`)
    } else {
      console.log("KB: (existing, skipped)")
    }
  } catch (e) { console.log(`KB: ERROR — ${e.message}`) }

  // ─── 9. Email Templates ───
  try {
    const existingTemplate = await prisma.emailTemplate.findFirst({ where: { organizationId: orgId } })
    if (!existingTemplate) {
      const templates = [
        { name: "Welcome Onboarding", subject: "Welcome to {{companyName}} — Let's Get Started!", htmlBody: "<h1>Welcome, {{contactName}}!</h1><p>Thank you for choosing {{companyName}}. Your account is ready.</p><p>Here's what you can do next:</p><ul><li>Complete your profile</li><li>Explore the dashboard</li><li>Schedule a setup call</li></ul><p>Best regards,<br/>{{senderName}}</p>", category: "onboarding", variables: ["contactName", "companyName", "senderName"] },
        { name: "Invoice Reminder", subject: "Payment Reminder: Invoice {{invoiceNumber}} Due {{dueDate}}", htmlBody: "<h2>Payment Reminder</h2><p>Dear {{contactName}},</p><p>This is a friendly reminder that invoice <strong>{{invoiceNumber}}</strong> for <strong>{{amount}}</strong> is due on <strong>{{dueDate}}</strong>.</p><p>Please process the payment at your earliest convenience.</p><p>Thank you,<br/>{{companyName}} Finance Team</p>", category: "finance", variables: ["contactName", "invoiceNumber", "amount", "dueDate", "companyName"] },
        { name: "Deal Follow-Up", subject: "Following Up: {{dealName}}", htmlBody: "<p>Hi {{contactName}},</p><p>I wanted to follow up on our recent discussion about <strong>{{dealName}}</strong>.</p><p>Do you have any questions about the proposal? I'd be happy to schedule a call to discuss further.</p><p>Looking forward to hearing from you.</p><p>Best,<br/>{{senderName}}</p>", category: "sales", variables: ["contactName", "dealName", "senderName"] },
        { name: "Ticket Resolved", subject: "Your Ticket {{ticketNumber}} Has Been Resolved", htmlBody: "<p>Dear {{contactName}},</p><p>Your support ticket <strong>{{ticketNumber}}</strong> — \"{{ticketSubject}}\" has been resolved.</p><p>If the issue persists, simply reply to this email to reopen the ticket.</p><p>We'd appreciate your feedback:</p><p><a href='{{feedbackUrl}}'>Rate your experience</a></p><p>Thank you,<br/>Support Team</p>", category: "support", variables: ["contactName", "ticketNumber", "ticketSubject", "feedbackUrl"] },
        { name: "Monthly Newsletter", subject: "{{companyName}} Monthly Update — {{month}} {{year}}", htmlBody: "<h1>Monthly Update</h1><p>Dear {{contactName}},</p><p>Here's what's new this month:</p><h3>Product Updates</h3><p>{{productUpdates}}</p><h3>Upcoming Events</h3><p>{{events}}</p><h3>Industry Insights</h3><p>{{insights}}</p><p>Stay tuned for more updates!</p>", category: "marketing", variables: ["contactName", "companyName", "month", "year", "productUpdates", "events", "insights"] },
      ]
      for (const t of templates) {
        await prisma.emailTemplate.create({ data: { ...t, organizationId: orgId, createdBy: user.id, isActive: true } })
      }
      console.log(`Email Templates: ${templates.length}`)
    } else {
      console.log("Email Templates: (existing, skipped)")
    }
  } catch (e) { console.log(`Email Templates: ERROR — ${e.message}`) }

  // ─── 10. Contact Segments ───
  try {
    const existingSegment = await prisma.contactSegment.findFirst({ where: { organizationId: orgId } })
    if (!existingSegment) {
      const segments = [
        { name: "Enterprise Decision Makers", description: "C-level and VP contacts at companies with 1000+ employees", conditions: { rules: [{ field: "position", operator: "contains", value: "VP" }, { field: "company.employeeCount", operator: "gte", value: 1000 }] }, contactCount: 5, isDynamic: true },
        { name: "High Engagement (Score 80+)", description: "Contacts with engagement score above 80", conditions: { rules: [{ field: "engagementScore", operator: "gte", value: 80 }] }, contactCount: 6, isDynamic: true },
        { name: "European Pharma Contacts", description: "All contacts from European pharmaceutical companies", conditions: { rules: [{ field: "company.country", operator: "in", value: ["Switzerland", "UK", "Germany", "Sweden", "Poland"] }, { field: "company.industry", operator: "contains", value: "Pharma" }] }, contactCount: 7, isDynamic: true },
        { name: "Inactive Leads (30+ days)", description: "Contacts with no activity in the last 30 days", conditions: { rules: [{ field: "lastActivityDate", operator: "lt", value: "30_days_ago" }] }, contactCount: 3, isDynamic: true },
      ]
      for (const s of segments) {
        await prisma.contactSegment.create({ data: { ...s, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Segments: ${segments.length}`)
    } else {
      console.log("Segments: (existing, skipped)")
    }
  } catch (e) { console.log(`Segments: ERROR — ${e.message}`) }

  // ─── 11. Journeys + JourneySteps ───
  try {
    const existingJourney = await prisma.journey.findFirst({ where: { organizationId: orgId } })
    if (!existingJourney) {
      const journeysData = [
        { name: "New Lead Nurturing Sequence", description: "Automated email sequence for new inbound leads", status: "active", triggerType: "lead_created", entryCount: 45, activeCount: 12, completedCount: 28, steps: [
          { stepOrder: 0, stepType: "send_email", config: { templateName: "Welcome Onboarding", delay: 0 } },
          { stepOrder: 1, stepType: "wait", config: { days: 3 } },
          { stepOrder: 2, stepType: "condition", config: { field: "emailOpened", operator: "eq", value: true } },
          { stepOrder: 3, stepType: "send_email", config: { templateName: "Deal Follow-Up", delay: 0 } },
          { stepOrder: 4, stepType: "wait", config: { days: 5 } },
          { stepOrder: 5, stepType: "create_task", config: { title: "Follow up with lead", assignTo: "owner" } },
        ]},
        { name: "Invoice Payment Reminder Chain", description: "Automated reminders for unpaid invoices", status: "active", triggerType: "invoice_overdue", entryCount: 18, activeCount: 5, completedCount: 11, steps: [
          { stepOrder: 0, stepType: "send_email", config: { templateName: "Invoice Reminder", delay: 0 } },
          { stepOrder: 1, stepType: "wait", config: { days: 7 } },
          { stepOrder: 2, stepType: "condition", config: { field: "invoicePaid", operator: "eq", value: false } },
          { stepOrder: 3, stepType: "send_email", config: { templateName: "Invoice Reminder", subject: "Second Reminder" } },
          { stepOrder: 4, stepType: "wait", config: { days: 7 } },
          { stepOrder: 5, stepType: "create_task", config: { title: "Call client about overdue invoice", assignTo: "accountManager", priority: "high" } },
        ]},
      ]
      for (const j of journeysData) {
        const { steps, ...journeyData } = j
        const journey = await prisma.journey.create({ data: { ...journeyData, organizationId: orgId, createdBy: user.id } })
        for (const step of steps) {
          await prisma.journeyStep.create({ data: { ...step, journeyId: journey.id } })
        }
      }
      console.log(`Journeys: ${journeysData.length} (with steps)`)
    } else {
      console.log("Journeys: (existing, skipped)")
    }
  } catch (e) { console.log(`Journeys: ERROR — ${e.message}`) }

  // ─── 12. Events + Participants ───
  try {
    const existingEvent = await prisma.event.findFirst({ where: { organizationId: orgId } })
    if (!existingEvent) {
      const eventsData = [
        { name: "BioConnect 2026 — Annual Conference", description: "Annual pharma & biotech technology conference. Keynotes, workshops, and networking.", type: "conference", status: "registration_open", startDate: new Date(now + 45 * DAY), endDate: new Date(now + 47 * DAY), location: "Warsaw Marriott Hotel, Warsaw, Poland", isOnline: false, budget: 25000, expectedRevenue: 40000, maxParticipants: 200, registeredCount: 3, participants: [
          { contactIdx: 0, name: "Dr. James Mitchell", email: "j.mitchell@pfizer.com", role: "speaker", status: "confirmed" },
          { contactIdx: 5, name: "Dr. Anna Schneider", email: "a.schneider@biogenesislabs.com", role: "vip", status: "registered" },
          { contactIdx: 10, name: "Jennifer Park", email: "j.park@apexclinical.com", role: "attendee", status: "registered" },
        ]},
        { name: "AI in Drug Discovery — Webinar", description: "Free webinar covering AI/ML applications in pharmaceutical research and drug discovery pipelines.", type: "webinar", status: "planned", startDate: new Date(now + 21 * DAY), endDate: new Date(now + 21 * DAY), location: "Online (Zoom)", isOnline: true, meetingUrl: "https://zoom.us/j/example", budget: 500, expectedRevenue: 0, maxParticipants: 500, registeredCount: 2, participants: [
          { contactIdx: 1, name: "Sophie Dubois", email: "s.dubois@roche.com", role: "attendee", status: "registered" },
          { contactIdx: 8, name: "Dr. Michael Torres", email: "m.torres@neuropharma.com", role: "attendee", status: "registered" },
        ]},
        { name: "Clinical Suite 3.0 Launch Party", description: "Product launch event for Clinical Suite 3.0 with live demos and partner presentations.", type: "meetup", status: "completed", startDate: new Date(now - 20 * DAY), endDate: new Date(now - 20 * DAY), location: "LeadDrive Office, Warsaw", isOnline: false, budget: 3000, actualCost: 2800, expectedRevenue: 0, actualRevenue: 0, maxParticipants: 50, registeredCount: 3, attendedCount: 3, participants: [
          { contactIdx: 4, name: "Robert Kim", email: "r.kim@merck.com", role: "attendee", status: "attended" },
          { contactIdx: 7, name: "Katarzyna Nowak", email: "k.nowak@pharmacare-dist.eu", role: "attendee", status: "attended" },
          { contactIdx: 11, name: "Hans Muller", email: "h.muller@euromed-supplies.de", role: "attendee", status: "attended" },
        ]},
      ]
      for (const e of eventsData) {
        const { participants, ...eventData } = e
        const event = await prisma.event.create({ data: { ...eventData, organizationId: orgId, createdBy: user.id, tags: [] } })
        for (const p of participants) {
          const { contactIdx, ...pData } = p
          await prisma.eventParticipant.create({ data: { ...pData, eventId: event.id, contactId: createdContacts[contactIdx].id, companyId: createdContacts[contactIdx].companyId || undefined } })
        }
      }
      console.log(`Events: ${eventsData.length} (with participants)`)
    } else {
      console.log("Events: (existing, skipped)")
    }
  } catch (e) { console.log(`Events: ERROR — ${e.message}`) }

  // ─── 13. Projects + Milestones + ProjectTasks ───
  try {
    const existingProject = await prisma.project.findFirst({ where: { organizationId: orgId } })
    if (!existingProject) {
      const projectsData = [
        { name: "Merck Lab Management System", code: "PRJ-001", description: "Full implementation of lab management system with GxP compliance for Merck", status: "active", priority: "high", startDate: new Date(now - 60 * DAY), endDate: new Date(now + 120 * DAY), budget: 410000, actualCost: 136000, currency: "USD", completionPercentage: 35, companyId: createdCompanies[4].id, color: "#3b82f6",
          milestones: [
            { name: "Discovery & Requirements", dueDate: new Date(now - 30 * DAY), status: "completed", completedAt: new Date(now - 28 * DAY), sortOrder: 0 },
            { name: "Core Platform Development", dueDate: new Date(now + 30 * DAY), status: "in_progress", sortOrder: 1 },
            { name: "Integration & Testing", dueDate: new Date(now + 90 * DAY), status: "pending", sortOrder: 2 },
            { name: "Go-Live & Training", dueDate: new Date(now + 120 * DAY), status: "pending", sortOrder: 3 },
          ],
          tasks: [
            { title: "Complete database schema design", status: "done", priority: "high", dueDate: new Date(now - 20 * DAY), completedAt: new Date(now - 18 * DAY), estimatedHours: 24, actualHours: 28 },
            { title: "Build sample management module", status: "in_progress", priority: "high", dueDate: new Date(now + 10 * DAY), estimatedHours: 80, actualHours: 35 },
            { title: "Implement GxP audit trail", status: "in_progress", priority: "high", dueDate: new Date(now + 20 * DAY), estimatedHours: 40, actualHours: 12 },
            { title: "API integration with existing LIMS", status: "todo", priority: "medium", dueDate: new Date(now + 45 * DAY), estimatedHours: 60 },
          ],
        },
        { name: "Pfizer CRM Integration", code: "PRJ-002", description: "CRM system integration with Pfizer's existing IT infrastructure", status: "planning", priority: "high", startDate: new Date(now + 15 * DAY), endDate: new Date(now + 200 * DAY), budget: 285000, actualCost: 0, currency: "USD", completionPercentage: 0, companyId: createdCompanies[0].id, color: "#8b5cf6",
          milestones: [
            { name: "Project Kickoff", dueDate: new Date(now + 15 * DAY), status: "pending", sortOrder: 0 },
            { name: "Phase 1 Delivery", dueDate: new Date(now + 100 * DAY), status: "pending", sortOrder: 1 },
          ],
          tasks: [
            { title: "Prepare project charter", status: "in_progress", priority: "high", dueDate: new Date(now + 5 * DAY), estimatedHours: 16, actualHours: 4 },
            { title: "SSO integration architecture", status: "todo", priority: "medium", dueDate: new Date(now + 25 * DAY), estimatedHours: 32 },
            { title: "Data migration planning", status: "todo", priority: "medium", dueDate: new Date(now + 30 * DAY), estimatedHours: 24 },
          ],
        },
        { name: "EuroMed Supply Chain (Completed)", code: "PRJ-003", description: "Supply chain management solution for EuroMed Supplies", status: "completed", priority: "medium", startDate: new Date(now - 200 * DAY), endDate: new Date(now - 35 * DAY), actualEndDate: new Date(now - 30 * DAY), budget: 98000, actualCost: 92000, currency: "EUR", completionPercentage: 100, companyId: createdCompanies[11].id, color: "#10b981",
          milestones: [
            { name: "Requirements Gathering", dueDate: new Date(now - 170 * DAY), status: "completed", completedAt: new Date(now - 168 * DAY), sortOrder: 0 },
            { name: "Final Delivery", dueDate: new Date(now - 35 * DAY), status: "completed", completedAt: new Date(now - 30 * DAY), sortOrder: 1 },
          ],
          tasks: [
            { title: "Final UAT signoff", status: "done", priority: "high", dueDate: new Date(now - 35 * DAY), completedAt: new Date(now - 33 * DAY), estimatedHours: 16, actualHours: 12 },
            { title: "Knowledge transfer documentation", status: "done", priority: "medium", dueDate: new Date(now - 30 * DAY), completedAt: new Date(now - 30 * DAY), estimatedHours: 24, actualHours: 20 },
          ],
        },
      ]
      for (const proj of projectsData) {
        const { milestones, tasks: projTasks, ...projectData } = proj
        const project = await prisma.project.create({ data: { ...projectData, organizationId: orgId, managerId: user.id, createdBy: user.id, tags: [] } })
        const createdMilestones = []
        for (const ms of milestones) {
          const m = await prisma.projectMilestone.create({ data: { ...ms, organizationId: orgId, projectId: project.id } })
          createdMilestones.push(m)
        }
        for (const t of projTasks) {
          await prisma.projectTask.create({ data: { ...t, organizationId: orgId, projectId: project.id, assignedTo: user.id, createdBy: user.id, tags: [], actualHours: t.actualHours || 0, estimatedHours: t.estimatedHours || 0 } })
        }
      }
      console.log(`Projects: ${projectsData.length} (with milestones & tasks)`)
    } else {
      console.log("Projects: (existing, skipped)")
    }
  } catch (e) { console.log(`Projects: ERROR — ${e.message}`) }

  // ─── 14. Saved Reports ───
  try {
    const existingReport = await prisma.savedReport.findFirst({ where: { organizationId: orgId } })
    if (!existingReport) {
      const reports = [
        { name: "Monthly Revenue by Client", entityType: "deals", columns: [{ field: "company.name", label: "Client" }, { field: "valueAmount", label: "Value", aggregate: "sum" }], filters: [{ field: "stage", op: "eq", value: "WON" }], groupBy: "company.name", sortBy: "valueAmount", sortOrder: "desc", chartType: "bar" },
        { name: "Open Tickets by Priority", entityType: "tickets", columns: [{ field: "priority", label: "Priority" }, { field: "id", label: "Count", aggregate: "count" }], filters: [{ field: "status", op: "in", value: ["new", "in_progress"] }], groupBy: "priority", chartType: "pie" },
        { name: "Pipeline Forecast Report", entityType: "deals", columns: [{ field: "stage", label: "Stage" }, { field: "valueAmount", label: "Weighted Value", aggregate: "sum" }, { field: "probability", label: "Avg Probability", aggregate: "avg" }], filters: [{ field: "stage", op: "nin", value: ["WON", "LOST"] }], groupBy: "stage", chartType: "funnel" },
        { name: "Contact Engagement Scores", entityType: "contacts", columns: [{ field: "fullName", label: "Contact" }, { field: "company.name", label: "Company" }, { field: "engagementScore", label: "Score" }], filters: [], sortBy: "engagementScore", sortOrder: "desc", chartType: "table" },
      ]
      for (const r of reports) {
        await prisma.savedReport.create({ data: { ...r, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Saved Reports: ${reports.length}`)
    } else {
      console.log("Saved Reports: (existing, skipped)")
    }
  } catch (e) { console.log(`Saved Reports: ERROR — ${e.message}`) }

  // ─── 15. Notifications ───
  try {
    const existingNotification = await prisma.notification.findFirst({ where: { organizationId: orgId } })
    if (!existingNotification) {
      const notifications = [
        { type: "deal_won", title: "Deal Won!", message: "Novartis Procurement Platform deal closed for €195,000", isRead: true, createdAt: new Date(now - 5 * DAY) },
        { type: "ticket_created", title: "New Ticket: TK-1001", message: "Login issues after SSO migration — reported by Dr. James Mitchell (Pfizer)", isRead: true, createdAt: new Date(now - 3 * DAY) },
        { type: "invoice_overdue", title: "Invoice Overdue", message: "INV-2026-005 (BioGenesis) for €26,180 is 10 days overdue", isRead: false, createdAt: new Date(now - 1 * DAY) },
        { type: "task_due", title: "Task Due Tomorrow", message: "Follow up with Merck on Phase 2 — due tomorrow", isRead: false, createdAt: new Date(now) },
        { type: "lead_assigned", title: "New Lead Assigned", message: "Aisha Patel from Mumbai Medical Tech (score: 91) has been assigned to you", isRead: false, createdAt: new Date(now - 2 * DAY) },
        { type: "campaign_completed", title: "Campaign Results Ready", message: "BioConnect 2026 invite campaign: 46% open rate, 18% click rate", isRead: true, createdAt: new Date(now - 7 * DAY) },
      ]
      for (const n of notifications) {
        await prisma.notification.create({ data: { ...n, organizationId: orgId, userId: user.id } })
      }
      console.log(`Notifications: ${notifications.length}`)
    } else {
      console.log("Notifications: (existing, skipped)")
    }
  } catch (e) { console.log(`Notifications: ERROR — ${e.message}`) }

  // ─── 16. Sales Forecasts ───
  try {
    // SalesForecast requires a BudgetDepartment — create departments first if needed
    let salesDept = await prisma.budgetDepartment.findFirst({ where: { organizationId: orgId, key: "sales" } })
    if (!salesDept) {
      salesDept = await prisma.budgetDepartment.create({
        data: { organizationId: orgId, key: "sales", label: "Sales", hasRevenue: true, color: "#3b82f6", sortOrder: 0 },
      })
    }
    const existingForecast = await prisma.salesForecast.findFirst({ where: { organizationId: orgId } })
    if (!existingForecast) {
      const forecasts = [
        { year: 2026, month: 1, amount: 185000, notes: "Q1 conservative estimate" },
        { year: 2026, month: 2, amount: 210000, notes: "Merck Phase 1 delivery" },
        { year: 2026, month: 3, amount: 195000, notes: "Novartis renewal" },
        { year: 2026, month: 4, amount: 245000, notes: "Q2 includes Pfizer kickoff" },
        { year: 2026, month: 5, amount: 280000, notes: "BioGenesis + Apex start" },
        { year: 2026, month: 6, amount: 310000, notes: "Mid-year peak" },
        { year: 2026, month: 7, amount: 265000, notes: "Q3 start — seasonal dip" },
        { year: 2026, month: 8, amount: 240000, notes: "Summer slowdown" },
        { year: 2026, month: 9, amount: 290000, notes: "Q3 recovery" },
        { year: 2026, month: 10, amount: 320000, notes: "Q4 pipeline acceleration" },
        { year: 2026, month: 11, amount: 350000, notes: "Year-end deal push" },
        { year: 2026, month: 12, amount: 380000, notes: "Q4 closes — strongest month" },
      ]
      for (const f of forecasts) {
        await prisma.salesForecast.create({ data: { ...f, organizationId: orgId, departmentId: salesDept.id } })
      }
      console.log(`Sales Forecasts: ${forecasts.length} (monthly)`)
    } else {
      console.log("Sales Forecasts: (existing, skipped)")
    }
  } catch (e) { console.log(`Sales Forecasts: ERROR — ${e.message}`) }

  // ─── 17. Currencies ───
  try {
    const existingCurrency = await prisma.currency.findFirst({ where: { organizationId: orgId } })
    if (!existingCurrency) {
      const currencies = [
        { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1.0, isBase: true, isActive: true },
        { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.92, isBase: false, isActive: true },
        { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 0.79, isBase: false, isActive: true },
        { code: "PLN", name: "Polish Zloty", symbol: "zł", exchangeRate: 3.95, isBase: false, isActive: true },
        { code: "CHF", name: "Swiss Franc", symbol: "CHF", exchangeRate: 0.88, isBase: false, isActive: true },
      ]
      for (const c of currencies) {
        await prisma.currency.create({ data: { ...c, organizationId: orgId } })
      }
      console.log(`Currencies: ${currencies.length}`)
    } else {
      console.log("Currencies: (existing, skipped)")
    }
  } catch (e) { console.log(`Currencies: ERROR — ${e.message}`) }

  // ─── 18. SLA Policies ───
  try {
    const existingSla = await prisma.slaPolicy.findFirst({ where: { organizationId: orgId } })
    if (!existingSla) {
      const slaPolicies = [
        { name: "Critical SLA", priority: "critical", firstResponseHours: 1, resolutionHours: 4, businessHoursOnly: false, isActive: true, isDefault: false },
        { name: "High Priority SLA", priority: "high", firstResponseHours: 2, resolutionHours: 8, businessHoursOnly: true, isActive: true, isDefault: true },
        { name: "Medium Priority SLA", priority: "medium", firstResponseHours: 4, resolutionHours: 24, businessHoursOnly: true, isActive: true, isDefault: false },
        { name: "Low Priority SLA", priority: "low", firstResponseHours: 8, resolutionHours: 48, businessHoursOnly: true, isActive: true, isDefault: false },
      ]
      for (const s of slaPolicies) {
        await prisma.slaPolicy.create({ data: { ...s, organizationId: orgId } })
      }
      console.log(`SLA Policies: ${slaPolicies.length}`)
    } else {
      console.log("SLA Policies: (existing, skipped)")
    }
  } catch (e) { console.log(`SLA Policies: ERROR — ${e.message}`) }

  // ─── 19. Ticket Queues ───
  try {
    const existingQueue = await prisma.ticketQueue.findFirst({ where: { organizationId: orgId } })
    if (!existingQueue) {
      const queues = [
        { name: "Technical Support", skills: ["technical", "integration", "api"], priority: 1, autoAssign: true, assignMethod: "least_loaded", isActive: true },
        { name: "Billing & Finance", skills: ["billing", "invoicing", "payments"], priority: 0, autoAssign: true, assignMethod: "round_robin", isActive: true },
        { name: "Compliance & Security", skills: ["compliance", "gdpr", "security", "gxp"], priority: 2, autoAssign: false, assignMethod: "least_loaded", isActive: true },
      ]
      for (const q of queues) {
        await prisma.ticketQueue.create({ data: { ...q, organizationId: orgId } })
      }
      console.log(`Ticket Queues: ${queues.length}`)
    } else {
      console.log("Ticket Queues: (existing, skipped)")
    }
  } catch (e) { console.log(`Ticket Queues: ERROR — ${e.message}`) }

  // ─── 20. Workflow Rules ───
  try {
    const existingWorkflow = await prisma.workflowRule.findFirst({ where: { organizationId: orgId } })
    if (!existingWorkflow) {
      const workflows = [
        { name: "Auto-assign high-value deals to manager", entityType: "deal", triggerEvent: "created", conditions: { rules: [{ field: "valueAmount", operator: "gte", value: 100000 }] }, isActive: true },
        { name: "Notify team on ticket escalation", entityType: "ticket", triggerEvent: "updated", conditions: { rules: [{ field: "escalationLevel", operator: "gte", value: 2 }] }, isActive: true },
      ]
      for (const w of workflows) {
        const rule = await prisma.workflowRule.create({ data: { ...w, organizationId: orgId, createdBy: user.id } })
        // Add actions for each rule
        if (w.entityType === "deal") {
          await prisma.workflowAction.create({ data: { ruleId: rule.id, actionType: "assign_to", actionConfig: { target: "manager" }, actionOrder: 0 } })
          await prisma.workflowAction.create({ data: { ruleId: rule.id, actionType: "send_notification", actionConfig: { message: "High-value deal created: {{deal.name}}" }, actionOrder: 1 } })
        } else {
          await prisma.workflowAction.create({ data: { ruleId: rule.id, actionType: "send_notification", actionConfig: { target: "team", message: "Ticket {{ticket.ticketNumber}} escalated to level {{ticket.escalationLevel}}" }, actionOrder: 0 } })
        }
      }
      console.log(`Workflow Rules: ${workflows.length} (with actions)`)
    } else {
      console.log("Workflow Rules: (existing, skipped)")
    }
  } catch (e) { console.log(`Workflow Rules: ERROR — ${e.message}`) }

  // ─── 21. AI Agent Configs ───
  try {
    const existingAi = await prisma.aiAgentConfig.findFirst({ where: { organizationId: orgId } })
    if (!existingAi) {
      const aiConfigs = [
        { configName: "Da Vinci — Sales Assistant", model: "claude-haiku-4-5-20251001", maxTokens: 2048, temperature: 0.7, systemPrompt: "You are Da Vinci, an AI sales assistant for a pharma/biotech CRM platform. Help users with deal analysis, lead scoring, email drafting, and pipeline optimization. Be concise, data-driven, and professional.", agentType: "sales", department: "Sales", priority: 1, intents: ["sales_inquiry", "pricing", "demo_request", "deal_analysis"], kbEnabled: true, kbMaxArticles: 5, isActive: true, escalationEnabled: true, greeting: "Hello! I'm Da Vinci, your AI sales assistant. How can I help you today?" },
        { configName: "Da Vinci — Support Bot", model: "claude-haiku-4-5-20251001", maxTokens: 1024, temperature: 0.5, systemPrompt: "You are Da Vinci, a support AI for a pharma CRM platform. Help users troubleshoot issues, find KB articles, and create tickets when needed. Be empathetic and solution-oriented.", agentType: "support", department: "Support", priority: 0, intents: ["support_request", "bug_report", "how_to", "ticket_status"], kbEnabled: true, kbMaxArticles: 3, isActive: true, escalationEnabled: true, greeting: "Hi! I'm here to help with any issues you're experiencing. What can I assist with?" },
      ]
      for (const a of aiConfigs) {
        await prisma.aiAgentConfig.create({ data: { ...a, organizationId: orgId } })
      }
      console.log(`AI Agent Configs: ${aiConfigs.length}`)
    } else {
      console.log("AI Agent Configs: (existing, skipped)")
    }
  } catch (e) { console.log(`AI Agent Configs: ERROR — ${e.message}`) }

  // ─── 22. Call Logs ───
  try {
    const existingCall = await prisma.callLog.findFirst({ where: { organizationId: orgId } })
    if (!existingCall) {
      const callLogs = [
        { direction: "outbound", fromNumber: "+48221234567", toNumber: "+12127332400", status: "completed", duration: 1845, contactId: createdContacts[0].id, companyId: createdCompanies[0].id, disposition: "interested", notes: "Discussed CRM requirements. Very interested in clinical suite. Follow-up demo scheduled for next week.", startedAt: new Date(now - 3 * DAY), endedAt: new Date(now - 3 * DAY + 1845000) },
        { direction: "inbound", fromNumber: "+41616882200", toNumber: "+48221234567", status: "completed", duration: 720, contactId: createdContacts[1].id, companyId: createdCompanies[1].id, disposition: "callback", notes: "Sophie called to discuss timeline for digital transformation. Needs updated proposal by Friday.", startedAt: new Date(now - 2 * DAY), endedAt: new Date(now - 2 * DAY + 720000) },
        { direction: "outbound", fromNumber: "+48221234567", toNumber: "+16175550200", status: "completed", duration: 2160, contactId: createdContacts[8].id, companyId: createdCompanies[8].id, disposition: "interested", notes: "Deep dive on trial tracker features. Needs GxP compliance documentation. Sending technical specs.", startedAt: new Date(now - 1 * DAY), endedAt: new Date(now - 1 * DAY + 2160000) },
        { direction: "outbound", fromNumber: "+48221234567", toNumber: "+46812345600", status: "no-answer", duration: 0, contactId: createdContacts[9].id, companyId: createdCompanies[9].id, disposition: "no_answer", notes: "Left voicemail about ERP setup proposal.", startedAt: new Date(now - 4 * DAY) },
        { direction: "inbound", fromNumber: "+19087404100", toNumber: "+48221234567", status: "completed", duration: 960, contactId: createdContacts[4].id, companyId: createdCompanies[4].id, disposition: "interested", notes: "Robert called about Phase 2 customization. Wants to add GxP validation module. Sending revised SOW.", startedAt: new Date(now - 6 * DAY), endedAt: new Date(now - 6 * DAY + 960000) },
      ]
      for (const c of callLogs) {
        await prisma.callLog.create({ data: { ...c, organizationId: orgId, userId: user.id } })
      }
      console.log(`Call Logs: ${callLogs.length}`)
    } else {
      console.log("Call Logs: (existing, skipped)")
    }
  } catch (e) { console.log(`Call Logs: ERROR — ${e.message}`) }

  // ─── 23. Budget Plan + Budget Lines ───
  try {
    const existingPlan = await prisma.budgetPlan.findFirst({ where: { organizationId: orgId } })
    if (!existingPlan) {
      const plan = await prisma.budgetPlan.create({
        data: {
          organizationId: orgId,
          name: "Annual Budget 2026",
          periodType: "annual",
          year: 2026,
          status: "approved",
          notes: "Approved annual operating budget for fiscal year 2026",
          approvedBy: user.id,
          approvedAt: new Date(now - 90 * DAY),
        },
      })
      const budgetLines = [
        { category: "Personnel & Salaries", lineType: "expense", plannedAmount: 1200000, notes: "All staff salaries incl. taxes", sortOrder: 0 },
        { category: "Cloud Infrastructure", lineType: "expense", plannedAmount: 96000, notes: "AWS + Hetzner servers", sortOrder: 1 },
        { category: "Software Licenses", lineType: "expense", plannedAmount: 45000, notes: "Development tools, SaaS subscriptions", sortOrder: 2 },
        { category: "Office & Facilities", lineType: "expense", plannedAmount: 60000, notes: "WeWork rent + utilities", sortOrder: 3 },
        { category: "Marketing & Events", lineType: "expense", plannedAmount: 80000, notes: "Campaigns, conferences, content", sortOrder: 4 },
        { category: "Service Revenue", lineType: "revenue", plannedAmount: 3200000, notes: "Projected service delivery revenue", sortOrder: 5 },
      ]
      for (const line of budgetLines) {
        await prisma.budgetLine.create({ data: { ...line, organizationId: orgId, planId: plan.id } })
      }
      console.log(`Budget Plan: 1 plan, ${budgetLines.length} lines`)
    } else {
      console.log("Budget Plan: (existing, skipped)")
    }
  } catch (e) { console.log(`Budget Plan: ERROR — ${e.message}`) }

  // ─── 24. Pricing Parameters ───
  try {
    const existingPricing = await prisma.pricingParameters.findFirst({ where: { organizationId: orgId } })
    if (!existingPricing) {
      await prisma.pricingParameters.create({
        data: {
          organizationId: orgId,
          totalUsers: 45,
          totalEmployees: 137,
          technicalStaff: 107,
          backOfficeStaff: 30,
          monthlyWorkHours: 160,
          vatRate: 0.23,
          employerTaxRate: 0.2,
          riskRate: 0.05,
          miscExpenseRate: 0.01,
          fixedOverheadRatio: 0.25,
          updatedBy: user.id,
        },
      })
      console.log("Pricing Parameters: 1")
    } else {
      console.log("Pricing Parameters: (existing, skipped)")
    }
  } catch (e) { console.log(`Pricing Parameters: ERROR — ${e.message}`) }

  // ─── 25. Overhead Costs ───
  try {
    const existingOverhead = await prisma.overheadCost.findFirst({ where: { organizationId: orgId } })
    if (!existingOverhead) {
      const overheadCosts = [
        { category: "Facilities", label: "Office Rent (WeWork Warsaw)", amount: 4200, isAnnual: false, hasVat: true, isAdmin: true, sortOrder: 0 },
        { category: "Software", label: "AWS Cloud Services", amount: 8450, isAnnual: false, hasVat: false, isAdmin: false, targetService: "cloud", sortOrder: 1 },
        { category: "Software", label: "Development Tools & Licenses", amount: 3750, isAnnual: false, hasVat: true, isAdmin: false, targetService: "permanent_it", sortOrder: 2 },
        { category: "Insurance", label: "Professional Liability Insurance", amount: 24000, isAnnual: true, hasVat: false, isAdmin: true, amortMonths: 12, sortOrder: 3 },
        { category: "Equipment", label: "Workstation Leasing (quarterly)", amount: 15000, isAnnual: false, hasVat: true, isAdmin: true, amortMonths: 60, sortOrder: 4, notes: "40 workstations, 5-year amortization" },
      ]
      for (const oc of overheadCosts) {
        await prisma.overheadCost.create({ data: { ...oc, organizationId: orgId } })
      }
      console.log(`Overhead Costs: ${overheadCosts.length}`)
    } else {
      console.log("Overhead Costs: (existing, skipped)")
    }
  } catch (e) { console.log(`Overhead Costs: ERROR — ${e.message}`) }

  // ─── 26. TicketComment ───
  try {
    const existingTC = await prisma.ticketComment.findFirst({
      where: { ticket: { organizationId: orgId } },
    })
    if (!existingTC) {
      const orgTickets = await prisma.ticket.findMany({ where: { organizationId: orgId }, take: 8 })
      if (orgTickets.length > 0) {
        const comments = [
          { ticketId: orgTickets[0]?.id, userId: user.id, comment: "Confirmed the SAML assertion issue. Root cause is a clock skew between IdP and our SP. Adjusting time tolerance to 5 minutes.", isInternal: false },
          { ticketId: orgTickets[0]?.id, userId: user.id, comment: "Internal note: contacted Okta support — they confirmed a known bug in their latest release. Patch expected Thursday.", isInternal: true },
          { ticketId: orgTickets[1]?.id, userId: user.id, comment: "Profiled the slow queries. The main bottleneck is the aggregation pipeline on the analytics_events table. Adding composite index.", isInternal: false },
          { ticketId: orgTickets[2]?.id, userId: user.id, comment: "Reproduced the issue with 55 line items. The PDF renderer runs out of memory. Switching to streaming generation.", isInternal: false },
          { ticketId: orgTickets[3]?.id, userId: user.id, comment: "Feature request logged in the product backlog. Estimated effort: 3 sprints. Will include in Q3 roadmap review.", isInternal: true },
          { ticketId: orgTickets[4]?.id, userId: user.id, comment: "Increased rate limit to 500 req/min for their API key. Monitoring for the next 24 hours.", isInternal: false },
          { ticketId: orgTickets[5]?.id, userId: user.id, comment: "Calendar sync fix deployed in v3.2.1. Customer confirmed events are syncing correctly now.", isInternal: false },
          { ticketId: orgTickets[6]?.id, userId: user.id, comment: "GDPR compliance review completed. All export endpoints comply with Article 20 (right to data portability). Sending documentation to customer.", isInternal: false },
        ]
        for (const c of comments) {
          if (c.ticketId) {
            await prisma.ticketComment.create({ data: c })
          }
        }
        console.log(`Ticket Comments: ${comments.length}`)
      } else {
        console.log("Ticket Comments: (no tickets found, skipped)")
      }
    } else {
      console.log("Ticket Comments: (existing, skipped)")
    }
  } catch (e) { console.log(`Ticket Comments: ERROR — ${e.message}`) }

  // ─── 27. TicketMacro ───
  try {
    const existingTM = await prisma.ticketMacro.findFirst({ where: { organizationId: orgId } })
    if (!existingTM) {
      const macros = [
        { name: "Quick Close — Resolved", description: "Mark ticket as resolved with standard closing comment", category: "resolution", actions: [{ type: "set_status", value: "resolved" }, { type: "add_comment", value: "Issue resolved." }], shortcutKey: "Ctrl+Shift+R", sortOrder: 0 },
        { name: "Escalate to Manager", description: "Escalate ticket to manager with critical priority", category: "escalation", actions: [{ type: "set_priority", value: "critical" }, { type: "send_notification", target: "manager" }], shortcutKey: "Ctrl+Shift+E", sortOrder: 1 },
        { name: "Request Info", description: "Set ticket to waiting and ask for more details", category: "general", actions: [{ type: "set_status", value: "waiting" }, { type: "add_comment", value: "Could you provide more details?" }], shortcutKey: "Ctrl+Shift+I", sortOrder: 2 },
        { name: "Assign to Me", description: "Assign the current ticket to yourself", category: "assignment", actions: [{ type: "assign_to", value: "{{current_user}}" }], shortcutKey: "Ctrl+Shift+A", sortOrder: 3 },
      ]
      for (const m of macros) {
        await prisma.ticketMacro.create({ data: { ...m, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Ticket Macros: ${macros.length}`)
    } else {
      console.log("Ticket Macros: (existing, skipped)")
    }
  } catch (e) { console.log(`Ticket Macros: ERROR — ${e.message}`) }

  // ─── 28. EscalationRule ───
  try {
    const existingER = await prisma.escalationRule.findFirst({ where: { organizationId: orgId } })
    if (!existingER) {
      const rules = [
        { name: "First Response Breach", triggerType: "first_response_breach", triggerMinutes: 0, level: 1, actions: [{ type: "notify", target: "manager" }, { type: "increase_priority" }] },
        { name: "Resolution Warning", triggerType: "resolution_warning", triggerMinutes: 60, level: 1, actions: [{ type: "notify", target: "assigned_agent" }, { type: "add_comment", value: "SLA resolution deadline approaching." }] },
        { name: "Critical Escalation", triggerType: "resolution_breach", triggerMinutes: 0, level: 2, actions: [{ type: "notify", target: "admin" }, { type: "increase_priority" }, { type: "reassign", target: "manager" }] },
      ]
      for (const r of rules) {
        await prisma.escalationRule.create({ data: { ...r, organizationId: orgId } })
      }
      console.log(`Escalation Rules: ${rules.length}`)
    } else {
      console.log("Escalation Rules: (existing, skipped)")
    }
  } catch (e) { console.log(`Escalation Rules: ERROR — ${e.message}`) }

  // ─── 29. LeadAssignmentRule ───
  try {
    const existingLAR = await prisma.leadAssignmentRule.findFirst({ where: { organizationId: orgId } })
    if (!existingLAR) {
      const rules = [
        { name: "High Value Leads", description: "Route leads with estimated value > $100K to senior sales", method: "condition", priority: 10, conditions: [{ field: "estimatedValue", operator: "gt", value: 100000 }], assignees: [user.id] },
        { name: "European Leads", description: "Website leads routed to EU sales team", method: "condition", priority: 20, conditions: [{ field: "source", operator: "eq", value: "website" }], assignees: [user.id] },
        { name: "Round Robin Default", description: "Default round-robin distribution for unmatched leads", method: "round_robin", priority: 99, conditions: [], assignees: [user.id] },
      ]
      for (const r of rules) {
        await prisma.leadAssignmentRule.create({ data: { ...r, organizationId: orgId } })
      }
      console.log(`Lead Assignment Rules: ${rules.length}`)
    } else {
      console.log("Lead Assignment Rules: (existing, skipped)")
    }
  } catch (e) { console.log(`Lead Assignment Rules: ERROR — ${e.message}`) }

  // ─── 30. SalesQuota ───
  try {
    const existingSQ = await prisma.salesQuota.findFirst({ where: { organizationId: orgId } })
    if (!existingSQ) {
      const quotas = [
        { userId: user.id, year: 2026, quarter: 1, amount: 250000, currency: "USD" },
        { userId: user.id, year: 2026, quarter: 2, amount: 300000, currency: "USD" },
        { userId: user.id, year: 2026, quarter: 3, amount: 350000, currency: "USD" },
        { userId: user.id, year: 2026, quarter: 4, amount: 400000, currency: "USD" },
      ]
      for (const q of quotas) {
        await prisma.salesQuota.create({ data: { ...q, organizationId: orgId } })
      }
      console.log(`Sales Quotas: ${quotas.length}`)
    } else {
      console.log("Sales Quotas: (existing, skipped)")
    }
  } catch (e) { console.log(`Sales Quotas: ERROR — ${e.message}`) }

  // ─── 31. CustomField ───
  try {
    const existingCF = await prisma.customField.findFirst({ where: { organizationId: orgId } })
    if (!existingCF) {
      const fields = [
        { entityType: "deal", fieldName: "deal_source_channel", fieldLabel: "Source Channel", fieldType: "select", options: ["Direct", "Partner", "Online", "Referral"], sortOrder: 0 },
        { entityType: "company", fieldName: "company_tier", fieldLabel: "Client Tier", fieldType: "select", options: ["Platinum", "Gold", "Silver", "Bronze"], sortOrder: 1 },
        { entityType: "contact", fieldName: "preferred_language", fieldLabel: "Preferred Language", fieldType: "select", options: ["English", "German", "French", "Polish"], sortOrder: 2 },
        { entityType: "ticket", fieldName: "affected_system", fieldLabel: "Affected System", fieldType: "text", options: [], sortOrder: 3 },
        { entityType: "lead", fieldName: "lead_budget_range", fieldLabel: "Budget Range", fieldType: "select", options: ["< $50K", "$50K-$100K", "$100K-$500K", "> $500K"], sortOrder: 4 },
      ]
      for (const f of fields) {
        await prisma.customField.create({ data: { ...f, organizationId: orgId } })
      }
      console.log(`Custom Fields: ${fields.length}`)
    } else {
      console.log("Custom Fields: (existing, skipped)")
    }
  } catch (e) { console.log(`Custom Fields: ERROR — ${e.message}`) }

  // ─── 32. FieldPermission ───
  try {
    const existingFP = await prisma.fieldPermission.findFirst({ where: { organizationId: orgId } })
    if (!existingFP) {
      const perms = [
        { roleId: "viewer", entityType: "deal", fieldName: "valueAmount", access: "hidden" },
        { roleId: "viewer", entityType: "company", fieldName: "annualRevenue", access: "hidden" },
        { roleId: "member", entityType: "deal", fieldName: "valueAmount", access: "visible" },
        { roleId: "member", entityType: "contact", fieldName: "phone", access: "editable" },
        { roleId: "support", entityType: "deal", fieldName: "valueAmount", access: "hidden" },
        { roleId: "support", entityType: "ticket", fieldName: "escalationLevel", access: "visible" },
      ]
      for (const p of perms) {
        await prisma.fieldPermission.create({ data: { ...p, organizationId: orgId } })
      }
      console.log(`Field Permissions: ${perms.length}`)
    } else {
      console.log("Field Permissions: (existing, skipped)")
    }
  } catch (e) { console.log(`Field Permissions: ERROR — ${e.message}`) }

  // ─── 33. DealContactRole ───
  try {
    const existingDCR = await prisma.dealContactRole.findFirst({
      where: { deal: { organizationId: orgId } },
    })
    if (!existingDCR) {
      const orgDeals = await prisma.deal.findMany({ where: { organizationId: orgId }, take: 5 })
      if (orgDeals.length >= 3 && createdContacts.length >= 10) {
        const roles = [
          { dealId: orgDeals[0].id, contactId: createdContacts[0].id, role: "decision_maker", influence: "High", decisionFactor: "ROI", loyalty: "Supportive", isPrimary: true },
          { dealId: orgDeals[0].id, contactId: createdContacts[12].id, role: "technical_evaluator", influence: "Medium", decisionFactor: "Ease of Use", loyalty: "Neutral", isPrimary: false },
          { dealId: orgDeals[1].id, contactId: createdContacts[1].id, role: "decision_maker", influence: "High", decisionFactor: "Innovation", loyalty: "Supportive", isPrimary: true },
          { dealId: orgDeals[2].id, contactId: createdContacts[2].id, role: "budget_holder", influence: "High", decisionFactor: "Cost Savings", loyalty: "Supportive", isPrimary: true },
          { dealId: orgDeals[3]?.id || orgDeals[0].id, contactId: createdContacts[3].id, role: "influencer", influence: "Medium", decisionFactor: "Integration", loyalty: "Neutral", isPrimary: false },
        ]
        for (const r of roles) {
          await prisma.dealContactRole.create({ data: r })
        }
        console.log(`Deal Contact Roles: ${roles.length}`)
      } else {
        console.log("Deal Contact Roles: (insufficient deals/contacts, skipped)")
      }
    } else {
      console.log("Deal Contact Roles: (existing, skipped)")
    }
  } catch (e) { console.log(`Deal Contact Roles: ERROR — ${e.message}`) }

  // ─── 34. DealCompetitor ───
  try {
    const existingDC = await prisma.dealCompetitor.findFirst({
      where: { deal: { organizationId: orgId } },
    })
    if (!existingDC) {
      const orgDeals = await prisma.deal.findMany({ where: { organizationId: orgId }, take: 4 })
      if (orgDeals.length >= 2) {
        const competitors = [
          { dealId: orgDeals[0].id, name: "Salesforce Health Cloud", product: "Health Cloud CRM", strengths: "Brand recognition, large ecosystem", weaknesses: "Expensive, complex customization", price: "$350,000", threat: "High" },
          { dealId: orgDeals[0].id, name: "Veeva Systems", product: "Veeva CRM", strengths: "Pharma-specific, FDA validated", weaknesses: "Vendor lock-in, limited flexibility", price: "$420,000", threat: "High" },
          { dealId: orgDeals[1].id, name: "SAP S/4HANA", product: "Digital Supply Chain", strengths: "Enterprise-grade, strong analytics", weaknesses: "Very long implementation, high TCO", price: "$800,000", threat: "Medium" },
          { dealId: orgDeals[2]?.id || orgDeals[1].id, name: "Oracle NetSuite", product: "NetSuite ERP", strengths: "Integrated suite, cloud-native", weaknesses: "Less pharma-specific, UI dated", price: "$250,000", threat: "Low" },
        ]
        for (const c of competitors) {
          await prisma.dealCompetitor.create({ data: c })
        }
        console.log(`Deal Competitors: ${competitors.length}`)
      } else {
        console.log("Deal Competitors: (insufficient deals, skipped)")
      }
    } else {
      console.log("Deal Competitors: (existing, skipped)")
    }
  } catch (e) { console.log(`Deal Competitors: ERROR — ${e.message}`) }

  // ─── 35. DealTeamMember ───
  try {
    const existingDTM = await prisma.dealTeamMember.findFirst({
      where: { deal: { organizationId: orgId } },
    })
    if (!existingDTM) {
      const orgDeals = await prisma.deal.findMany({ where: { organizationId: orgId }, take: 4 })
      const teamUsers = await prisma.user.findMany({ where: { organizationId: orgId }, take: 4 })
      if (orgDeals.length >= 2 && teamUsers.length >= 2) {
        const members = [
          { dealId: orgDeals[0].id, userId: teamUsers[0].id, role: "owner" },
          { dealId: orgDeals[0].id, userId: teamUsers[1]?.id || teamUsers[0].id, role: "technical_lead" },
          { dealId: orgDeals[1].id, userId: teamUsers[0].id, role: "owner" },
          { dealId: orgDeals[1].id, userId: teamUsers[2]?.id || teamUsers[0].id, role: "solution_architect" },
          { dealId: orgDeals[2]?.id || orgDeals[0].id, userId: teamUsers[0].id, role: "owner" },
        ]
        // Deduplicate by dealId+userId
        const seen = new Set()
        for (const m of members) {
          const key = `${m.dealId}_${m.userId}`
          if (!seen.has(key)) {
            seen.add(key)
            await prisma.dealTeamMember.create({ data: m })
          }
        }
        console.log(`Deal Team Members: ${seen.size}`)
      } else {
        console.log("Deal Team Members: (insufficient deals/users, skipped)")
      }
    } else {
      console.log("Deal Team Members: (existing, skipped)")
    }
  } catch (e) { console.log(`Deal Team Members: ERROR — ${e.message}`) }

  // ─── 36. LandingPage ───
  try {
    const existingLP = await prisma.landingPage.findFirst({ where: { organizationId: orgId } })
    if (!existingLP) {
      const pages = [
        { name: "Product Launch 2026", slug: "product-launch-2026", description: "Landing page for Clinical Suite 3.0 product launch", status: "published", publishedAt: new Date(now - 14 * DAY), totalViews: 1240, totalSubmissions: 87, metaTitle: "Clinical Suite 3.0 — Next-Gen Pharma CRM", metaDescription: "Discover the future of pharmaceutical CRM with AI-powered insights and compliance." },
        { name: "Free Trial Signup", slug: "free-trial", description: "14-day free trial registration page", status: "published", publishedAt: new Date(now - 30 * DAY), totalViews: 3560, totalSubmissions: 234, metaTitle: "Start Your Free Trial — LeadDrive CRM", metaDescription: "Try LeadDrive CRM free for 14 days. No credit card required." },
        { name: "Webinar Registration", slug: "webinar-q2", description: "Q2 webinar series registration page", status: "draft", totalViews: 0, totalSubmissions: 0, metaTitle: "AI in Drug Discovery Webinar — LeadDrive", metaDescription: "Register for our free webinar on leveraging AI in modern drug discovery pipelines." },
      ]
      for (const p of pages) {
        await prisma.landingPage.create({ data: { ...p, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Landing Pages: ${pages.length}`)
    } else {
      console.log("Landing Pages: (existing, skipped)")
    }
  } catch (e) { console.log(`Landing Pages: ERROR — ${e.message}`) }

  // ─── 37. FormSubmission ───
  try {
    const existingFS = await prisma.formSubmission.findFirst({ where: { organizationId: orgId } })
    if (!existingFS) {
      const lp = await prisma.landingPage.findFirst({ where: { organizationId: orgId, slug: "free-trial" } })
      const lp2 = await prisma.landingPage.findFirst({ where: { organizationId: orgId, slug: "product-launch-2026" } })
      const submissions = [
        { landingPageId: lp?.id || null, formData: { name: "Dr. Henrik Johansson", email: "h.johansson@scandipharma.se", company: "ScandiPharma AB", role: "CTO", interest: "Clinical Suite" }, source: "organic", ipAddress: "185.22.45.100" },
        { landingPageId: lp?.id || null, formData: { name: "Amira Hassan", email: "a.hassan@cairobiotech.eg", company: "Cairo Biotech", role: "IT Director", interest: "Free Trial" }, source: "linkedin_ad", ipAddress: "102.176.90.55" },
        { landingPageId: lp2?.id || null, formData: { name: "Liam O'Brien", email: "l.obrien@emeraldpharma.ie", company: "Emerald Pharma", role: "VP Sales", interest: "Product Launch" }, source: "email_campaign", ipAddress: "86.45.120.33" },
        { landingPageId: lp2?.id || null, formData: { name: "Yuki Nakamura", email: "y.nakamura@tokyomed.jp", company: "TokyoMed Research", role: "Lab Director", interest: "Product Demo" }, source: "google_ads", ipAddress: "203.141.55.22" },
      ]
      for (const s of submissions) {
        await prisma.formSubmission.create({ data: { ...s, organizationId: orgId } })
      }
      console.log(`Form Submissions: ${submissions.length}`)
    } else {
      console.log("Form Submissions: (existing, skipped)")
    }
  } catch (e) { console.log(`Form Submissions: ERROR — ${e.message}`) }

  // ─── 38. ContactEvent ───
  try {
    const existingCE = await prisma.contactEvent.findFirst({ where: { organizationId: orgId } })
    if (!existingCE) {
      const events = [
        { contactId: createdContacts[0].id, eventType: "page_view", eventData: { url: "/products/clinical-suite", duration: 245 }, source: "website", score: 5 },
        { contactId: createdContacts[0].id, eventType: "email_open", eventData: { campaignName: "Q2 Product Launch", subject: "Clinical Suite 3.0" }, source: "email", score: 10 },
        { contactId: createdContacts[1].id, eventType: "email_click", eventData: { campaignName: "Q2 Product Launch", link: "/demo-request" }, source: "email", score: 15 },
        { contactId: createdContacts[2].id, eventType: "form_submit", eventData: { formName: "Demo Request", fields: { interest: "Procurement Platform" } }, source: "website", score: 25 },
        { contactId: createdContacts[3].id, eventType: "page_view", eventData: { url: "/pricing", duration: 180 }, source: "website", score: 5 },
        { contactId: createdContacts[4].id, eventType: "meeting_attended", eventData: { meetingType: "Demo", duration: 60, attendees: 3 }, source: "calendar", score: 30 },
        { contactId: createdContacts[5].id, eventType: "email_open", eventData: { campaignName: "Customer Success Stories", subject: "How Merck saved 40%" }, source: "email", score: 10 },
        { contactId: createdContacts[8].id, eventType: "email_click", eventData: { campaignName: "Webinar Invite", link: "/register/ai-webinar" }, source: "email", score: 15 },
      ]
      for (const ev of events) {
        await prisma.contactEvent.create({ data: { ...ev, organizationId: orgId } })
      }
      console.log(`Contact Events: ${events.length}`)
    } else {
      console.log("Contact Events: (existing, skipped)")
    }
  } catch (e) { console.log(`Contact Events: ERROR — ${e.message}`) }

  // ─── 39. EmailLog ───
  try {
    const existingEL = await prisma.emailLog.findFirst({ where: { organizationId: orgId } })
    if (!existingEL) {
      const logs = [
        { direction: "outbound", fromEmail: `noreply@${slug}.leaddrivecrm.org`, toEmail: "j.mitchell@pfizer.com", subject: "Pfizer CRM Integration — Next Steps", status: "delivered", contactId: createdContacts[0].id, sentBy: user.id, openedAt: new Date(now - 2 * DAY) },
        { direction: "outbound", fromEmail: `noreply@${slug}.leaddrivecrm.org`, toEmail: "s.dubois@roche.com", subject: "Roche Digital Transformation Proposal", status: "opened", contactId: createdContacts[1].id, sentBy: user.id, openedAt: new Date(now - 1 * DAY) },
        { direction: "outbound", fromEmail: `noreply@${slug}.leaddrivecrm.org`, toEmail: "m.bernasconi@novartis.com", subject: "Novartis Q1 License Renewal", status: "clicked", contactId: createdContacts[2].id, sentBy: user.id, openedAt: new Date(now - 3 * DAY), clickedAt: new Date(now - 3 * DAY + 300000) },
        { direction: "outbound", fromEmail: `noreply@${slug}.leaddrivecrm.org`, toEmail: "e.watson@astrazeneca.com", subject: "AstraZeneca — Data Analytics Platform Overview", status: "sent", contactId: createdContacts[3].id, sentBy: user.id },
        { direction: "outbound", fromEmail: `noreply@${slug}.leaddrivecrm.org`, toEmail: "r.kim@merck.com", subject: "Merck Lab Management — Phase 2 SOW", status: "delivered", contactId: createdContacts[4].id, sentBy: user.id },
        { direction: "outbound", fromEmail: `noreply@${slug}.leaddrivecrm.org`, toEmail: "a.schneider@biogenesislabs.com", subject: "BioGenesis LIMS — Board Presentation Materials", status: "opened", contactId: createdContacts[5].id, sentBy: user.id, openedAt: new Date(now - 4 * DAY) },
      ]
      for (const l of logs) {
        await prisma.emailLog.create({ data: { ...l, organizationId: orgId } })
      }
      console.log(`Email Logs: ${logs.length}`)
    } else {
      console.log("Email Logs: (existing, skipped)")
    }
  } catch (e) { console.log(`Email Logs: ERROR — ${e.message}`) }

  // ─── 40. CampaignVariant ───
  try {
    const existingCV = await prisma.campaignVariant.findFirst({
      where: { campaign: { organizationId: orgId } },
    })
    if (!existingCV) {
      const firstCampaign = await prisma.campaign.findFirst({ where: { organizationId: orgId } })
      if (firstCampaign) {
        const variants = [
          { campaignId: firstCampaign.id, name: "Subject A — Feature Focused", subject: "Introducing Clinical Suite 3.0 — AI-Powered Insights", percentage: 40, totalSent: 940, totalOpened: 420, totalClicked: 145, totalBounced: 12 },
          { campaignId: firstCampaign.id, name: "Subject B — Benefit Focused", subject: "Cut Clinical Trial Costs by 30% with Clinical Suite 3.0", percentage: 40, totalSent: 940, totalOpened: 380, totalClicked: 128, totalBounced: 8, isWinner: true },
          { campaignId: firstCampaign.id, name: "Control", subject: "Clinical Suite 3.0 Now Available", percentage: 20, totalSent: 470, totalOpened: 180, totalClicked: 39, totalBounced: 5 },
        ]
        for (const v of variants) {
          await prisma.campaignVariant.create({ data: v })
        }
        console.log(`Campaign Variants: ${variants.length}`)
      } else {
        console.log("Campaign Variants: (no campaigns found, skipped)")
      }
    } else {
      console.log("Campaign Variants: (existing, skipped)")
    }
  } catch (e) { console.log(`Campaign Variants: ERROR — ${e.message}`) }

  // ─── 41. InvoicePayment ───
  try {
    const existingIP = await prisma.invoicePayment.findFirst({ where: { organizationId: orgId } })
    if (!existingIP) {
      const paidInvoices = await prisma.invoice.findMany({ where: { organizationId: orgId, status: "paid" }, take: 3 })
      if (paidInvoices.length > 0) {
        const payments = [
          { invoiceId: paidInvoices[0].id, amount: paidInvoices[0].totalAmount, currency: paidInvoices[0].currency || "USD", paymentMethod: "bank_transfer", paymentDate: new Date(now - 28 * DAY), reference: "TXN-2026-00481", notes: "Payment received via wire transfer" },
          { invoiceId: paidInvoices[1]?.id || paidInvoices[0].id, amount: paidInvoices[1]?.totalAmount || 50000, currency: paidInvoices[1]?.currency || "USD", paymentMethod: "bank_transfer", paymentDate: new Date(now - 12 * DAY), reference: "TXN-2026-00523", notes: "Full payment received" },
          { invoiceId: paidInvoices[2]?.id || paidInvoices[0].id, amount: paidInvoices[2]?.totalAmount || 30000, currency: paidInvoices[2]?.currency || "EUR", paymentMethod: "bank_transfer", paymentDate: new Date(now - 55 * DAY), reference: "TXN-2026-00389", notes: "Final milestone payment" },
        ]
        for (const p of payments) {
          await prisma.invoicePayment.create({ data: { ...p, organizationId: orgId, createdBy: user.id } })
        }
        console.log(`Invoice Payments: ${payments.length}`)
      } else {
        console.log("Invoice Payments: (no paid invoices, skipped)")
      }
    } else {
      console.log("Invoice Payments: (existing, skipped)")
    }
  } catch (e) { console.log(`Invoice Payments: ERROR — ${e.message}`) }

  // ─── 42. BillPayment ───
  try {
    const existingBP = await prisma.billPayment.findFirst({ where: { organizationId: orgId } })
    if (!existingBP) {
      const paidBills = await prisma.bill.findMany({ where: { organizationId: orgId, status: "paid" }, take: 2 })
      if (paidBills.length > 0) {
        const payments = [
          { billId: paidBills[0].id, amount: paidBills[0].totalAmount, currency: paidBills[0].currency || "USD", paymentMethod: "bank_transfer", paymentDate: new Date(now - 14 * DAY), reference: "BP-2026-001", notes: "Paid via auto-debit" },
          { billId: paidBills[1]?.id || paidBills[0].id, amount: paidBills[1]?.totalAmount || 1680, currency: paidBills[1]?.currency || "USD", paymentMethod: "credit_card", paymentDate: new Date(now - 44 * DAY), reference: "BP-2026-002", notes: "Annual license payment" },
        ]
        for (const p of payments) {
          await prisma.billPayment.create({ data: { ...p, organizationId: orgId, createdBy: user.id } })
        }
        console.log(`Bill Payments: ${payments.length}`)
      } else {
        console.log("Bill Payments: (no paid bills, skipped)")
      }
    } else {
      console.log("Bill Payments: (existing, skipped)")
    }
  } catch (e) { console.log(`Bill Payments: ERROR — ${e.message}`) }

  // ─── 43. FundTransaction ───
  try {
    const existingFT = await prisma.fundTransaction.findFirst({ where: { organizationId: orgId } })
    if (!existingFT) {
      const orgFunds = await prisma.fund.findMany({ where: { organizationId: orgId }, take: 3 })
      if (orgFunds.length > 0) {
        const txns = [
          { fundId: orgFunds[0].id, type: "deposit", amount: 12000, description: "Quarterly tax provision — Q1 2026", relatedType: "manual" },
          { fundId: orgFunds[0].id, type: "deposit", amount: 15000, description: "Quarterly tax provision — Q2 estimate", relatedType: "manual" },
          { fundId: orgFunds[1]?.id || orgFunds[0].id, type: "deposit", amount: 45000, description: "January payroll buffer allocation", relatedType: "rule" },
          { fundId: orgFunds[1]?.id || orgFunds[0].id, type: "withdrawal", amount: 32000, description: "February payroll disbursement", relatedType: "manual" },
          { fundId: orgFunds[2]?.id || orgFunds[0].id, type: "deposit", amount: 15600, description: "R&D budget allocation — Clinical Suite 3.0", relatedType: "manual" },
        ]
        for (const t of txns) {
          await prisma.fundTransaction.create({ data: { ...t, organizationId: orgId, createdBy: user.id } })
        }
        console.log(`Fund Transactions: ${txns.length}`)
      } else {
        console.log("Fund Transactions: (no funds found, skipped)")
      }
    } else {
      console.log("Fund Transactions: (existing, skipped)")
    }
  } catch (e) { console.log(`Fund Transactions: ERROR — ${e.message}`) }

  // ─── 44. PaymentOrder ───
  try {
    const existingPO = await prisma.paymentOrder.findFirst({ where: { organizationId: orgId } })
    if (!existingPO) {
      const orders = [
        { orderNumber: "PO-2026-001", counterpartyName: "AWS", amount: 8450, currency: "USD", purpose: "Cloud infrastructure payment — March 2026", paymentMethod: "bank_transfer", status: "executed", createdBy: user.id, approvedBy: user.id, approvedAt: new Date(now - 15 * DAY), executedAt: new Date(now - 14 * DAY) },
        { orderNumber: "PO-2026-002", counterpartyName: "WeWork Warsaw", amount: 4200, currency: "EUR", purpose: "Office rent — April 2026", paymentMethod: "bank_transfer", status: "approved", createdBy: user.id, approvedBy: user.id, approvedAt: new Date(now - 2 * DAY) },
        { orderNumber: "PO-2026-003", counterpartyName: "Hetzner Online GmbH", amount: 2890, currency: "EUR", purpose: "Dedicated servers — Q2 2026", paymentMethod: "bank_transfer", status: "draft", createdBy: user.id },
      ]
      for (const o of orders) {
        await prisma.paymentOrder.create({ data: { ...o, organizationId: orgId } })
      }
      console.log(`Payment Orders: ${orders.length}`)
    } else {
      console.log("Payment Orders: (existing, skipped)")
    }
  } catch (e) { console.log(`Payment Orders: ERROR — ${e.message}`) }

  // ─── 45. RecurringInvoice + Items ───
  try {
    const existingRI = await prisma.recurringInvoice.findFirst({ where: { organizationId: orgId } })
    if (!existingRI) {
      const ri1 = await prisma.recurringInvoice.create({
        data: {
          organizationId: orgId,
          title: "Novartis — Monthly License Fee",
          titleTemplate: "Novartis License — {month} {year}",
          companyId: createdCompanies[2].id,
          contactId: createdContacts[2].id,
          frequency: "monthly",
          intervalCount: 1,
          startDate: new Date(now - 90 * DAY),
          nextRunDate: new Date(now + 20 * DAY),
          lastRunDate: new Date(now - 10 * DAY),
          totalGenerated: 3,
          currency: "EUR",
          taxRate: 0,
          paymentTerms: "net30",
          dayOfMonth: 1,
          isActive: true,
          createdBy: user.id,
        },
      })
      await prisma.recurringInvoiceItem.create({
        data: { recurringInvoiceId: ri1.id, name: "Procurement Platform License — Monthly", quantity: 1, unitPrice: 16250, sortOrder: 0 },
      })

      const ri2 = await prisma.recurringInvoice.create({
        data: {
          organizationId: orgId,
          title: "Merck — Quarterly Support",
          titleTemplate: "Merck Support — Q{quarter} {year}",
          companyId: createdCompanies[4].id,
          contactId: createdContacts[4].id,
          frequency: "quarterly",
          intervalCount: 1,
          startDate: new Date(now - 60 * DAY),
          nextRunDate: new Date(now + 30 * DAY),
          lastRunDate: new Date(now - 60 * DAY),
          totalGenerated: 1,
          currency: "USD",
          taxRate: 0,
          paymentTerms: "net30",
          dayOfMonth: 15,
          isActive: true,
          createdBy: user.id,
        },
      })
      await prisma.recurringInvoiceItem.create({
        data: { recurringInvoiceId: ri2.id, name: "Lab Management System — Premium Support", quantity: 1, unitPrice: 12500, sortOrder: 0 },
      })
      await prisma.recurringInvoiceItem.create({
        data: { recurringInvoiceId: ri2.id, name: "System Monitoring & Maintenance", quantity: 1, unitPrice: 3500, sortOrder: 1 },
      })
      console.log("Recurring Invoices: 2 (with items)")
    } else {
      console.log("Recurring Invoices: (existing, skipped)")
    }
  } catch (e) { console.log(`Recurring Invoices: ERROR — ${e.message}`) }

  // ─── 46. CashFlowEntry ───
  try {
    const existingCFE = await prisma.cashFlowEntry.findFirst({ where: { organizationId: orgId } })
    if (!existingCFE) {
      const entries = [
        { year: 2026, month: 1, entryType: "inflow", source: "invoice", amount: 185000, currencyCode: "USD", description: "January service revenue", isProjected: false, activityType: "operating", category: "revenue", plannedAmount: 200000 },
        { year: 2026, month: 1, entryType: "outflow", source: "manual", amount: 98000, currencyCode: "USD", description: "January payroll", isProjected: false, activityType: "operating", category: "salary", plannedAmount: 100000 },
        { year: 2026, month: 2, entryType: "inflow", source: "invoice", amount: 220000, currencyCode: "USD", description: "February service revenue", isProjected: false, activityType: "operating", category: "revenue", plannedAmount: 210000 },
        { year: 2026, month: 2, entryType: "outflow", source: "manual", amount: 102000, currencyCode: "USD", description: "February payroll", isProjected: false, activityType: "operating", category: "salary", plannedAmount: 100000 },
        { year: 2026, month: 3, entryType: "inflow", source: "invoice", amount: 195000, currencyCode: "USD", description: "March service revenue", isProjected: false, activityType: "operating", category: "revenue", plannedAmount: 215000 },
        { year: 2026, month: 3, entryType: "outflow", source: "manual", amount: 35000, currencyCode: "USD", description: "Server hardware purchase", isProjected: false, activityType: "investing", category: "capex", plannedAmount: 30000 },
        { year: 2026, month: 4, entryType: "inflow", source: "budget_line", amount: 250000, currencyCode: "USD", description: "April projected revenue", isProjected: true, activityType: "operating", category: "revenue", plannedAmount: 250000 },
        { year: 2026, month: 4, entryType: "outflow", source: "budget_line", amount: 110000, currencyCode: "USD", description: "April projected payroll", isProjected: true, activityType: "operating", category: "salary", plannedAmount: 110000 },
      ]
      for (const e of entries) {
        await prisma.cashFlowEntry.create({ data: { ...e, organizationId: orgId } })
      }
      console.log(`Cash Flow Entries: ${entries.length}`)
    } else {
      console.log("Cash Flow Entries: (existing, skipped)")
    }
  } catch (e) { console.log(`Cash Flow Entries: ERROR — ${e.message}`) }

  // ─── 47. DashboardLayout ───
  try {
    const existingDL = await prisma.dashboardLayout.findFirst({ where: { organizationId: orgId } })
    if (!existingDL) {
      await prisma.dashboardLayout.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          name: "Default",
          isDefault: true,
          layout: [
            { id: "revenue_chart", x: 0, y: 0, w: 6, h: 4, type: "chart", title: "Revenue Overview" },
            { id: "deal_pipeline", x: 6, y: 0, w: 6, h: 4, type: "pipeline", title: "Deal Pipeline" },
            { id: "tasks_widget", x: 0, y: 4, w: 4, h: 3, type: "tasks", title: "My Tasks" },
            { id: "recent_activity", x: 4, y: 4, w: 4, h: 3, type: "activity", title: "Recent Activity" },
            { id: "kpi_cards", x: 8, y: 4, w: 4, h: 3, type: "kpi", title: "Key Metrics" },
          ],
        },
      })
      console.log("Dashboard Layout: 1")
    } else {
      console.log("Dashboard Layout: (existing, skipped)")
    }
  } catch (e) { console.log(`Dashboard Layout: ERROR — ${e.message}`) }

  // ─── 48. BudgetCostType ───
  try {
    const existingBCT = await prisma.budgetCostType.findFirst({ where: { organizationId: orgId } })
    if (!existingBCT) {
      const costTypes = [
        { key: "labor", label: "Personnel & Salaries", costModelPattern: "serviceDetails.{dept}.directLabor", isShared: false, allocationMethod: "proportional", color: "#3b82f6", sortOrder: 0 },
        { key: "overhead_admin", label: "Admin & Overhead", costModelPattern: null, isShared: true, allocationMethod: "fixed", color: "#f59e0b", sortOrder: 1 },
        { key: "software", label: "Software & Licenses", costModelPattern: null, isShared: true, allocationMethod: "proportional", color: "#10b981", sortOrder: 2 },
        { key: "cloud", label: "Cloud Infrastructure", costModelPattern: "serviceDetails.{dept}.cloudCost", isShared: false, allocationMethod: "proportional", color: "#8b5cf6", sortOrder: 3 },
        { key: "misc", label: "Miscellaneous", costModelPattern: null, isShared: true, allocationMethod: null, color: "#6b7280", sortOrder: 4 },
      ]
      for (const ct of costTypes) {
        await prisma.budgetCostType.create({ data: { ...ct, organizationId: orgId } })
      }
      console.log(`Budget Cost Types: ${costTypes.length}`)
    } else {
      console.log("Budget Cost Types: (existing, skipped)")
    }
  } catch (e) { console.log(`Budget Cost Types: ERROR — ${e.message}`) }

  // ─── 49. BudgetSection ───
  try {
    const existingBS = await prisma.budgetSection.findFirst({ where: { organizationId: orgId } })
    if (!existingBS) {
      const budgetPlan = await prisma.budgetPlan.findFirst({ where: { organizationId: orgId } })
      if (budgetPlan) {
        const sections = [
          { planId: budgetPlan.id, name: "Revenue", sectionType: "revenue", sortOrder: 0 },
          { planId: budgetPlan.id, name: "Operating Expenses", sectionType: "expense", sortOrder: 1 },
          { planId: budgetPlan.id, name: "EBITDA", sectionType: "ebitda", sortOrder: 2 },
        ]
        for (const s of sections) {
          await prisma.budgetSection.create({ data: { ...s, organizationId: orgId } })
        }
        console.log(`Budget Sections: ${sections.length}`)
      } else {
        console.log("Budget Sections: (no budget plan, skipped)")
      }
    } else {
      console.log("Budget Sections: (existing, skipped)")
    }
  } catch (e) { console.log(`Budget Sections: ERROR — ${e.message}`) }

  // ─── 50. BudgetActual ───
  try {
    const existingBA = await prisma.budgetActual.findFirst({ where: { organizationId: orgId } })
    if (!existingBA) {
      const budgetPlan = await prisma.budgetPlan.findFirst({ where: { organizationId: orgId } })
      if (budgetPlan) {
        const actuals = [
          { planId: budgetPlan.id, category: "Personnel & Salaries", lineType: "expense", actualAmount: 105000, expenseDate: "2026-01", description: "January payroll actual" },
          { planId: budgetPlan.id, category: "Personnel & Salaries", lineType: "expense", actualAmount: 102000, expenseDate: "2026-02", description: "February payroll actual" },
          { planId: budgetPlan.id, category: "Cloud Infrastructure", lineType: "expense", actualAmount: 8200, expenseDate: "2026-01", description: "January AWS + Hetzner" },
          { planId: budgetPlan.id, category: "Cloud Infrastructure", lineType: "expense", actualAmount: 8750, expenseDate: "2026-02", description: "February AWS + Hetzner (scaling increase)" },
          { planId: budgetPlan.id, category: "Service Revenue", lineType: "revenue", actualAmount: 285000, expenseDate: "2026-01", description: "January service revenue actual" },
          { planId: budgetPlan.id, category: "Service Revenue", lineType: "revenue", actualAmount: 310000, expenseDate: "2026-02", description: "February service revenue actual" },
        ]
        for (const a of actuals) {
          await prisma.budgetActual.create({ data: { ...a, organizationId: orgId } })
        }
        console.log(`Budget Actuals: ${actuals.length}`)
      } else {
        console.log("Budget Actuals: (no budget plan, skipped)")
      }
    } else {
      console.log("Budget Actuals: (existing, skipped)")
    }
  } catch (e) { console.log(`Budget Actuals: ERROR — ${e.message}`) }

  // ─── 51. ExpenseForecast ───
  try {
    const existingEF = await prisma.expenseForecast.findFirst({ where: { organizationId: orgId } })
    if (!existingEF) {
      const laborType = await prisma.budgetCostType.findFirst({ where: { organizationId: orgId, key: "labor" } })
      const cloudType = await prisma.budgetCostType.findFirst({ where: { organizationId: orgId, key: "cloud" } })
      if (laborType && cloudType) {
        const forecasts = [
          { costTypeId: laborType.id, year: 2026, month: 4, amount: 108000, notes: "Projected payroll — includes new hire" },
          { costTypeId: laborType.id, year: 2026, month: 5, amount: 110000, notes: "Projected payroll — full team" },
          { costTypeId: cloudType.id, year: 2026, month: 4, amount: 9200, notes: "Cloud cost increase — new staging environment" },
          { costTypeId: cloudType.id, year: 2026, month: 5, amount: 9500, notes: "Cloud cost — projected scaling for Clinical Suite launch" },
        ]
        for (const f of forecasts) {
          await prisma.expenseForecast.create({ data: { ...f, organizationId: orgId } })
        }
        console.log(`Expense Forecasts: ${forecasts.length}`)
      } else {
        console.log("Expense Forecasts: (no cost types found, skipped)")
      }
    } else {
      console.log("Expense Forecasts: (existing, skipped)")
    }
  } catch (e) { console.log(`Expense Forecasts: ERROR — ${e.message}`) }

  // ─── 52. CostEmployee ───
  try {
    const existingCEmp = await prisma.costEmployee.findFirst({ where: { organizationId: orgId } })
    if (!existingCEmp) {
      const employees = [
        { department: "IT", position: "Senior Developer", count: 12, netSalary: 4500, grossSalary: 5800, superGross: 6900, inOverhead: false },
        { department: "IT", position: "Junior Developer", count: 8, netSalary: 2800, grossSalary: 3600, superGross: 4300, inOverhead: false },
        { department: "InfoSec", position: "Security Engineer", count: 4, netSalary: 5200, grossSalary: 6700, superGross: 8000, inOverhead: false },
        { department: "PM", position: "Project Manager", count: 5, netSalary: 4800, grossSalary: 6200, superGross: 7400, inOverhead: false },
        { department: "BackOffice", position: "HR & Admin", count: 3, netSalary: 3200, grossSalary: 4100, superGross: 4900, inOverhead: true },
        { department: "BackOffice", position: "Finance & Accounting", count: 2, netSalary: 3800, grossSalary: 4900, superGross: 5800, inOverhead: true },
      ]
      for (const emp of employees) {
        await prisma.costEmployee.create({ data: { ...emp, organizationId: orgId } })
      }
      console.log(`Cost Employees: ${employees.length}`)
    } else {
      console.log("Cost Employees: (existing, skipped)")
    }
  } catch (e) { console.log(`Cost Employees: ERROR — ${e.message}`) }

  // ─── 53. ClientService ───
  try {
    const existingCS = await prisma.clientService.findFirst({ where: { organizationId: orgId } })
    if (!existingCS) {
      const services = [
        { companyId: createdCompanies[0].id, serviceType: "permanent_it", monthlyRevenue: 28500, isActive: true, notes: "CRM integration support team — 6 FTE" },
        { companyId: createdCompanies[2].id, serviceType: "permanent_it", monthlyRevenue: 16250, isActive: true, notes: "Procurement platform maintenance — 3 FTE" },
        { companyId: createdCompanies[4].id, serviceType: "permanent_it", monthlyRevenue: 34000, isActive: true, notes: "Lab management system — 8 FTE" },
        { companyId: createdCompanies[4].id, serviceType: "infosec", monthlyRevenue: 8500, isActive: true, notes: "GxP compliance monitoring" },
        { companyId: createdCompanies[10].id, serviceType: "helpdesk", monthlyRevenue: 5500, isActive: true, notes: "Clinical portal L1/L2 support" },
      ]
      for (const s of services) {
        await prisma.clientService.create({ data: { ...s, organizationId: orgId } })
      }
      console.log(`Client Services: ${services.length}`)
    } else {
      console.log("Client Services: (existing, skipped)")
    }
  } catch (e) { console.log(`Client Services: ERROR — ${e.message}`) }

  // ─── 54. CostModelSnapshot ───
  try {
    const existingCMS = await prisma.costModelSnapshot.findFirst({ where: { organizationId: orgId } })
    if (!existingCMS) {
      const snapshots = [
        { snapshotMonth: "2026-02", totalCost: 185000, totalRevenue: 310000, margin: 125000, marginPct: 40.3, overheadTotal: 42000, employeeCost: 143000, profitableClients: 4, lossClients: 0, dataJson: { departments: { IT: { cost: 95000, revenue: 180000 }, InfoSec: { cost: 32000, revenue: 42000 }, PM: { cost: 37000, revenue: 55000 } } } },
        { snapshotMonth: "2026-03", totalCost: 192000, totalRevenue: 325000, margin: 133000, marginPct: 40.9, overheadTotal: 44000, employeeCost: 148000, profitableClients: 5, lossClients: 0, dataJson: { departments: { IT: { cost: 98000, revenue: 195000 }, InfoSec: { cost: 34000, revenue: 45000 }, PM: { cost: 38000, revenue: 58000 } } } },
      ]
      for (const s of snapshots) {
        await prisma.costModelSnapshot.create({ data: { ...s, organizationId: orgId } })
      }
      console.log(`Cost Model Snapshots: ${snapshots.length}`)
    } else {
      console.log("Cost Model Snapshots: (existing, skipped)")
    }
  } catch (e) { console.log(`Cost Model Snapshots: ERROR — ${e.message}`) }

  // ─── 55. MTM Module ───
  try {
    const existingMtmAgent = await prisma.mtmAgent.findFirst({ where: { organizationId: orgId } })
    if (!existingMtmAgent) {
      const teamUsers = await prisma.user.findMany({ where: { organizationId: orgId }, take: 4 })

      // MtmAgent — 3 agents
      const agent1 = await prisma.mtmAgent.create({
        data: { organizationId: orgId, userId: teamUsers[1]?.id || null, name: "Sarah Johnson", email: `sarah@${slug}.com`, phone: "+48 500 111 001", role: "MANAGER", status: "ACTIVE", isOnline: true, lastSeenAt: new Date() },
      })
      const agent2 = await prisma.mtmAgent.create({
        data: { organizationId: orgId, userId: teamUsers[2]?.id || null, name: "Alex Chen", email: `alex@${slug}.com`, phone: "+48 500 111 002", role: "AGENT", status: "ACTIVE", managerId: agent1.id, isOnline: true, lastSeenAt: new Date(now - 15 * 60000) },
      })
      const agent3 = await prisma.mtmAgent.create({
        data: { organizationId: orgId, userId: teamUsers[3]?.id || null, name: "Maria Lopez", email: `maria@${slug}.com`, phone: "+48 500 111 003", role: "AGENT", status: "ACTIVE", managerId: agent1.id, isOnline: false, lastSeenAt: new Date(now - 2 * 60 * 60000) },
      })
      console.log("MTM Agents: 3")

      // MtmCustomer — 6 customers
      const mtmCustomers = [
        { code: "PH-001", name: "Central Pharmacy Mokotow", category: "A", status: "ACTIVE", address: "ul. Pulawska 45", city: "Warsaw", district: "Mokotow", latitude: 52.1935, longitude: 21.0044, phone: "+48 22 111 0001", contactPerson: "Jan Wiśniewski" },
        { code: "PH-002", name: "Apteka Zdrowie Plus", category: "A", status: "ACTIVE", address: "ul. Marszałkowska 100", city: "Warsaw", district: "Śródmieście", latitude: 52.2297, longitude: 21.0122, phone: "+48 22 111 0002", contactPerson: "Anna Kowalczyk" },
        { code: "PH-003", name: "PharmaCare Express", category: "B", status: "ACTIVE", address: "ul. Nowy Świat 22", city: "Warsaw", district: "Śródmieście", latitude: 52.2319, longitude: 21.0198, phone: "+48 22 111 0003", contactPerson: "Piotr Lewandowski" },
        { code: "ST-001", name: "MedSupply Warehouse", category: "B", status: "ACTIVE", address: "ul. Prosta 69", city: "Warsaw", district: "Wola", latitude: 52.2325, longitude: 20.9858, phone: "+48 22 111 0004", contactPerson: "Marta Zielińska" },
        { code: "ST-002", name: "HealthMart Ursynów", category: "C", status: "ACTIVE", address: "ul. KEN 84", city: "Warsaw", district: "Ursynów", latitude: 52.1527, longitude: 21.0456, phone: "+48 22 111 0005", contactPerson: "Tomasz Wójcik" },
        { code: "PH-004", name: "Apteka Nowa", category: "C", status: "PROSPECT", address: "ul. Grójecka 128", city: "Warsaw", district: "Ochota", latitude: 52.2133, longitude: 20.9645, phone: "+48 22 111 0006", contactPerson: "Katarzyna Nowak" },
      ]
      const createdMtmCustomers = []
      for (const c of mtmCustomers) {
        const created = await prisma.mtmCustomer.create({ data: { ...c, organizationId: orgId } })
        createdMtmCustomers.push(created)
      }
      console.log(`MTM Customers: ${mtmCustomers.length}`)

      // MtmRoute — 3 routes with points
      const routeDate1 = new Date()
      routeDate1.setHours(0, 0, 0, 0)
      const routeDate2 = new Date(now + DAY)
      routeDate2.setHours(0, 0, 0, 0)
      const routeDate3 = new Date(now - DAY)
      routeDate3.setHours(0, 0, 0, 0)

      const route1 = await prisma.mtmRoute.create({
        data: { organizationId: orgId, agentId: agent2.id, date: routeDate1, name: "Warsaw Central — Today", status: "IN_PROGRESS", totalPoints: 4, visitedPoints: 2, startedAt: new Date(now - 3 * 60 * 60000) },
      })
      const route1Points = [
        { routeId: route1.id, customerId: createdMtmCustomers[0].id, orderIndex: 0, status: "VISITED", plannedTime: new Date(now - 3 * 60 * 60000), visitedAt: new Date(now - 2.5 * 60 * 60000) },
        { routeId: route1.id, customerId: createdMtmCustomers[1].id, orderIndex: 1, status: "VISITED", plannedTime: new Date(now - 2 * 60 * 60000), visitedAt: new Date(now - 1.5 * 60 * 60000) },
        { routeId: route1.id, customerId: createdMtmCustomers[2].id, orderIndex: 2, status: "PENDING", plannedTime: new Date(now + 1 * 60 * 60000) },
        { routeId: route1.id, customerId: createdMtmCustomers[3].id, orderIndex: 3, status: "PENDING", plannedTime: new Date(now + 2 * 60 * 60000) },
      ]
      for (const p of route1Points) {
        await prisma.mtmRoutePoint.create({ data: p })
      }

      const route2 = await prisma.mtmRoute.create({
        data: { organizationId: orgId, agentId: agent3.id, date: routeDate1, name: "South Warsaw", status: "PLANNED", totalPoints: 4, visitedPoints: 0 },
      })
      const route2Points = [
        { routeId: route2.id, customerId: createdMtmCustomers[4].id, orderIndex: 0, status: "PENDING", plannedTime: new Date(now + 1 * 60 * 60000) },
        { routeId: route2.id, customerId: createdMtmCustomers[5].id, orderIndex: 1, status: "PENDING", plannedTime: new Date(now + 2 * 60 * 60000) },
        { routeId: route2.id, customerId: createdMtmCustomers[0].id, orderIndex: 2, status: "PENDING", plannedTime: new Date(now + 3 * 60 * 60000) },
        { routeId: route2.id, customerId: createdMtmCustomers[1].id, orderIndex: 3, status: "PENDING", plannedTime: new Date(now + 4 * 60 * 60000) },
      ]
      for (const p of route2Points) {
        await prisma.mtmRoutePoint.create({ data: p })
      }

      const route3 = await prisma.mtmRoute.create({
        data: { organizationId: orgId, agentId: agent2.id, date: routeDate3, name: "Warsaw Central — Yesterday", status: "COMPLETED", totalPoints: 4, visitedPoints: 4, startedAt: new Date(now - 27 * 60 * 60000), completedAt: new Date(now - 20 * 60 * 60000) },
      })
      const route3Points = [
        { routeId: route3.id, customerId: createdMtmCustomers[2].id, orderIndex: 0, status: "VISITED", visitedAt: new Date(now - 26 * 60 * 60000) },
        { routeId: route3.id, customerId: createdMtmCustomers[3].id, orderIndex: 1, status: "VISITED", visitedAt: new Date(now - 25 * 60 * 60000) },
        { routeId: route3.id, customerId: createdMtmCustomers[4].id, orderIndex: 2, status: "VISITED", visitedAt: new Date(now - 23 * 60 * 60000) },
        { routeId: route3.id, customerId: createdMtmCustomers[5].id, orderIndex: 3, status: "VISITED", visitedAt: new Date(now - 21 * 60 * 60000) },
      ]
      for (const p of route3Points) {
        await prisma.mtmRoutePoint.create({ data: p })
      }
      console.log("MTM Routes: 3 (with 12 points)")

      // MtmVisit — 8 visits
      const mtmVisits = [
        { agentId: agent2.id, customerId: createdMtmCustomers[0].id, status: "CHECKED_OUT", checkInAt: new Date(now - 2.5 * 60 * 60000), checkOutAt: new Date(now - 2 * 60 * 60000), checkInLat: 52.1935, checkInLng: 21.0044, checkOutLat: 52.1936, checkOutLng: 21.0045, duration: 30, tasksCompleted: 2, tasksTotal: 2, notes: "Shelf check completed. Restocked display." },
        { agentId: agent2.id, customerId: createdMtmCustomers[1].id, status: "CHECKED_OUT", checkInAt: new Date(now - 1.5 * 60 * 60000), checkOutAt: new Date(now - 1 * 60 * 60000), checkInLat: 52.2297, checkInLng: 21.0122, checkOutLat: 52.2298, checkOutLng: 21.0123, duration: 30, tasksCompleted: 1, tasksTotal: 2, notes: "New order placed. Promo materials distributed." },
        { agentId: agent2.id, customerId: createdMtmCustomers[2].id, status: "CHECKED_OUT", checkInAt: new Date(now - 26 * 60 * 60000), checkOutAt: new Date(now - 25.5 * 60 * 60000), checkInLat: 52.2319, checkInLng: 21.0198, checkOutLat: 52.2320, checkOutLng: 21.0199, duration: 30, tasksCompleted: 2, tasksTotal: 2, notes: "Quarterly review completed." },
        { agentId: agent2.id, customerId: createdMtmCustomers[3].id, status: "CHECKED_OUT", checkInAt: new Date(now - 25 * 60 * 60000), checkOutAt: new Date(now - 24.5 * 60 * 60000), checkInLat: 52.2325, checkInLng: 20.9858, checkOutLat: 52.2326, checkOutLng: 20.9859, duration: 30, tasksCompleted: 1, tasksTotal: 1, notes: "Stock audit completed." },
        { agentId: agent3.id, customerId: createdMtmCustomers[4].id, status: "CHECKED_OUT", checkInAt: new Date(now - 25 * 60 * 60000), checkOutAt: new Date(now - 24 * 60 * 60000), checkInLat: 52.1527, checkInLng: 21.0456, checkOutLat: 52.1528, checkOutLng: 21.0457, duration: 60, tasksCompleted: 3, tasksTotal: 3, notes: "Full merchandising check." },
        { agentId: agent3.id, customerId: createdMtmCustomers[5].id, status: "CHECKED_OUT", checkInAt: new Date(now - 23 * 60 * 60000), checkOutAt: new Date(now - 22.5 * 60 * 60000), checkInLat: 52.2133, checkInLng: 20.9645, checkOutLat: 52.2134, checkOutLng: 20.9646, duration: 30, tasksCompleted: 1, tasksTotal: 2, notes: "Initial prospect visit." },
        { agentId: agent2.id, customerId: createdMtmCustomers[0].id, status: "CHECKED_OUT", checkInAt: new Date(now - 50 * 60 * 60000), checkOutAt: new Date(now - 49 * 60 * 60000), checkInLat: 52.1936, checkInLng: 21.0045, checkOutLat: 52.1937, checkOutLng: 21.0046, duration: 60, tasksCompleted: 3, tasksTotal: 3, notes: "Monthly review with manager." },
        { agentId: agent3.id, customerId: createdMtmCustomers[1].id, status: "CHECKED_OUT", checkInAt: new Date(now - 48 * 60 * 60000), checkOutAt: new Date(now - 47.5 * 60 * 60000), checkInLat: 52.2298, checkInLng: 21.0123, checkOutLat: 52.2299, checkOutLng: 21.0124, duration: 30, tasksCompleted: 2, tasksTotal: 2, notes: "Promo display setup." },
      ]
      const createdVisits = []
      for (const v of mtmVisits) {
        const created = await prisma.mtmVisit.create({ data: { ...v, organizationId: orgId } })
        createdVisits.push(created)
      }
      console.log(`MTM Visits: ${mtmVisits.length}`)

      // MtmTask — 6 tasks
      const mtmTasks = [
        { agentId: agent2.id, customerId: createdMtmCustomers[0].id, visitId: createdVisits[0].id, title: "Check shelf compliance", description: "Verify product placement matches planogram", status: "COMPLETED", priority: "HIGH", completedAt: new Date(now - 2.2 * 60 * 60000), result: "All products correctly placed. Photo attached." },
        { agentId: agent2.id, customerId: createdMtmCustomers[0].id, visitId: createdVisits[0].id, title: "Collect restock order", description: "Get restocking order from pharmacy manager", status: "COMPLETED", priority: "MEDIUM", completedAt: new Date(now - 2.1 * 60 * 60000), result: "Order collected: 50 units Product A, 30 units Product B." },
        { agentId: agent2.id, customerId: createdMtmCustomers[1].id, visitId: createdVisits[1].id, title: "Distribute promo materials", description: "Hand out Q2 promotional brochures and shelf talkers", status: "COMPLETED", priority: "MEDIUM", completedAt: new Date(now - 1.2 * 60 * 60000), result: "Materials distributed. Manager requested extra shelf talkers." },
        { agentId: agent2.id, customerId: createdMtmCustomers[2].id, title: "Quarterly review meeting", description: "Conduct Q1 performance review with store manager", status: "PENDING", priority: "HIGH", dueDate: new Date(now + 2 * 60 * 60000) },
        { agentId: agent3.id, customerId: createdMtmCustomers[4].id, title: "Merchandising audit", description: "Full audit of product displays and competitor presence", status: "PENDING", priority: "MEDIUM", dueDate: new Date(now + DAY) },
        { agentId: agent3.id, customerId: createdMtmCustomers[5].id, title: "New customer onboarding", description: "Complete onboarding checklist for new prospect", status: "IN_PROGRESS", priority: "LOW", dueDate: new Date(now + 3 * DAY) },
      ]
      for (const t of mtmTasks) {
        await prisma.mtmTask.create({ data: { ...t, organizationId: orgId } })
      }
      console.log(`MTM Tasks: ${mtmTasks.length}`)

      // MtmPhoto — 4 photos
      const mtmPhotos = [
        { agentId: agent2.id, visitId: createdVisits[0].id, url: "/placeholder.jpg", thumbnailUrl: "/placeholder.jpg", category: "shelf", status: "APPROVED", hasWatermark: true, latitude: 52.1935, longitude: 21.0044, reviewedBy: agent1.id, reviewedAt: new Date(now - 1 * 60 * 60000), likes: 2 },
        { agentId: agent2.id, visitId: createdVisits[0].id, url: "/placeholder.jpg", thumbnailUrl: "/placeholder.jpg", category: "display", status: "APPROVED", hasWatermark: true, latitude: 52.1935, longitude: 21.0044, reviewedBy: agent1.id, reviewedAt: new Date(now - 1 * 60 * 60000), likes: 1 },
        { agentId: agent2.id, visitId: createdVisits[1].id, url: "/placeholder.jpg", thumbnailUrl: "/placeholder.jpg", category: "promo", status: "PENDING", hasWatermark: true, latitude: 52.2297, longitude: 21.0122 },
        { agentId: agent3.id, visitId: createdVisits[4].id, url: "/placeholder.jpg", thumbnailUrl: "/placeholder.jpg", category: "shelf", status: "PENDING", hasWatermark: true, latitude: 52.1527, longitude: 21.0456 },
      ]
      for (const p of mtmPhotos) {
        await prisma.mtmPhoto.create({ data: { ...p, organizationId: orgId } })
      }
      console.log(`MTM Photos: ${mtmPhotos.length}`)

      // MtmOrder — 4 orders
      const mtmOrders = [
        { agentId: agent2.id, customerId: createdMtmCustomers[0].id, visitId: createdVisits[0].id, orderNumber: "MTM-ORD-001", status: "CONFIRMED", items: [{ sku: "PROD-A", name: "PharmaCare Vitamin D 1000IU", qty: 50, price: 12.50 }, { sku: "PROD-B", name: "PharmaCare Omega-3", qty: 30, price: 18.90 }], totalAmount: 1192, notes: "Restock order — urgent" },
        { agentId: agent2.id, customerId: createdMtmCustomers[1].id, visitId: createdVisits[1].id, orderNumber: "MTM-ORD-002", status: "CONFIRMED", items: [{ sku: "PROD-C", name: "PharmaCare Multivitamin", qty: 40, price: 15.00 }, { sku: "PROD-A", name: "PharmaCare Vitamin D 1000IU", qty: 25, price: 12.50 }], totalAmount: 912.50, notes: "Standard monthly order" },
        { agentId: agent3.id, customerId: createdMtmCustomers[4].id, visitId: createdVisits[4].id, orderNumber: "MTM-ORD-003", status: "DRAFT", items: [{ sku: "PROD-D", name: "PharmaCare Probiotics", qty: 20, price: 22.00 }], totalAmount: 440, notes: "Trial order for new product" },
        { agentId: agent2.id, customerId: createdMtmCustomers[2].id, visitId: createdVisits[2].id, orderNumber: "MTM-ORD-004", status: "DELIVERED", items: [{ sku: "PROD-A", name: "PharmaCare Vitamin D 1000IU", qty: 100, price: 12.50 }, { sku: "PROD-B", name: "PharmaCare Omega-3", qty: 60, price: 18.90 }, { sku: "PROD-C", name: "PharmaCare Multivitamin", qty: 80, price: 15.00 }], totalAmount: 3584, notes: "Quarterly bulk order" },
      ]
      for (const o of mtmOrders) {
        await prisma.mtmOrder.create({ data: { ...o, organizationId: orgId } })
      }
      console.log(`MTM Orders: ${mtmOrders.length}`)

      // MtmAlert — 3 alerts
      const mtmAlerts = [
        { agentId: agent2.id, type: "GPS_ANOMALY", category: "WARNING", title: "GPS signal jump detected", description: "Agent location jumped 2.3km in 30 seconds near Central Pharmacy Mokotow. Possible GPS drift.", metadata: { distance: 2300, timespan: 30, lat: 52.1935, lng: 21.0044 } },
        { agentId: agent3.id, type: "LATE_START", category: "WARNING", title: "Route started 45 minutes late", description: "South Warsaw route was scheduled for 09:00 but agent checked in at 09:45.", isResolved: true, resolvedAt: new Date(now - 20 * 60 * 60000), resolvedBy: agent1.id, metadata: { scheduledTime: "09:00", actualTime: "09:45", delayMinutes: 45 } },
        { agentId: agent3.id, type: "MISSED_VISIT", category: "CRITICAL", title: "Missed visit — Apteka Nowa", description: "Scheduled visit to Apteka Nowa was not completed. Customer flagged as prospect.", metadata: { customerId: createdMtmCustomers[5].id, scheduledDate: routeDate3.toISOString() } },
      ]
      for (const a of mtmAlerts) {
        await prisma.mtmAlert.create({ data: { ...a, organizationId: orgId } })
      }
      console.log(`MTM Alerts: ${mtmAlerts.length}`)

      // MtmSetting — 3 settings
      const mtmSettings = [
        { key: "geofence_radius", value: 200, description: "Geofence radius in meters for check-in validation" },
        { key: "check_in_required", value: true, description: "Require GPS check-in at customer location" },
        { key: "photo_required", value: true, description: "Require at least one photo per visit" },
      ]
      for (const s of mtmSettings) {
        await prisma.mtmSetting.create({ data: { ...s, organizationId: orgId } })
      }
      console.log(`MTM Settings: ${mtmSettings.length}`)

      // MtmNotification — 4 notifications
      const mtmNotifications = [
        { agentId: agent2.id, title: "New route assigned", body: "Your route 'Warsaw Central — Today' has been assigned. 4 stops planned.", type: "info", isRead: true, metadata: { routeId: route1.id } },
        { agentId: agent3.id, title: "New route assigned", body: "Your route 'South Warsaw' has been assigned. 4 stops planned.", type: "info", isRead: false, metadata: { routeId: route2.id } },
        { agentId: agent3.id, title: "Overdue task", body: "Task 'Merchandising audit' is approaching deadline.", type: "warning", isRead: false },
        { agentId: agent1.id, title: "GPS anomaly detected", body: "GPS anomaly detected for agent Alex Chen near Central Pharmacy.", type: "alert", isRead: false, metadata: { agentName: "Alex Chen" } },
      ]
      for (const n of mtmNotifications) {
        await prisma.mtmNotification.create({ data: { ...n, organizationId: orgId } })
      }
      console.log(`MTM Notifications: ${mtmNotifications.length}`)

    } else {
      console.log("MTM Module: (existing, skipped)")
    }
  } catch (e) { console.log(`MTM Module: ERROR — ${e.message}`) }

  // ─── 56. Pricing Module v2 (PricingGroup → Profile → Category → Service) ───
  try {
    const existingPG = await prisma.pricingGroup.findFirst({ where: { organizationId: orgId } })
    if (!existingPG) {
      // PricingGroups
      const groupA = await prisma.pricingGroup.create({ data: { organizationId: orgId, name: "Enterprise Clients", sortOrder: 0 } })
      const groupB = await prisma.pricingGroup.create({ data: { organizationId: orgId, name: "SMB Clients", sortOrder: 1 } })
      console.log("Pricing Groups: 2")

      // PricingCategories
      const catIT = await prisma.pricingCategory.create({ data: { organizationId: orgId, name: "IT Infrastructure", boardCategory: "permanent_it", sortOrder: 0 } })
      const catSec = await prisma.pricingCategory.create({ data: { organizationId: orgId, name: "Cybersecurity", boardCategory: "infosec", sortOrder: 1 } })
      const catCloud = await prisma.pricingCategory.create({ data: { organizationId: orgId, name: "Cloud Services", boardCategory: "cloud", sortOrder: 2 } })
      const catHelp = await prisma.pricingCategory.create({ data: { organizationId: orgId, name: "Help Desk", boardCategory: "helpdesk", sortOrder: 3 } })
      console.log("Pricing Categories: 4")

      // PricingProfiles — link to existing companies
      const profileCompanies = [
        { code: "PFIZER", companyIdx: 0, groupId: groupA.id, monthlyTotal: 28500, annualTotal: 342000 },
        { code: "ROCHE", companyIdx: 1, groupId: groupA.id, monthlyTotal: 35200, annualTotal: 422400 },
        { code: "NOVARTIS", companyIdx: 2, groupId: groupA.id, monthlyTotal: 22000, annualTotal: 264000 },
        { code: "BIOGENESIS", companyIdx: 5, groupId: groupB.id, monthlyTotal: 8500, annualTotal: 102000 },
        { code: "MEDTECH", companyIdx: 6, groupId: groupB.id, monthlyTotal: 6200, annualTotal: 74400 },
      ]
      const createdProfiles = []
      for (const p of profileCompanies) {
        const profile = await prisma.pricingProfile.create({
          data: { organizationId: orgId, companyCode: p.code, companyId: createdCompanies[p.companyIdx]?.id || null, groupId: p.groupId, monthlyTotal: p.monthlyTotal, annualTotal: p.annualTotal, isActive: true },
        })
        createdProfiles.push(profile)
      }
      console.log(`Pricing Profiles: ${createdProfiles.length}`)

      // PricingProfileCategory + PricingService for first 2 profiles
      const profileCategoryData = [
        { profileIdx: 0, categoryId: catIT.id, total: 12000, services: [
          { name: "Server Management", unit: "Per Server", qty: 15, price: 400, total: 6000 },
          { name: "Network Monitoring", unit: "Per Device", qty: 40, price: 75, total: 3000 },
          { name: "Backup & Recovery", unit: "Per TB", qty: 12, price: 250, total: 3000 },
        ]},
        { profileIdx: 0, categoryId: catSec.id, total: 8500, services: [
          { name: "SIEM Monitoring", unit: "Flat Rate", qty: 1, price: 4500, total: 4500 },
          { name: "Vulnerability Assessment", unit: "Per Quarter", qty: 1, price: 2000, total: 2000 },
          { name: "Endpoint Protection", unit: "Per Device", qty: 100, price: 20, total: 2000 },
        ]},
        { profileIdx: 0, categoryId: catCloud.id, total: 5000, services: [
          { name: "AWS Management", unit: "Flat Rate", qty: 1, price: 3500, total: 3500 },
          { name: "Cloud Migration Support", unit: "Per Hour", qty: 10, price: 150, total: 1500 },
        ]},
        { profileIdx: 0, categoryId: catHelp.id, total: 3000, services: [
          { name: "L1 Support (8x5)", unit: "Per User", qty: 200, price: 10, total: 2000 },
          { name: "L2 Support (8x5)", unit: "Per Incident", qty: 20, price: 50, total: 1000 },
        ]},
        { profileIdx: 1, categoryId: catIT.id, total: 15000, services: [
          { name: "Server Management", unit: "Per Server", qty: 25, price: 400, total: 10000 },
          { name: "Network Monitoring", unit: "Per Device", qty: 60, price: 75, total: 4500 },
          { name: "Patch Management", unit: "Per Server", qty: 25, price: 20, total: 500 },
        ]},
        { profileIdx: 1, categoryId: catSec.id, total: 12200, services: [
          { name: "SIEM Monitoring", unit: "Flat Rate", qty: 1, price: 6000, total: 6000 },
          { name: "SOC Operations", unit: "Flat Rate", qty: 1, price: 4200, total: 4200 },
          { name: "Endpoint Protection", unit: "Per Device", qty: 100, price: 20, total: 2000 },
        ]},
        { profileIdx: 3, categoryId: catIT.id, total: 4500, services: [
          { name: "Server Management", unit: "Per Server", qty: 5, price: 400, total: 2000 },
          { name: "Network Monitoring", unit: "Per Device", qty: 20, price: 75, total: 1500 },
          { name: "Backup & Recovery", unit: "Per TB", qty: 4, price: 250, total: 1000 },
        ]},
        { profileIdx: 3, categoryId: catHelp.id, total: 4000, services: [
          { name: "L1 Support (8x5)", unit: "Per User", qty: 50, price: 10, total: 500 },
          { name: "L2 Support (24x7)", unit: "Per Incident", qty: 30, price: 80, total: 2400 },
          { name: "On-site Support", unit: "Per Visit", qty: 4, price: 275, total: 1100 },
        ]},
      ]
      let pcCount = 0, svcCount = 0
      for (const pcd of profileCategoryData) {
        const pc = await prisma.pricingProfileCategory.create({
          data: { organizationId: orgId, profileId: createdProfiles[pcd.profileIdx].id, categoryId: pcd.categoryId, total: pcd.total },
        })
        pcCount++
        for (let i = 0; i < pcd.services.length; i++) {
          await prisma.pricingService.create({
            data: { ...pcd.services[i], organizationId: orgId, profileCategoryId: pc.id, sortOrder: i },
          })
          svcCount++
        }
      }
      console.log(`Pricing Profile Categories: ${pcCount}, Services: ${svcCount}`)

      // AdditionalSale — 3 one-off/recurring add-ons
      const additionalSales = [
        { profileId: createdProfiles[0].id, type: "one_time", name: "Active Directory Migration", description: "Full AD migration from on-prem to Azure AD", categoryName: "IT Infrastructure", unit: "Project", qty: 1, price: 15000, total: 15000, effectiveDate: new Date(now - 30 * DAY), status: "completed" },
        { profileId: createdProfiles[0].id, type: "recurring", name: "Extended SOC Hours (24x7)", description: "Upgrade from 8x5 to 24x7 SOC monitoring", categoryName: "Cybersecurity", unit: "Monthly", qty: 1, price: 3500, total: 3500, effectiveDate: new Date(now - 60 * DAY), status: "active" },
        { profileId: createdProfiles[1].id, type: "one_time", name: "Penetration Testing", description: "Annual external + internal penetration test", categoryName: "Cybersecurity", unit: "Project", qty: 1, price: 12000, total: 12000, effectiveDate: new Date(now + 15 * DAY), status: "active" },
      ]
      for (const as of additionalSales) {
        await prisma.additionalSale.create({ data: { ...as, organizationId: orgId, createdBy: user.id } })
      }
      console.log(`Additional Sales: ${additionalSales.length}`)
    } else {
      console.log("Pricing Module v2: (existing, skipped)")
    }
  } catch (e) { console.log(`Pricing Module v2: ERROR — ${e.message}`) }

  // ─── 57. Inbox — ChannelConfig + ChannelMessage + SocialConversation ───
  try {
    const existingCC = await prisma.channelConfig.findFirst({ where: { organizationId: orgId } })
    if (!existingCC) {
      // Channel configs
      const emailChannel = await prisma.channelConfig.create({
        data: { organizationId: orgId, channelType: "email", configName: "Support Email", settings: { inboxEmail: "support@company.com", signature: "Best regards,\nSupport Team" }, isActive: true, createdBy: user.id },
      })
      const whatsappChannel = await prisma.channelConfig.create({
        data: { organizationId: orgId, channelType: "whatsapp", configName: "WhatsApp Business", phoneNumber: "+48 500 100 200", settings: { businessName: "PharmaCare Support" }, isActive: true, createdBy: user.id },
      })
      const telegramChannel = await prisma.channelConfig.create({
        data: { organizationId: orgId, channelType: "telegram", configName: "Telegram Bot", settings: { botName: "PharmaCareBot" }, isActive: false, createdBy: user.id },
      })
      console.log("Channel Configs: 3")

      // Social conversations
      const conv1 = await prisma.socialConversation.create({
        data: { organizationId: orgId, channelConfigId: emailChannel.id, contactId: createdContacts[0]?.id || null, platform: "email", externalId: "conv-email-001", contactName: "Dr. James Mitchell", lastMessage: "I've sent a calendar invite with the Zoom link.", status: "open", lastMessageAt: new Date(now - 2 * 60 * 60000), unreadCount: 1, assignedTo: user.id },
      })
      const conv2 = await prisma.socialConversation.create({
        data: { organizationId: orgId, channelConfigId: whatsappChannel.id, contactId: createdContacts[5]?.id || null, platform: "whatsapp", externalId: "conv-wa-001", contactName: "Dr. Anna Schneider", lastMessage: "Thursday 10am works great!", status: "open", lastMessageAt: new Date(now - 30 * 60000), unreadCount: 2, assignedTo: user.id },
      })
      const conv3 = await prisma.socialConversation.create({
        data: { organizationId: orgId, channelConfigId: emailChannel.id, contactId: createdContacts[7]?.id || null, platform: "email", externalId: "conv-email-002", contactName: "Katarzyna Nowak", lastMessage: "Payment confirmed. Invoice marked as paid.", status: "resolved", lastMessageAt: new Date(now - 3 * DAY), unreadCount: 0 },
      })
      console.log("Social Conversations: 3")

      // Channel messages
      const messages = [
        { channelConfigId: emailChannel.id, direction: "inbound", channelType: "email", contactId: createdContacts[0]?.id, from: "j.mitchell@pfizer.com", to: "support@company.com", subject: "Question about CRM integration timeline", body: "Hi team,\n\nCould you provide an updated timeline for the CRM integration project? We need to align with our Q3 planning.", status: "read", conversationId: conv1.id, createdAt: new Date(now - 5 * 60 * 60000) },
        { channelConfigId: emailChannel.id, direction: "outbound", channelType: "email", contactId: createdContacts[0]?.id, from: "support@company.com", to: "j.mitchell@pfizer.com", subject: "Re: Question about CRM integration timeline", body: "Dear Dr. Mitchell,\n\nThank you for reaching out. The integration is on track for completion by end of Q2. I'll send a detailed Gantt chart by Friday.", status: "delivered", conversationId: conv1.id, createdAt: new Date(now - 4 * 60 * 60000) },
        { channelConfigId: emailChannel.id, direction: "inbound", channelType: "email", contactId: createdContacts[0]?.id, from: "j.mitchell@pfizer.com", to: "support@company.com", subject: "Re: Question about CRM integration timeline", body: "Perfect, looking forward to the Gantt chart. Also, can we schedule a call next week to discuss the data migration phase?", status: "read", conversationId: conv1.id, createdAt: new Date(now - 3 * 60 * 60000) },
        { channelConfigId: emailChannel.id, direction: "outbound", channelType: "email", contactId: createdContacts[0]?.id, from: "support@company.com", to: "j.mitchell@pfizer.com", subject: "Re: Question about CRM integration timeline", body: "Absolutely! I've sent a calendar invite for Tuesday at 2pm EST. We'll cover data migration, API endpoints, and testing schedule.", status: "delivered", conversationId: conv1.id, createdAt: new Date(now - 2 * 60 * 60000) },
        { channelConfigId: whatsappChannel.id, direction: "inbound", channelType: "whatsapp", contactId: createdContacts[5]?.id, from: "+49 30 555 1300", to: "+48 500 100 200", body: "Hello! Dr. Anna Schneider from BioGenesis Labs. We spoke at the Basel conference last month about your LIMS solution.", status: "read", conversationId: conv2.id, messageType: "text", createdAt: new Date(now - 2 * 60 * 60000) },
        { channelConfigId: whatsappChannel.id, direction: "outbound", channelType: "whatsapp", contactId: createdContacts[5]?.id, from: "+48 500 100 200", to: "+49 30 555 1300", body: "Hello Dr. Schneider! Great to hear from you. Yes, I remember our conversation. Would you like to schedule a demo?", status: "delivered", conversationId: conv2.id, messageType: "text", createdAt: new Date(now - 1.5 * 60 * 60000) },
        { channelConfigId: whatsappChannel.id, direction: "inbound", channelType: "whatsapp", contactId: createdContacts[5]?.id, from: "+49 30 555 1300", to: "+48 500 100 200", body: "Yes please! We're evaluating solutions for our Berlin and Munich labs. Can we do a 1-hour demo this week?", status: "read", conversationId: conv2.id, messageType: "text", createdAt: new Date(now - 1 * 60 * 60000) },
        { channelConfigId: whatsappChannel.id, direction: "outbound", channelType: "whatsapp", contactId: createdContacts[5]?.id, from: "+48 500 100 200", to: "+49 30 555 1300", body: "I have Thursday 10am CET or Friday 2pm CET available. Which works better for you?", status: "delivered", conversationId: conv2.id, messageType: "text", createdAt: new Date(now - 45 * 60000) },
        { channelConfigId: whatsappChannel.id, direction: "inbound", channelType: "whatsapp", contactId: createdContacts[5]?.id, from: "+49 30 555 1300", to: "+48 500 100 200", body: "Thursday 10am works great. I'll have our lab director join as well.", status: "read", conversationId: conv2.id, messageType: "text", createdAt: new Date(now - 30 * 60000) },
        { channelConfigId: whatsappChannel.id, direction: "outbound", channelType: "whatsapp", contactId: createdContacts[5]?.id, from: "+48 500 100 200", to: "+49 30 555 1300", body: "Excellent! I'll send a calendar invite with the Zoom link. Looking forward to it! 🎯", status: "delivered", conversationId: conv2.id, messageType: "text", createdAt: new Date(now - 25 * 60000) },
        { channelConfigId: emailChannel.id, direction: "inbound", channelType: "email", contactId: createdContacts[7]?.id, from: "k.nowak@pharmacare-dist.eu", to: "support@company.com", subject: "Invoice #INV-2026-004 payment confirmation", body: "Please find attached the payment confirmation for invoice INV-2026-004. Bank transfer was initiated today.", status: "read", conversationId: conv3.id, createdAt: new Date(now - 4 * DAY) },
        { channelConfigId: emailChannel.id, direction: "outbound", channelType: "email", contactId: createdContacts[7]?.id, from: "support@company.com", to: "k.nowak@pharmacare-dist.eu", subject: "Re: Invoice #INV-2026-004 payment confirmation", body: "Thank you, Katarzyna. We've received and confirmed the payment. The invoice has been marked as paid in our system.", status: "delivered", conversationId: conv3.id, createdAt: new Date(now - 3.5 * DAY) },
      ]
      for (const m of messages) {
        await prisma.channelMessage.create({ data: { ...m, organizationId: orgId } })
      }
      console.log(`Channel Messages: ${messages.length}`)
    } else {
      console.log("Inbox Module: (existing, skipped)")
    }
  } catch (e) { console.log(`Inbox Module: ERROR — ${e.message}`) }

  // ─── 58. ProjectMember + FundRule ───
  try {
    const existingPM = await prisma.projectMember.findFirst({ where: { project: { organizationId: orgId } } })
    if (!existingPM) {
      const orgProjects = await prisma.project.findMany({ where: { organizationId: orgId }, take: 3 })
      const teamUsers = await prisma.user.findMany({ where: { organizationId: orgId }, take: 4 })
      if (orgProjects.length > 0 && teamUsers.length > 1) {
        for (const proj of orgProjects) {
          for (let i = 1; i < Math.min(teamUsers.length, 3); i++) {
            try {
              await prisma.projectMember.create({
                data: { organizationId: orgId, projectId: proj.id, userId: teamUsers[i].id, role: i === 1 ? "lead" : "member" },
              })
            } catch (_) { /* unique constraint — skip */ }
          }
        }
        console.log("Project Members: linked")
      } else {
        console.log("Project Members: (no projects/users, skipped)")
      }
    } else {
      console.log("Project Members: (existing, skipped)")
    }

    // FundRule
    const existingFR = await prisma.fundRule.findFirst({ where: { organizationId: orgId } })
    if (!existingFR) {
      const orgFunds = await prisma.fund.findMany({ where: { organizationId: orgId }, take: 2 })
      if (orgFunds.length >= 2) {
        await prisma.fundRule.create({
          data: { organizationId: orgId, fundId: orgFunds[0].id, name: "Auto-allocate 10% to reserves", triggerType: "revenue_percentage", percentage: 0.10, isActive: true },
        })
        console.log("Fund Rules: 1")
      }
    } else {
      console.log("Fund Rules: (existing, skipped)")
    }
  } catch (e) { console.log(`ProjectMember/FundRule: ERROR — ${e.message}`) }

  // ─── Summary ───
  console.log("\n" + "═".repeat(50))
  console.log("Demo data seeded successfully!")
  console.log("═".repeat(50))
  console.log(`\nLogin credentials:`)
  console.log(`  URL:      https://${slug}.leaddrivecrm.org/login`)
  console.log(`  Email:    ${user.email}`)
  console.log(`  Password: ${password}`)
  console.log(`\nTeam accounts (same password):`)
  for (const tm of teamMembers) {
    console.log(`  ${tm.email} (${tm.role})`)
  }
  console.log(`\nData summary:`)
  console.log(`  Companies:      ${companies.length}`)
  console.log(`  Contacts:       ${contacts.length}`)
  console.log(`  Deals:          ${deals.length} (total value: $${deals.reduce((s, d) => s + d.valueAmount, 0).toLocaleString()})`)
  console.log(`  Leads:          ${leads.length}`)
  console.log(`  Tasks:          ${tasks.length}`)
  console.log(`  Tickets:        ${tickets.length}`)
  console.log(`  Campaigns:      ${campaigns.length}`)
  console.log(`  Activities:     ${activities.length}`)
  console.log(`  + Products, Contracts, Offers, Invoices, Bills`)
  console.log(`  + Bank Accounts, Funds, KB Articles, Email Templates`)
  console.log(`  + Segments, Journeys, Events, Projects, Reports`)
  console.log(`  + Notifications, Sales Forecasts, Currencies, SLA Policies`)
  console.log(`  + Ticket Queues, Workflows, AI Configs, Call Logs`)
  console.log(`  + Budget Plan, Pricing Parameters, Overhead Costs`)
  console.log(`  + Ticket Comments, Macros, Escalation Rules`)
  console.log(`  + Lead Assignment Rules, Sales Quotas, Custom Fields`)
  console.log(`  + Field Permissions, Deal Contact Roles, Competitors, Team Members`)
  console.log(`  + Landing Pages, Form Submissions, Contact Events, Email Logs`)
  console.log(`  + Campaign Variants, Invoice/Bill Payments, Fund Transactions`)
  console.log(`  + Payment Orders, Recurring Invoices, Cash Flow Entries`)
  console.log(`  + Dashboard Layout, Budget Cost Types, Sections, Actuals`)
  console.log(`  + Expense Forecasts, Cost Employees, Client Services`)
  console.log(`  + Cost Model Snapshots`)
  console.log(`  + Pricing Module v2 (Groups, Profiles, Categories, Services, Additional Sales)`)
  console.log(`  + Inbox (Channels, Conversations, Messages)`)
  console.log(`  + Project Members, Fund Rules`)
  console.log(`  + MTM (Agents, Customers, Routes, Visits, Tasks, Photos, Orders, Alerts, Settings, Notifications)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
