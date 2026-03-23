"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, CreditCard, Users, Radio, Zap, LayoutDashboard, Globe, Lock, FileText, Clock, Shield } from "lucide-react"
import { useTranslations } from "next-intl"

export default function SettingsPage() {
  const router = useRouter()
  const t = useTranslations("settings")

  const SETTINGS_SECTIONS = [
    { icon: CreditCard, title: t("billing"), description: t("billingDesc"), href: "/settings/billing" },
    { icon: Users, title: t("roles"), description: t("rolesDesc"), href: "/settings/roles" },
    { icon: Radio, title: t("channels"), description: t("channelsDesc"), href: "/settings/channels" },
    { icon: Zap, title: t("workflows"), description: t("workflowsDesc"), href: "/settings/workflows" },
    { icon: LayoutDashboard, title: t("dashboardSettings"), description: t("dashboardSettingsDesc"), href: "/settings/custom-fields" },
    { icon: Globe, title: t("currencies"), description: t("currenciesDesc"), href: "/settings/currencies" },
    { icon: Clock, title: t("slaPolicies"), description: t("slaPoliciesDesc"), href: "/settings/sla-policies" },
    { icon: Shield, title: t("portalUsers"), description: t("portalUsersDesc"), href: "/settings/portal-users" },
    { icon: Lock, title: t("security"), description: t("securityDesc"), href: "/settings/security" },
    { icon: FileText, title: t("auditLog"), description: t("auditLogDesc"), href: "/settings/audit-log" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS_SECTIONS.map((section) => {
          const IconComponent = section.icon
          return (
            <Card
              key={section.href}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(section.href)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground mt-1" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
