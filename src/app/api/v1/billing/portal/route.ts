import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/constants"
import { getStripe, isStripeConfigured } from "@/lib/stripe"

// POST /api/v1/billing/portal
// Returns a one-off Stripe Billing Portal URL so the admin can update their
// card, download invoices, or cancel from Stripe's hosted UI.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "core", "write")
  if (isAuthError(auth)) return auth

  if (!isAdmin(auth.role)) {
    return NextResponse.json(
      { success: false, error: "Only organisation admins can manage billing" },
      { status: 403 },
    )
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { success: false, error: "Billing is not configured on this deployment" },
      { status: 503 },
    )
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.orgId },
    select: { stripeCustomerId: true },
  })
  if (!org?.stripeCustomerId) {
    return NextResponse.json(
      { success: false, error: "No Stripe customer exists yet — start a subscription first" },
      { status: 400 },
    )
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin
  const stripe = getStripe()

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${origin}/settings/billing`,
  })

  return NextResponse.json({ success: true, url: session.url })
}
