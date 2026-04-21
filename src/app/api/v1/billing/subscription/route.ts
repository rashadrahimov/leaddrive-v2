import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { USER_TIERS } from "@/lib/modules"
import { isStripeConfigured } from "@/lib/stripe"

// GET /api/v1/billing/subscription
// Snapshot of the org's current subscription — what the billing UI renders
// without hitting Stripe directly. Webhook-driven, so this is cheap.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "core", "read")
  if (isAuthError(auth)) return auth

  const org = await prisma.organization.findUnique({
    where: { id: auth.orgId },
    select: {
      plan: true,
      addons: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
    },
  })
  if (!org) {
    return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 })
  }

  const tierInfo = (USER_TIERS as Record<string, { maxUsers: number; price: number }>)[org.plan]

  return NextResponse.json({
    success: true,
    data: {
      plan: org.plan,
      addons: org.addons,
      tierInfo: tierInfo || null,
      hasStripeCustomer: Boolean(org.stripeCustomerId),
      subscription: org.stripeSubscriptionId
        ? {
            id: org.stripeSubscriptionId,
            status: org.subscriptionStatus,
            currentPeriodEnd: org.currentPeriodEnd,
            trialEndsAt: org.trialEndsAt,
          }
        : null,
      billingConfigured: isStripeConfigured(),
    },
  })
}
