import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const addSchema = z.object({
  name: z.string().min(1),
  product: z.string().optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  price: z.string().optional(),
  threat: z.enum(["High", "Medium", "Low"]).default("Medium"),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const deal = await prisma.deal.findFirst({ where: { id, organizationId: orgId }, select: { id: true } })
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    // Debug: check pg_class for the table
    const pgClass = await prisma.$queryRawUnsafe(
      `SELECT relname, relkind FROM pg_class WHERE relname = 'deal_competitors'`
    )

    // Try to create table if it doesn't exist
    if (!pgClass || (pgClass as any[]).length === 0) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS deal_competitors (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "dealId" TEXT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          product TEXT,
          strengths TEXT,
          weaknesses TEXT,
          price TEXT,
          threat TEXT NOT NULL DEFAULT 'Medium',
          notes TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("dealId", name)
        )
      `)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS deal_competitors_dealid_idx ON deal_competitors("dealId")`)
    }

    const competitors = await prisma.$queryRawUnsafe(
      `SELECT id, "dealId", name, product, strengths, weaknesses, price, threat, notes, "createdAt"
       FROM deal_competitors
       WHERE "dealId" = $1
       ORDER BY "createdAt" ASC`,
      id
    )

    return NextResponse.json({ success: true, data: competitors })
  } catch (e: any) {
    // Try to get DB info even on error
    let dbInfo = null
    try { dbInfo = await prisma.$queryRawUnsafe(`SELECT current_database(), current_schema(), current_user`) } catch {}
    let tables = null
    try { tables = await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`) } catch (te: any) { tables = te?.message }
    let pgTables = null
    try { pgTables = await prisma.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%deal%' ORDER BY tablename`) } catch (pe: any) { pgTables = pe?.message }
    let tableCount = null
    try { tableCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM pg_tables WHERE schemaname='public'`) } catch {}
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET'
    const maskedUrl = dbUrl.replace(/\/\/[^@]+@/, '//***@')
    return NextResponse.json({ error: e?.message || "Internal server error", _db: dbInfo, _tables: tables, _pgTables: pgTables, _tableCount: tableCount, _dbUrl: maskedUrl, _envKeys: Object.keys(process.env).filter(k => k.includes('DATABASE')).join(',') }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const deal = await prisma.deal.findFirst({ where: { id, organizationId: orgId }, select: { id: true } })
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    const { name, product, strengths, weaknesses, price, threat } = parsed.data

    // Use raw SQL upsert to bypass Prisma query engine schema issue
    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO deal_competitors ("id", "dealId", name, product, strengths, weaknesses, price, threat, notes, "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, NULL, NOW())
       ON CONFLICT ("dealId", name)
       DO UPDATE SET product = $3, strengths = $4, weaknesses = $5, price = $6, threat = $7
       RETURNING *`,
      id, name, product || null, strengths || null, weaknesses || null, price || null, threat
    )

    const competitor = Array.isArray(result) ? result[0] : result
    return NextResponse.json({ success: true, data: competitor })
  } catch (e: any) {
    console.error("[competitors POST]", e?.message || e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const { competitorId } = await req.json()
    if (!competitorId) return NextResponse.json({ error: "competitorId required" }, { status: 400 })

    const deal = await prisma.deal.findFirst({ where: { id, organizationId: orgId }, select: { id: true } })
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    // Use raw SQL to bypass Prisma query engine schema issue
    await prisma.$queryRawUnsafe(`DELETE FROM deal_competitors WHERE id = $1`, competitorId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[competitors DELETE]", e?.message || e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
