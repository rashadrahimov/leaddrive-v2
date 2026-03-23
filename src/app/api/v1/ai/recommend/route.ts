import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { contactId, dealId } = body

  // Get all products
  const products = await prisma.product.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { name: "asc" },
  })

  if (products.length === 0) {
    return NextResponse.json({ success: true, data: { recommendations: [], message: "No products available" } })
  }

  // Build context from deal or contact
  let contextParts: string[] = []
  let dealValue = 0
  let companyName = ""
  let industry = ""

  if (dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId: orgId },
      include: {
        company: { select: { name: true, industry: true, category: true, userCount: true } },
        contact: { select: { fullName: true, position: true, department: true } },
      },
    })
    if (deal) {
      contextParts.push(deal.name || "")
      contextParts.push(deal.customerNeed || "")
      contextParts.push(deal.salesChannel || "")
      contextParts.push(deal.notes || "")
      dealValue = deal.valueAmount || 0
      if (deal.company) {
        companyName = deal.company.name
        industry = deal.company.industry || ""
        contextParts.push(deal.company.name, deal.company.industry || "", deal.company.category || "")
      }
      if (deal.contact) {
        contextParts.push(deal.contact.position || "", deal.contact.department || "")
      }
    }
  }

  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId },
      include: { company: { select: { name: true, industry: true } } },
    })
    if (contact) {
      contextParts.push(contact.position || "", contact.department || "", contact.source || "")
      if (contact.company) {
        companyName = contact.company.name
        industry = contact.company.industry || ""
        contextParts.push(contact.company.name, contact.company.industry || "")
      }
    }

    // Also get contact's deals
    const deals = await prisma.deal.findMany({
      where: { organizationId: orgId, contactId },
      select: { name: true, valueAmount: true, customerNeed: true },
    })
    deals.forEach(d => {
      contextParts.push(d.customerNeed || "", d.name || "")
      dealValue = Math.max(dealValue, d.valueAmount || 0)
    })
  }

  const contextStr = contextParts.filter(Boolean).join(" ").toLowerCase()

  // Smart scoring
  const scored = products.map(product => {
    let score = 40 // base score

    // Tag matching (high signal)
    for (const tag of product.tags) {
      if (contextStr.includes(tag.toLowerCase())) score += 18
    }

    // Feature matching
    for (const feat of product.features) {
      const words = feat.toLowerCase().split(/\s+/)
      for (const w of words) {
        if (w.length > 3 && contextStr.includes(w)) { score += 8; break }
      }
    }

    // Category/name matching
    const nameWords = product.name.toLowerCase().split(/\s+/)
    for (const w of nameWords) {
      if (w.length > 3 && contextStr.includes(w)) score += 12
    }

    // Industry matching
    if (industry) {
      const indLower = industry.toLowerCase()
      if (product.tags.some(t => indLower.includes(t.toLowerCase()))) score += 15
      if (product.name.toLowerCase().includes(indLower) || (product.description || "").toLowerCase().includes(indLower)) score += 10
    }

    // Price fit
    if (dealValue > 10000 && product.price > 3000) score += 8
    else if (dealValue > 5000 && product.price > 1000) score += 6
    else if (dealValue < 3000 && product.price < 2000) score += 6

    // Deal context bonus
    if (contextStr.length > 50) score += 5

    // Generate reason
    let reason = "Recommended based on your company profile."
    if (score >= 80) {
      reason = `High relevance for ${companyName || "this client"} — product features align with deal requirements and industry profile.`
    } else if (score >= 60) {
      reason = `Good fit for ${companyName || "this client"} — matches several criteria including company size and service needs.`
    } else if (score >= 45) {
      reason = `Potential upsell for ${companyName || "this client"} — complementary to current services.`
    }

    return {
      productId: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      currency: product.currency,
      features: product.features,
      score: Math.min(score, 99),
      reason,
    }
  })

  scored.sort((a, b) => b.score - a.score)

  return NextResponse.json({
    success: true,
    data: { recommendations: scored.slice(0, 5) },
  })
}
