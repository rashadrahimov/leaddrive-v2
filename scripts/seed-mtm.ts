// @ts-nocheck
/**
 * MTM Quickstart Seed Script
 * Creates test data for Route & Field module:
 * - 4 agents (1 manager, 1 supervisor, 2 agents)
 * - 10 customers (categories A/B/C/D with Baku addresses)
 * - 3 routes with points
 * - 8 tasks (mixed statuses/priorities)
 * - 5 visits (checked-in + checked-out)
 * - 3 orders with items
 * - 4 alerts (critical/warning/info)
 *
 * Usage: npx tsx scripts/seed-mtm.ts
 * Idempotent: safe to run multiple times (uses upsert)
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

function dateAt(base: Date, hours: number, minutes = 0): Date {
  const d = new Date(base)
  d.setHours(hours, minutes, 0, 0)
  return d
}

async function main() {
  console.log("🚀 MTM Quickstart Seed — starting...\n")

  // 1. Find organization
  const org = await prisma.organization.findFirst({ where: { slug: "guven-technology" } })
  if (!org) {
    console.error("❌ Organization 'guven-technology' not found. Run create-admin.ts first.")
    process.exit(1)
  }
  console.log(`✅ Organization: ${org.name} (${org.id})`)
  const orgId = org.id

  // 2. Find admin user to link as manager agent
  const adminUser = await prisma.user.findFirst({
    where: { organizationId: orgId, role: "admin" },
  })
  console.log(`✅ Admin user: ${adminUser?.name || "not found"}`)

  // ═══════════════════════════════════════════════════
  // AGENTS (4)
  // ═══════════════════════════════════════════════════
  console.log("\n📋 Creating agents...")

  const agentRashad = await prisma.mtmAgent.upsert({
    where: { organizationId_email: { organizationId: orgId, email: "rashad@guven.az" } },
    update: { name: "Rashad Rahimov", role: "MANAGER", status: "ACTIVE", userId: adminUser?.id || null },
    create: {
      organizationId: orgId,
      name: "Rashad Rahimov",
      email: "rashad@guven.az",
      phone: "+994-50-555-0001",
      role: "MANAGER",
      status: "ACTIVE",
      isOnline: true,
      userId: adminUser?.id || null,
    },
  })
  console.log(`  ✅ ${agentRashad.name} (MANAGER)`)

  const agentAnar = await prisma.mtmAgent.upsert({
    where: { organizationId_email: { organizationId: orgId, email: "anar@guven.az" } },
    update: { name: "Anar Mammadov", role: "AGENT", status: "ACTIVE", managerId: agentRashad.id },
    create: {
      organizationId: orgId,
      name: "Anar Mammadov",
      email: "anar@guven.az",
      phone: "+994-50-555-0002",
      role: "AGENT",
      status: "ACTIVE",
      isOnline: true,
      managerId: agentRashad.id,
    },
  })
  console.log(`  ✅ ${agentAnar.name} (AGENT)`)

  const agentNigar = await prisma.mtmAgent.upsert({
    where: { organizationId_email: { organizationId: orgId, email: "nigar@guven.az" } },
    update: { name: "Nigar Huseynova", role: "AGENT", status: "ACTIVE", managerId: agentRashad.id },
    create: {
      organizationId: orgId,
      name: "Nigar Huseynova",
      email: "nigar@guven.az",
      phone: "+994-50-555-0003",
      role: "AGENT",
      status: "ACTIVE",
      isOnline: false,
      managerId: agentRashad.id,
    },
  })
  console.log(`  ✅ ${agentNigar.name} (AGENT)`)

  const agentFarid = await prisma.mtmAgent.upsert({
    where: { organizationId_email: { organizationId: orgId, email: "farid@guven.az" } },
    update: { name: "Farid Aliyev", role: "SUPERVISOR", status: "ACTIVE", managerId: agentRashad.id },
    create: {
      organizationId: orgId,
      name: "Farid Aliyev",
      email: "farid@guven.az",
      phone: "+994-50-555-0004",
      role: "SUPERVISOR",
      status: "ACTIVE",
      isOnline: true,
      managerId: agentRashad.id,
    },
  })
  console.log(`  ✅ ${agentFarid.name} (SUPERVISOR)`)

  // ═══════════════════════════════════════════════════
  // CUSTOMERS (10) — Baku locations
  // ═══════════════════════════════════════════════════
  console.log("\n🏪 Creating customers...")

  const customersData = [
    { code: "MTM-A01", name: "Əczaçı Plus — Nəsimi", category: "A", city: "Bakı", district: "Nəsimi", address: "Təbriz küç. 28", lat: 40.3953, lng: 49.8822, phone: "+994-12-408-1001", contact: "Elçin Hüseynov" },
    { code: "MTM-A02", name: "Zeytun Market — 28 May", category: "A", city: "Bakı", district: "Səbail", address: "Neftçilər pr. 95", lat: 40.3722, lng: 49.8485, phone: "+994-12-408-1002", contact: "Aynur Qasımova" },
    { code: "MTM-A03", name: "Grand Pharmacy — Xətai", category: "A", city: "Bakı", district: "Xətai", address: "Babək pr. 2044", lat: 40.3882, lng: 49.8750, phone: "+994-12-408-1003", contact: "Rəşad Əlizadə" },
    { code: "MTM-B01", name: "Mini Market Günəş", category: "B", city: "Bakı", district: "Yasamal", address: "Ş.Bədəlbəyli küç. 12", lat: 40.3812, lng: 49.8321, phone: "+994-12-408-2001", contact: "Tural Məmmədov" },
    { code: "MTM-B02", name: "Sağlam Pharmacy", category: "B", city: "Bakı", district: "Binəqədi", address: "M.Hadi küç. 45", lat: 40.4283, lng: 49.8167, phone: "+994-12-408-2002", contact: "Leyla Həsənova" },
    { code: "MTM-B03", name: "Nur Supermarket", category: "B", city: "Bakı", district: "Nərimanov", address: "Ə.Əliyev küç. 77", lat: 40.4102, lng: 49.8531, phone: "+994-12-408-2003", contact: "Kamran Əhmədov" },
    { code: "MTM-B04", name: "Vita Apteki", category: "B", city: "Bakı", district: "Suraxanı", address: "Hövsan şos. 14", lat: 40.4165, lng: 50.0015, phone: "+994-12-408-2004", contact: "Gülnar Babayeva" },
    { code: "MTM-C01", name: "Köşə Dükanı Əhməd", category: "C", city: "Bakı", district: "Sabunçu", address: "Bakıxanov küç. 3", lat: 40.4350, lng: 49.9483, phone: "+994-50-333-0001", contact: "Əhməd Nəsibov" },
    { code: "MTM-C02", name: "Kiçik Mağaza Lalə", category: "C", city: "Bakı", district: "Qaradağ", address: "Lökbatan qəs. 8", lat: 40.3168, lng: 49.7525, phone: "+994-50-333-0002", contact: "Lalə İsmayılova" },
    { code: "MTM-D01", name: "Bağlanmış Dükan — Mərdəkan", category: "D", city: "Bakı", district: "Xəzər", address: "Mərdəkan küç. 55", lat: 40.4950, lng: 50.1494, phone: null, contact: null },
  ]

  const customers: any[] = []
  for (const c of customersData) {
    const customer = await prisma.mtmCustomer.upsert({
      where: { organizationId_code: { organizationId: orgId, code: c.code } },
      update: { name: c.name, category: c.category, city: c.city, district: c.district, address: c.address, latitude: c.lat, longitude: c.lng, phone: c.phone, contactPerson: c.contact },
      create: {
        organizationId: orgId,
        code: c.code,
        name: c.name,
        category: c.category as any,
        status: c.category === "D" ? "INACTIVE" : "ACTIVE",
        city: c.city,
        district: c.district,
        address: c.address,
        latitude: c.lat,
        longitude: c.lng,
        phone: c.phone,
        contactPerson: c.contact,
      },
    })
    customers.push(customer)
    console.log(`  ✅ ${customer.code} — ${customer.name} (${c.category})`)
  }

  // ═══════════════════════════════════════════════════
  // ROUTES (3) with points
  // ═══════════════════════════════════════════════════
  console.log("\n🗺️  Creating routes...")

  // Clean existing routes first (for idempotency)
  await prisma.mtmRoutePoint.deleteMany({ where: { route: { organizationId: orgId, name: { startsWith: "[SEED]" } } } })
  await prisma.mtmRoute.deleteMany({ where: { organizationId: orgId, name: { startsWith: "[SEED]" } } })

  // Route 1: Anar today — PLANNED
  const route1 = await prisma.mtmRoute.create({
    data: {
      organizationId: orgId,
      agentId: agentAnar.id,
      date: today,
      name: "[SEED] Nəsimi-Səbail Route",
      status: "PLANNED",
      totalPoints: 4,
      visitedPoints: 0,
      points: {
        create: [
          { customerId: customers[0].id, orderIndex: 0, status: "PENDING", plannedTime: dateAt(today, 9, 0) },
          { customerId: customers[1].id, orderIndex: 1, status: "PENDING", plannedTime: dateAt(today, 10, 0) },
          { customerId: customers[3].id, orderIndex: 2, status: "PENDING", plannedTime: dateAt(today, 11, 30) },
          { customerId: customers[4].id, orderIndex: 3, status: "PENDING", plannedTime: dateAt(today, 13, 0) },
        ],
      },
    },
  })
  console.log(`  ✅ Route: ${route1.name} (${route1.status}, ${route1.totalPoints} points)`)

  // Route 2: Nigar today — IN_PROGRESS
  const route2 = await prisma.mtmRoute.create({
    data: {
      organizationId: orgId,
      agentId: agentNigar.id,
      date: today,
      name: "[SEED] Xətai-Nərimanov Route",
      status: "IN_PROGRESS",
      totalPoints: 3,
      visitedPoints: 1,
      startedAt: dateAt(today, 9, 15),
      points: {
        create: [
          { customerId: customers[2].id, orderIndex: 0, status: "VISITED", visitedAt: dateAt(today, 9, 30) },
          { customerId: customers[5].id, orderIndex: 1, status: "PENDING", plannedTime: dateAt(today, 11, 0) },
          { customerId: customers[6].id, orderIndex: 2, status: "PENDING", plannedTime: dateAt(today, 13, 0) },
        ],
      },
    },
  })
  console.log(`  ✅ Route: ${route2.name} (${route2.status}, 1/${route2.totalPoints} visited)`)

  // Route 3: Farid yesterday — COMPLETED
  const route3 = await prisma.mtmRoute.create({
    data: {
      organizationId: orgId,
      agentId: agentFarid.id,
      date: yesterday,
      name: "[SEED] Full Bakı Tour",
      status: "COMPLETED",
      totalPoints: 5,
      visitedPoints: 4,
      startedAt: dateAt(yesterday, 8, 30),
      completedAt: dateAt(yesterday, 16, 45),
      points: {
        create: [
          { customerId: customers[0].id, orderIndex: 0, status: "VISITED", visitedAt: dateAt(yesterday, 9, 0) },
          { customerId: customers[2].id, orderIndex: 1, status: "VISITED", visitedAt: dateAt(yesterday, 10, 30) },
          { customerId: customers[4].id, orderIndex: 2, status: "VISITED", visitedAt: dateAt(yesterday, 12, 0) },
          { customerId: customers[5].id, orderIndex: 3, status: "VISITED", visitedAt: dateAt(yesterday, 14, 0) },
          { customerId: customers[7].id, orderIndex: 4, status: "SKIPPED", notes: "Closed for lunch" },
        ],
      },
    },
  })
  console.log(`  ✅ Route: ${route3.name} (${route3.status}, 4/${route3.totalPoints} visited)`)

  // ═══════════════════════════════════════════════════
  // TASKS (8)
  // ═══════════════════════════════════════════════════
  console.log("\n📝 Creating tasks...")

  // Clean existing seed tasks
  await prisma.mtmTask.deleteMany({ where: { organizationId: orgId, title: { startsWith: "[SEED]" } } })

  const tasksData = [
    { agentId: agentAnar.id, customerId: customers[0].id, title: "[SEED] Stock check — Əczaçı Plus", priority: "HIGH", status: "PENDING", dueDate: today },
    { agentId: agentAnar.id, customerId: customers[1].id, title: "[SEED] Display setup — Zeytun Market", priority: "MEDIUM", status: "PENDING", dueDate: today },
    { agentId: agentNigar.id, customerId: customers[2].id, title: "[SEED] Collect payment — Grand Pharmacy", priority: "URGENT", status: "IN_PROGRESS", dueDate: today },
    { agentId: agentNigar.id, customerId: customers[5].id, title: "[SEED] Promo materials delivery — Nur", priority: "MEDIUM", status: "IN_PROGRESS", dueDate: today },
    { agentId: agentFarid.id, customerId: customers[0].id, title: "[SEED] Monthly audit — Əczaçı Plus", priority: "HIGH", status: "COMPLETED", dueDate: yesterday, completedAt: dateAt(yesterday, 15, 0) },
    { agentId: agentFarid.id, customerId: customers[4].id, title: "[SEED] Contract renewal — Sağlam", priority: "LOW", status: "COMPLETED", dueDate: yesterday, completedAt: dateAt(yesterday, 14, 0) },
    { agentId: agentAnar.id, customerId: customers[3].id, title: "[SEED] Price list update — Mini Market", priority: "LOW", status: "OVERDUE", dueDate: new Date(today.getTime() - 3 * 86400000) },
    { agentId: agentNigar.id, customerId: customers[6].id, title: "[SEED] Return defective goods — Vita", priority: "MEDIUM", status: "CANCELLED" },
  ]

  for (const t of tasksData) {
    const task = await prisma.mtmTask.create({
      data: {
        organizationId: orgId,
        agentId: t.agentId,
        customerId: t.customerId,
        title: t.title,
        priority: t.priority as any,
        status: t.status as any,
        dueDate: t.dueDate || null,
        completedAt: (t as any).completedAt || null,
      },
    })
    console.log(`  ✅ ${task.title} (${task.status}/${task.priority})`)
  }

  // ═══════════════════════════════════════════════════
  // VISITS (5)
  // ═══════════════════════════════════════════════════
  console.log("\n📍 Creating visits...")

  await prisma.mtmVisit.deleteMany({ where: { organizationId: orgId, notes: { startsWith: "[SEED]" } } })

  const visitsData = [
    { agentId: agentNigar.id, customerId: customers[2].id, status: "CHECKED_IN", checkInAt: dateAt(today, 9, 30), lat: 40.3882, lng: 49.8750, notes: "[SEED] Checking inventory" },
    { agentId: agentAnar.id, customerId: customers[0].id, status: "CHECKED_IN", checkInAt: dateAt(today, 10, 15), lat: 40.3953, lng: 49.8822, notes: "[SEED] Waiting for manager" },
    { agentId: agentFarid.id, customerId: customers[0].id, status: "CHECKED_OUT", checkInAt: dateAt(yesterday, 9, 0), checkOutAt: dateAt(yesterday, 9, 45), lat: 40.3953, lng: 49.8822, duration: 45, notes: "[SEED] Audit complete" },
    { agentId: agentFarid.id, customerId: customers[2].id, status: "CHECKED_OUT", checkInAt: dateAt(yesterday, 10, 30), checkOutAt: dateAt(yesterday, 11, 20), lat: 40.3882, lng: 49.8750, duration: 50, notes: "[SEED] Order placed" },
    { agentId: agentFarid.id, customerId: customers[4].id, status: "CHECKED_OUT", checkInAt: dateAt(yesterday, 12, 0), checkOutAt: dateAt(yesterday, 12, 30), lat: 40.4283, lng: 49.8167, duration: 30, notes: "[SEED] Quick visit, contract signed" },
  ]

  for (const v of visitsData) {
    await prisma.mtmVisit.create({
      data: {
        organizationId: orgId,
        agentId: v.agentId,
        customerId: v.customerId,
        status: v.status as any,
        checkInAt: v.checkInAt,
        checkOutAt: v.checkOutAt || null,
        checkInLat: v.lat,
        checkInLng: v.lng,
        duration: v.duration || null,
        notes: v.notes,
      },
    })
    console.log(`  ✅ Visit: ${v.status} (${v.notes?.replace("[SEED] ", "")})`)
  }

  // ═══════════════════════════════════════════════════
  // ORDERS (3)
  // ═══════════════════════════════════════════════════
  console.log("\n🛒 Creating orders...")

  await prisma.mtmOrder.deleteMany({ where: { organizationId: orgId, notes: { startsWith: "[SEED]" } } })

  const ordersData = [
    {
      agentId: agentNigar.id, customerId: customers[2].id, status: "DRAFT",
      orderNumber: "ORD-SEED-001",
      items: [
        { product: "Paracetamol 500mg", qty: 100, price: 2.50 },
        { product: "Ibuprofen 400mg", qty: 50, price: 3.20 },
      ],
      notes: "[SEED] Pending pharmacy approval",
    },
    {
      agentId: agentFarid.id, customerId: customers[0].id, status: "CONFIRMED",
      orderNumber: "ORD-SEED-002",
      items: [
        { product: "Vitamin C 1000mg", qty: 200, price: 1.80 },
        { product: "Omega-3 Fish Oil", qty: 80, price: 5.50 },
        { product: "Zinc Tablets", qty: 150, price: 2.00 },
      ],
      notes: "[SEED] Confirmed, awaiting delivery",
    },
    {
      agentId: agentAnar.id, customerId: customers[1].id, status: "DELIVERED",
      orderNumber: "ORD-SEED-003",
      items: [
        { product: "Hand Sanitizer 500ml", qty: 60, price: 4.00 },
        { product: "Face Masks (50 pack)", qty: 30, price: 8.00 },
      ],
      notes: "[SEED] Delivered and paid",
    },
  ]

  for (const o of ordersData) {
    const totalAmount = o.items.reduce((s, i) => s + i.qty * i.price, 0)
    await prisma.mtmOrder.create({
      data: {
        organizationId: orgId,
        agentId: o.agentId,
        customerId: o.customerId,
        orderNumber: o.orderNumber,
        status: o.status as any,
        items: JSON.stringify(o.items),
        totalAmount,
        notes: o.notes,
      },
    })
    console.log(`  ✅ ${o.orderNumber} — ${o.status} ($${totalAmount.toFixed(2)})`)
  }

  // ═══════════════════════════════════════════════════
  // ALERTS (4)
  // ═══════════════════════════════════════════════════
  console.log("\n🚨 Creating alerts...")

  await prisma.mtmAlert.deleteMany({ where: { organizationId: orgId, title: { startsWith: "[SEED]" } } })

  const alertsData = [
    { agentId: agentAnar.id, type: "GPS_SPOOFING", category: "CRITICAL", title: "[SEED] GPS spoofing detected", description: "Agent location jumped 15km in 2 minutes. Possible GPS spoofing." },
    { agentId: agentNigar.id, type: "LATE_START", category: "WARNING", title: "[SEED] Late start — Nigar", description: "Agent started route 45 minutes late (10:00 instead of 09:15)." },
    { agentId: agentAnar.id, type: "LOW_BATTERY", category: "WARNING", title: "[SEED] Low battery — Anar", description: "Agent device battery below 15%. GPS tracking may be interrupted." },
    { agentId: agentFarid.id, type: "MISSED_VISIT", category: "INFO", title: "[SEED] Skipped visit — Sabunçu", description: "Customer was closed. Visit rescheduled for tomorrow.", isResolved: true, resolvedAt: dateAt(yesterday, 17, 0) },
  ]

  for (const a of alertsData) {
    await prisma.mtmAlert.create({
      data: {
        organizationId: orgId,
        agentId: a.agentId,
        type: a.type,
        category: a.category as any,
        title: a.title,
        description: a.description,
        isResolved: a.isResolved || false,
        resolvedAt: (a as any).resolvedAt || null,
      },
    })
    console.log(`  ✅ ${a.category}: ${a.title.replace("[SEED] ", "")}`)
  }

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  console.log("\n" + "═".repeat(50))
  console.log("🎉 MTM Quickstart Seed — COMPLETE!")
  console.log("═".repeat(50))
  console.log(`  Agents:    4`)
  console.log(`  Customers: 10`)
  console.log(`  Routes:    3 (with 12 points)`)
  console.log(`  Tasks:     8`)
  console.log(`  Visits:    5`)
  console.log(`  Orders:    3`)
  console.log(`  Alerts:    4`)
  console.log(`\n  Total: 37 records created`)
  console.log(`  Organization: ${org.name}`)
  console.log(`\n  ✅ Open app.leaddrivecrm.org → MTM section to see data!`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
