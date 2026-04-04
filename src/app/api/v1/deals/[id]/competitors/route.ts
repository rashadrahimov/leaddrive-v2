import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { PrismaClient } from "@prisma/client"

// Direct PrismaClient to bypass potential singleton schema issues
const directPrisma = new PrismaClient()

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

    // Debug: try with direct PrismaClient first
    let directResult: any = null
    let directError: string | null = null
    let singletonError: string | null = null

    try {
      directResult = await directPrisma.dealCompetitor.findMany({
        where: { dealId: id },
        orderBy: { createdAt: "asc" },
      })
    } catch (e: any) {
      directError = e?.message || String(e)
    }

    let singletonResult: any = null
    try {
      singletonResult = await prisma.dealCompetitor.findMany({
        where: { dealId: id },
        orderBy: { createdAt: "asc" },
      })
    } catch (e: any) {
      singletonError = e?.message || String(e)
    }

    // Return diagnostic info
    if (directResult && !singletonResult) {
      // Direct client works, singleton doesn't — use direct result
      return NextResponse.json({
        success: true,
        data: directResult,
        _debug: { usedDirect: true, singletonError: singletonError?.substring(0, 200) },
      })
    }

    if (singletonResult) {
      return NextResponse.json({ success: true, data: singletonResult })
    }

    return NextResponse.json({
      error: "Both clients failed",
      directError: directError?.substring(0, 200),
      singletonError: singletonError?.substring(0, 200),
    }, { status: 500 })
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
