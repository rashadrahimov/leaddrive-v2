"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 9,
    billing: "per month",
    current: false,
    features: [
      "Up to 1,000 contacts",
      "Basic CRM",
      "Email integration",
      "Standard support",
      "Web forms",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 29,
    billing: "per month",
    current: true,
    features: [
      "Up to 10,000 contacts",
      "Advanced automation",
      "All integrations",
      "Priority support",
      "Custom workflows",
      "API access",
      "Advanced analytics",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    billing: "per month",
    current: false,
    features: [
      "Unlimited contacts",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "White-label options",
      "Advanced security",
      "Custom features",
      "On-premise option",
    ],
  },
]

export default function BillingPage() {
  const t = useTranslations("settings")
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("billing")}</h1>
        <p className="text-muted-foreground">{t("billingDesc")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card key={plan.id} className={plan.current ? "ring-2 ring-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-sm text-muted-foreground">/{plan.billing}</span>
                  </div>
                </div>
                {plan.current && <Badge>Current Plan</Badge>}{/* billing-specific, keep English */}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full" variant={plan.current ? "outline" : "default"}>
                {plan.current ? "Current Plan" : "Switch to " + plan.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Plan</span>
            <span className="font-medium">Professional - $29/month</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Billing Cycle</span>
            <span className="font-medium">Monthly (Auto-renews on April 19)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium">Visa ending in 4242</span>
          </div>
          <div className="border-t pt-4 flex justify-between font-semibold">
            <span>Next Billing Date</span>
            <span>April 19, 2026</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
