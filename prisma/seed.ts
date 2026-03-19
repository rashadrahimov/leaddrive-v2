/**
 * LeadDrive CRM v2 — Prisma Seed Script
 *
 * Creates the default organization (Güvən Technology) and seeds initial data.
 *
 * Migration from v1:
 * - v1 server: 178.156.249.177 (PostgreSQL)
 * - Expected: 59 companies, 577 contacts, 12 deals
 * - Cost Model: overhead_costs, cost_employees, pricing_parameters
 *
 * Run: npx prisma db seed
 * Requires: DATABASE_URL in .env
 */

// import { PrismaClient } from "@prisma/client"
// import bcrypt from "bcryptjs"

// const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding LeadDrive CRM v2...")

  // 1. Create default organization
  // const org = await prisma.organization.upsert({
  //   where: { slug: "guven-technology" },
  //   update: {},
  //   create: {
  //     name: "Güvən Technology LLC",
  //     slug: "guven-technology",
  //     plan: "enterprise",
  //     addons: [],
  //     maxUsers: -1,
  //     maxContacts: -1,
  //   },
  // })
  // console.log("  ✅ Organization:", org.name)

  // 2. Create admin user
  // const adminPassword = await bcrypt.hash("admin123", 12)
  // const admin = await prisma.user.upsert({
  //   where: { organizationId_email: { organizationId: org.id, email: "admin@leaddrive.com" } },
  //   update: {},
  //   create: {
  //     organizationId: org.id,
  //     email: "admin@leaddrive.com",
  //     name: "Rashad Rahimov",
  //     passwordHash: adminPassword,
  //     role: "admin",
  //   },
  // })
  // console.log("  ✅ Admin user:", admin.email)

  // 3. Create default pipeline stages
  // const stages = [
  //   { name: "LEAD", displayName: "Lead", color: "#6366f1", probability: 10, sortOrder: 1 },
  //   { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 2 },
  //   { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 3 },
  //   { name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316", probability: 75, sortOrder: 4 },
  //   { name: "WON", displayName: "Won", color: "#22c55e", probability: 100, sortOrder: 5, isWon: true },
  //   { name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 6, isLost: true },
  // ]
  // for (const stage of stages) {
  //   await prisma.pipelineStage.create({ data: { organizationId: org.id, ...stage } })
  // }
  // console.log("  ✅ Pipeline stages: 6")

  // 4. Create default SLA policies
  // const slas = [
  //   { name: "Critical", priority: "critical", firstResponseHours: 1, resolutionHours: 4 },
  //   { name: "High", priority: "high", firstResponseHours: 4, resolutionHours: 8 },
  //   { name: "Medium", priority: "medium", firstResponseHours: 8, resolutionHours: 24 },
  //   { name: "Low", priority: "low", firstResponseHours: 24, resolutionHours: 72 },
  // ]
  // for (const sla of slas) {
  //   await prisma.slaPolicy.create({ data: { organizationId: org.id, ...sla } })
  // }
  // console.log("  ✅ SLA policies: 4")

  // 5. Create pricing parameters
  // await prisma.pricingParameters.upsert({
  //   where: { organizationId: org.id },
  //   update: {},
  //   create: {
  //     organizationId: org.id,
  //     totalEmployees: 137,
  //     technicalStaff: 107,
  //     backOfficeStaff: 30,
  //     vatRate: 0.18,
  //     employerTaxRate: 0.175,
  //     riskRate: 0.05,
  //     miscExpenseRate: 0.01,
  //     fixedOverheadRatio: 0.25,
  //   },
  // })
  // console.log("  ✅ Pricing parameters")

  // 6. Create default currencies
  // const currencies = [
  //   { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", exchangeRate: 1, isBase: true },
  //   { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 0.59 },
  //   { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.54 },
  // ]
  // for (const cur of currencies) {
  //   await prisma.currency.create({ data: { organizationId: org.id, ...cur } })
  // }
  // console.log("  ✅ Currencies: 3")

  // TODO: Phase 0.18 — Import v1 data
  // Script: connect to v1 PostgreSQL, export companies/contacts/deals/overhead/employees
  // Map all to org.id
  // Verify counts: companies=59, contacts=577, deals=12

  console.log("🌱 Seed complete (template ready — uncomment after prisma generate)")
}

main().catch(console.error)
