import Stripe from "stripe"

let cachedClient: Stripe | null = null

// Lazy-init so the app boots when STRIPE_SECRET_KEY is unset (CI, dev without
// billing configured). Callers should null-check via isStripeConfigured().
export function getStripe(): Stripe {
  if (cachedClient) return cachedClient
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — billing endpoints are disabled. " +
      "Add the key to .env and restart.",
    )
  }
  cachedClient = new Stripe(key, {
    // Pin an explicit API version so a future Stripe update can't silently
    // break request/response shapes. Bump intentionally after testing.
    apiVersion: "2026-03-25.dahlia",
    appInfo: { name: "LeadDrive CRM", version: "2.0" },
    typescript: true,
  })
  return cachedClient
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}
