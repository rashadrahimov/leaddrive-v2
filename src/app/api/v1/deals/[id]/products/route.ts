import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — list products attached to deal (stored in deal.metadata.products)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: orgId },
    select: { metadata: true },
  })
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

  const products = (deal.metadata as any)?.products || []

  return NextResponse.json({ success: true, data: products })
}

// POST — add product to deal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: orgId },
    select: { metadata: true },
  })
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

  const body = await req.json()
  const { productId, name, price, currency } = body

  const metadata = (deal.metadata as any) || {}
  const products = metadata.products || []

  // Don't add duplicates
  if (products.some((p: any) => p.productId === productId)) {
    return NextResponse.json({ error: "Product already added" }, { status: 409 })
  }

  products.push({
    productId,
    name,
    price,
    currency: currency || "AZN",
    addedAt: new Date().toISOString(),
  })

  await prisma.deal.updateMany({
    where: { id, organizationId: orgId },
    data: { metadata: { ...metadata, products } },
  })

  return NextResponse.json({ success: true, data: products })
}

// DELETE — remove product from deal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { productId } = body

  const deal = await prisma.deal.findFirst({
    where: { id, organizationId: orgId },
    select: { metadata: true },
  })
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

  const metadata = (deal.metadata as any) || {}
  const products = (metadata.products || []).filter((p: any) => p.productId !== productId)

  await prisma.deal.updateMany({
    where: { id, organizationId: orgId },
    data: { metadata: { ...metadata, products } },
  })

  return NextResponse.json({ success: true, data: products })
}
