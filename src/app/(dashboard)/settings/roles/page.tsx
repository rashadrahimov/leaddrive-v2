"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import {
  Shield, ShieldCheck, UserCheck, Eye, Users,
  Check, X, Pencil, EyeIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

type AccessLevel = "full" | "edit" | "view" | "none"

interface ModulePermission {
  module: string
  admin: AccessLevel
  manager: AccessLevel
  agent: AccessLevel
  viewer: AccessLevel
}

const PERMISSIONS: ModulePermission[] = [
  { module: "companies",    admin: "full", manager: "full",  agent: "edit",  viewer: "view" },
  { module: "contacts",     admin: "full", manager: "full",  agent: "edit",  viewer: "view" },
  { module: "deals",        admin: "full", manager: "full",  agent: "edit",  viewer: "view" },
  { module: "leads",        admin: "full", manager: "full",  agent: "edit",  viewer: "view" },
  { module: "tasks",        admin: "full", manager: "full",  agent: "full",  viewer: "view" },
  { module: "tickets",      admin: "full", manager: "full",  agent: "full",  viewer: "view" },
  { module: "contracts",    admin: "full", manager: "full",  agent: "view",  viewer: "view" },
  { module: "offers",       admin: "full", manager: "full",  agent: "view",  viewer: "none" },
  { module: "campaigns",    admin: "full", manager: "full",  agent: "view",  viewer: "none" },
  { module: "reports",      admin: "full", manager: "full",  agent: "view",  viewer: "view" },
  { module: "ai",           admin: "full", manager: "full",  agent: "view",  viewer: "none" },
  { module: "settings",     admin: "full", manager: "none",  agent: "none",  viewer: "none" },
]

const ROLE_META = {
  admin:   { icon: Shield,      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  manager: { icon: ShieldCheck,  color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  agent:   { icon: UserCheck,    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  viewer:  { icon: Eye,          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
} as const

type RoleKey = keyof typeof ROLE_META

const ACCESS_CONFIG: Record<AccessLevel, { icon: React.ReactNode; className: string }> = {
  full: { icon: <Check className="h-4 w-4" />, className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" },
  edit: { icon: <Pencil className="h-3.5 w-3.5" />, className: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" },
  view: { icon: <EyeIcon className="h-3.5 w-3.5" />, className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" },
  none: { icon: <X className="h-4 w-4" />, className: "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/40" },
}

export default function RolesSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const [userCounts, setUserCounts] = useState<Record<string, number>>({ admin: 0, manager: 0, agent: 0, viewer: 0 })
  const [loading, setLoading] = useState(true)
  const orgId = session?.user?.organizationId

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/v1/users", {
          headers: orgId ? { "x-organization-id": String(orgId) } : {},
        })
        if (res.ok) {
          const result = await res.json()
          const counts: Record<string, number> = { admin: 0, manager: 0, agent: 0, viewer: 0 }
          for (const u of result.data || []) {
            if (counts[u.role] !== undefined) counts[u.role]++
          }
          setUserCounts(counts)
        }
      } catch {} finally { setLoading(false) }
    }
    fetchUsers()
  }, [session, orgId])

  const roles: RoleKey[] = ["admin", "manager", "agent", "viewer"]

  const accessLabel = (level: AccessLevel): string => {
    switch (level) {
      case "full": return t("accessFull")
      case "edit": return t("accessEdit")
      case "view": return t("accessView")
      case "none": return t("accessNone")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("roles")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("roles")}</h1>
        <p className="text-muted-foreground">{t("rolesPageSubtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {roles.map(role => {
          const meta = ROLE_META[role]
          const Icon = meta.icon
          return (
            <StatCard
              key={role}
              title={t(`role_${role}`)}
              value={userCounts[role]}
              icon={<Icon className="h-4 w-4" />}
            />
          )
        })}
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">{t("module")}</th>
                {roles.map(role => {
                  const meta = ROLE_META[role]
                  const Icon = meta.icon
                  return (
                    <th key={role} className="text-center py-3 px-4">
                      <div className="flex flex-col items-center gap-1.5">
                        <Badge className={`${meta.color} gap-1`}>
                          <Icon className="h-3 w-3" />
                          {t(`role_${role}`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-normal">
                          {userCounts[role]} {t("usersCount")}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm, idx) => (
                <tr key={perm.module} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="py-3 px-4 font-medium">{t(`module_${perm.module}`)}</td>
                  {roles.map(role => {
                    const level = perm[role]
                    const config = ACCESS_CONFIG[level]
                    return (
                      <td key={role} className="py-3 px-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.className}`}>
                            {config.icon}
                            {accessLabel(level)}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
