"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, CreditCard, Users, Radio, Zap, Layers, Globe, Lock, FileText, Clock } from "lucide-react"

const SETTINGS_SECTIONS = [
  {
    icon: CreditCard,
    title: "Billing",
    description: "Plans, invoices, payment methods",
    href: "/settings/billing",
  },
  {
    icon: Users,
    title: "Roles & Permissions",
    description: "Manage user roles and access",
    href: "/settings/roles",
  },
  {
    icon: Radio,
    title: "Channels",
    description: "Configure communication channels",
    href: "/settings/channels",
  },
  {
    icon: Zap,
    title: "Workflows",
    description: "Create and manage automation rules",
    href: "/settings/workflows",
  },
  {
    icon: Layers,
    title: "Custom Fields",
    description: "Add custom fields to entities",
    href: "/settings/custom-fields",
  },
  {
    icon: Globe,
    title: "Currencies",
    description: "Manage supported currencies",
    href: "/settings/currencies",
  },
  {
    icon: Clock,
    title: "SLA Policies",
    description: "Response and resolution time targets",
    href: "/settings/sla-policies",
  },
  {
    icon: Lock,
    title: "Security",
    description: "Password policies, 2FA, API keys",
    href: "/settings/security",
  },
  {
    icon: FileText,
    title: "Audit Log",
    description: "View all system activity",
    href: "/settings/audit-log",
  },
]

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and system preferences</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS_SECTIONS.map((section) => {
          const IconComponent = section.icon
          return (
            <Card
              key={section.title}
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
