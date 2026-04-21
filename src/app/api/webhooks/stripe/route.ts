import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { tierFromStripePriceId } from "@/lib/stripe-prices"
import type Stripe from "stripe"

// POST /api/webhooks/stripe
// Single source of truth for subscription state — Stripe calls us on every
// lifecycle event and we mirror it onto Organization. We verify the HMAC
// signature with STRIPE_WEBHOOK_SECRET so a rogue sender can't flip an org
// to "active" without paying.
//
// Configure in Stripe dashboard:
//   https://dashboard.stripe.com/webhooks → Add endpoint
//   URL: https://app.leaddrivecrm.org/api/webhooks/stripe
//   Events: checkout.session.completed, customer.subscription.created,
//           customer.subscription.updated, customer.subscription.deleted,
//           invoice.payment_failed
//   Signing secret → paste into .env as STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signingSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    )
  }

  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  const rawBody = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, signingSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature"
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, stripe)
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpsert(sub)
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }
        if (invoice.subscription) {
          await prisma.organization.updateMany({
            where: { stripeSubscriptionId: invoice.subscription as string },
            data: { subscriptionStatus: "past_due" },
          })
        }
        break
      }
      default:
        // Unhandled but acknowledged so Stripe doesn't retry.
        break
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[stripe-webhook] handler error", event.type, msg)
    return NextResponse.json({ error: `Handler failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<void> {
  const orgId = session.metadata?.organizationId
  if (!orgId) return

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id
  if (!customerId || !subscriptionId) return

  // Fetch the full subscription so we can read items/current_period_end.
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = sub.items.data[0]?.price?.id
  const tier = tierFromStripePriceId(priceId) || session.metadata?.tier || undefined

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: sub.status,
      currentPeriodEnd: toDate(getSubscriptionPeriodEnd(sub)),
      trialEndsAt: toDate(sub.trial_end),
      ...(tier ? { plan: tier } : {}),
    },
  })
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const orgId = sub.metadata?.organizationId
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id

  // Match on subscription id first, then customer id, then metadata — covers
  // the cases where our DB has stale data but Stripe's payload still tells us
  // which org this belongs to.
  const org =
    (await prisma.organization.findFirst({
      where: { stripeSubscriptionId: sub.id },
      select: { id: true },
    })) ||
    (customerId
      ? await prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        })
      : null) ||
    (orgId
      ? await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
      : null)

  if (!org) return

  const priceId = sub.items.data[0]?.price?.id
  const tier = tierFromStripePriceId(priceId)

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId || undefined,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: toDate(getSubscriptionPeriodEnd(sub)),
      trialEndsAt: toDate(sub.trial_end),
      ...(tier ? { plan: tier } : {}),
    },
  })
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  await prisma.organization.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: {
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
    },
  })
}

function toDate(unix: number | null | undefined): Date | null {
  if (!unix) return null
  return new Date(unix * 1000)
}

// Stripe moved current_period_end from the Subscription root to each
// SubscriptionItem in recent API versions. Read from the first item with a
// fallback to the legacy root so either shape works.
function getSubscriptionPeriodEnd(
  sub: Stripe.Subscription & { current_period_end?: number | null },
): number | null {
  const itemEnd = sub.items.data[0]?.current_period_end
  if (typeof itemEnd === "number") return itemEnd
  const rootEnd = sub.current_period_end
  return typeof rootEnd === "number" ? rootEnd : null
}
