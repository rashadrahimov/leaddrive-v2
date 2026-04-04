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

    const competitors = await prisma.dealCompetitor.findMany({
      where: { dealId: id },
      orderBy: { createdAt: "asc" },
    })

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
    const competitor = await prisma.dealCompetitor.upsert({
      where: { dealId_name: { dealId: id, name } },
      create: { dealId: id, name, product: product || null, strengths: strengths || null, weaknesses: weaknesses || null, price: price || null, threat, notes: null },
      update: { product: product || null, strengths: strengths || null, weaknesses: weaknesses || null, price: price || null, threat },
    })

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

    await prisma.dealCompetitor.delete({ where: { id: competitorId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[competitors DELETE]", e?.message || e)
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 })
  }
}
