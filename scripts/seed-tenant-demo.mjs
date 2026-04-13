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

  // ─── Pipeline Stages ───
  let stages = await prisma.pipelineStage.findMany({
    where: { organizationId: orgId },
    orderBy: { sortOrder: "asc" },
  })
  if (stages.length === 0) {
    const stageData = [
      { name: "LEAD", displayName: "New Lead", color: "#6366f1", probability: 10, sortOrder: 0 },
      { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 1 },
      { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 2 },
      { name: "NEGOTIATION", displayName: "Negotiation", color: "#8b5cf6", probability: 75, sortOrder: 3 },
      { name: "WON", displayName: "Won", color: "#10b981", probability: 100, sortOrder: 4, isWon: true },
      { name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 5, isLost: true },
    ]
    for (const s of stageData) {
      await prisma.pipelineStage.create({ data: { ...s, organizationId: orgId } })
    }
    stages = await prisma.pipelineStage.findMany({ where: { organizationId: orgId }, orderBy: { sortOrder: "asc" } })
    console.log("Pipeline stages: created")
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
      const stageObj = stages.find((s) => s.name === d.stage)
      await prisma.deal.create({
        data: {
          organizationId: orgId,
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
  console.log(`  Companies: ${companies.length}`)
  console.log(`  Contacts:  ${contacts.length}`)
  console.log(`  Deals:     ${deals.length} (total value: $${deals.reduce((s, d) => s + d.valueAmount, 0).toLocaleString()})`)
  console.log(`  Leads:     ${leads.length}`)
  console.log(`  Tasks:     ${tasks.length}`)
  console.log(`  Tickets:   ${tickets.length}`)
  console.log(`  Campaigns: ${campaigns.length}`)
  console.log(`  Activities: ${activities.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
