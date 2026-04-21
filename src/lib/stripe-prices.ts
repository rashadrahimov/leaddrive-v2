import { USER_TIERS, type UserTierId } from "./modules"

// Stripe Price IDs for each user tier. Each price in Stripe is a recurring
// monthly subscription line. Configured per-env so staging and prod can use
// different price objects and still round-trip through the same code.
export function getStripePriceId(tier: UserTierId): string | null {
  const key = `STRIPE_PRICE_${tier.toUpperCase().replace(/-/g, "_")}`
  return process.env[key] || null
}

// Reverse lookup: given a price ID (from a webhook), which tier is it?
export function tierFromStripePriceId(priceId: string | null | undefined): UserTierId | null {
  if (!priceId) return null
  for (const tier of Object.keys(USER_TIERS) as UserTierId[]) {
    if (getStripePriceId(tier) === priceId) return tier
  }
  return null
}

// Checkable at runtime so the billing UI can hide tiers that aren't priced.
export function isPricedTier(tier: UserTierId): boolean {
  return Boolean(getStripePriceId(tier))
}
