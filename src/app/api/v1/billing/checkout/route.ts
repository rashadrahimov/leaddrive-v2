import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { isAdmin } from "@/lib/constants"
import { getStripe, isStripeConfigured } from "@/lib/stripe"
import { getStripePriceId } from "@/lib/stripe-prices"
import { USER_TIERS, type UserTierId } from "@/lib/modules"

// POST /api/v1/billing/checkout
// Body: { tier: "tier-5" | "tier-10" | "tier-25" | "tier-50" }
// Creates (or reuses) a Stripe Customer for the org, then returns a Checkout
// Session URL that the browser redirects to for payment entry. Webhook
// `checkout.session.completed` writes the resulting Subscription back onto
// the Organization row.
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

  const body = await req.json().catch(() => ({})) as { tier?: string }
  const tier = body.tier as UserTierId | undefined
  if (!tier || !USER_TIERS[tier as UserTierId]) {
    return NextResponse.json(
      { success: false, error: "Invalid tier" },
      { status: 400 },
    )
  }
  if (tier === "enterprise") {
    return NextResponse.json(
      { success: false, error: "Enterprise plans are set up via sales. Contact support." },
      { status: 400 },
    )
  }

  const priceId = getStripePriceId(tier)
  if (!priceId) {
    return NextResponse.json(
      { success: false, error: `Price for ${tier} is not configured on this deployment` },
      { status: 503 },
    )
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.orgId },
    select: {
      id: true, name: true, slug: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  })
  if (!org) {
    return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 })
  }

  const stripe = getStripe()
  const adminEmail = auth.email || undefined

  let customerId = org.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: adminEmail,
      metadata: { organizationId: org.id, slug: org.slug },
    })
    customerId = customer.id
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin

  // If the org already has an active subscription, flip the existing line to
  // the new price (proration handled by Stripe) instead of starting a second
  // subscription from Checkout.
  if (org.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId)
      if (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") {
        const itemId = sub.items.data[0]?.id
        if (itemId) {
          await stripe.subscriptions.update(sub.id, {
            items: [{ id: itemId, price: priceId }],
            proration_behavior: "create_prorations",
            metadata: { organizationId: org.id },
          })
          return NextResponse.json({
            success: true,
            mode: "updated",
            message: "Existing subscription switched to new tier",
          })
        }
      }
    } catch {
      // Fall through to Checkout if the stored sub id is stale or the tier
      // swap fails — a fresh Checkout is a clean recovery path.
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/settings/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings/billing?status=cancel`,
    subscription_data: {
      metadata: { organizationId: org.id, tier },
    },
    metadata: { organizationId: org.id, tier },
  })

  if (!session.url) {
    return NextResponse.json(
      { success: false, error: "Stripe did not return a checkout URL" },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true, mode: "checkout", url: session.url })
}
