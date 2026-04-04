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

    // Use raw SQL to bypass Prisma query engine schema issue
    const competitors = await prisma.$queryRawUnsafe(
      `SELECT id, "dealId", name, product, strengths, weaknesses, price, threat, notes, "createdAt"
       FROM deal_competitors
       WHERE "dealId" = $1
       ORDER BY "createdAt" ASC`,
      id
    )

    return NextResponse.json({ success: true, data: competitors })
  } catch (e: any) {
    console.error("[competitors GET]", e?.message || e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
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
