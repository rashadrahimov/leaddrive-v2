import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { contactId } = await req.json()
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 })

  // Get contact info + their deals
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: orgId },
  })
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 })

  // Get all products
  const products = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
  })

  if (products.length === 0) {
    return NextResponse.json({ success: true, data: { recommendations: [], message: "No products available" } })
  }

  // Get contact's deals for context
  const deals = await prisma.deal.findMany({
    where: { organizationId: orgId, contactId },
    select: { title: true, value: true, stage: true, customerNeed: true },
  })

  // Simple scoring: match product tags/features to contact interests
  const contactContext = [
    contact.title || "",
    contact.source || "",
    ...(deals.map(d => d.customerNeed || d.title || "").filter(Boolean)),
  ].join(" ").toLowerCase()

  const scored = products.map(product => {
    let score = 50 // base score

    // Tag matching
    for (const tag of product.tags) {
      if (contactContext.includes(tag.toLowerCase())) score += 15
    }

    // Feature matching
    for (const feat of product.features) {
      if (contactContext.includes(feat.toLowerCase())) score += 10
    }

    // Category bonus for active deals
    if (deals.length > 0) score += 10

    // Price fit (contacts with high-value deals get premium products)
    const avgDealValue = deals.length > 0 ? deals.reduce((s, d) => s + (d.value || 0), 0) / deals.length : 0
    if (avgDealValue > 10000 && product.price > 5000) score += 10
    if (avgDealValue < 5000 && product.price < 3000) score += 10

    return {
      productId: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      currency: product.currency,
      score: Math.min(score, 100),
      reason: score > 70 ? "High match — tags and deal context align" :
              score > 50 ? "Moderate match — some context alignment" :
              "General recommendation",
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return NextResponse.json({
    success: true,
    data: { recommendations: scored.slice(0, 5) },
  })
}
