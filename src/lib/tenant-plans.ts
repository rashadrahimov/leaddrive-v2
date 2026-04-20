export const TENANT_PLANS = {
  starter: {
    maxUsers: 3,
    maxContacts: 500,
    features: [] as string[],
    addons: [] as string[],
  },
  professional: {
    maxUsers: 25,
    maxContacts: 10000,
    features: ["whatsapp", "ai", "complaints_register"],
    addons: ["ai", "channels"],
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxContacts: -1,
    features: ["whatsapp", "ai", "voip", "portal", "events", "complaints_register"],
    addons: ["ai", "channels", "finance", "mtm", "voip"],
  },
} as const

export type TenantPlan = keyof typeof TENANT_PLANS

export function getPlanDefaults(plan: string): {
  maxUsers: number
  maxContacts: number
  features: string[]
  addons: string[]
} {
  const defaults = TENANT_PLANS[plan as TenantPlan]
  if (!defaults) return { ...TENANT_PLANS.starter }
  return {
    maxUsers: defaults.maxUsers,
    maxContacts: defaults.maxContacts,
    features: [...defaults.features],
    addons: [...defaults.addons],
  }
}

export const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
}
