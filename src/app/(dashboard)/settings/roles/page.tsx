"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/stat-card"
import {
  Shield, ShieldCheck, UserCheck, Eye,
  Check, X, Pencil, EyeIcon, Save, RotateCcw, Loader2, Lock,
} from "lucide-react"
import { useTranslations } from "next-intl"

type AccessLevel = "full" | "edit" | "view" | "none"

const MODULES = [
  "companies", "contacts", "deals", "leads", "tasks", "tickets",
  "contracts", "offers", "campaigns", "reports", "ai", "settings",
]

const ROLES = ["admin", "manager", "agent", "viewer"] as const
type RoleKey = (typeof ROLES)[number]

const ACCESS_CYCLE: AccessLevel[] = ["full", "edit", "view", "none"]

const ROLE_META: Record<RoleKey, { icon: typeof Shield; color: string }> = {
  admin:   { icon: Shield,      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  manager: { icon: ShieldCheck,  color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  agent:   { icon: UserCheck,    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  viewer:  { icon: Eye,          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
}

const ACCESS_STYLES: Record<AccessLevel, { icon: typeof Check; className: string }> = {
  full: { icon: Check,   className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40" },
  edit: { icon: Pencil,  className: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40" },
  view: { icon: EyeIcon, className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40" },
  none: { icon: X,       className: "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-700/40" },
}

type PermissionMatrix = Record<RoleKey, Record<string, AccessLevel>>

const DEFAULT_PERMISSIONS: PermissionMatrix = {
  admin:   { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "full", tickets: "full", contracts: "full", offers: "full", campaigns: "full", reports: "full", ai: "full", settings: "full" },
  manager: { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "full", tickets: "full", contracts: "full", offers: "full", campaigns: "full", reports: "full", ai: "full", settings: "none" },
  agent:   { companies: "edit", contacts: "edit", deals: "edit", leads: "edit", tasks: "full", tickets: "full", contracts: "view", offers: "view", campaigns: "view", reports: "view", ai: "view", settings: "none" },
  viewer:  { companies: "view", contacts: "view", deals: "view", leads: "view", tasks: "view", tickets: "view", contracts: "view", offers: "none", campaigns: "none", reports: "view", ai: "none", settings: "none" },
}

export default function RolesSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const [userCounts, setUserCounts] = useState<Record<string, number>>({ admin: 0, manager: 0, agent: 0, viewer: 0 })
  const [permissions, setPermissions] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS)
  const [savedPermissions, setSavedPermissions] = useState<PermissionMatrix>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState("")
  const orgId = session?.user?.organizationId

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(savedPermissions)

  const fetchData = useCallback(async () => {
    if (!orgId) return
    const headers = { "x-organization-id": String(orgId) }
    try {
      const [usersRes, permsRes] = await Promise.all([
        fetch("/api/v1/users", { headers }),
        fetch("/api/v1/settings/permissions", { headers }),
      ])

      if (usersRes.ok) {
        const result = await usersRes.json()
        const counts: Record<string, number> = { admin: 0, manager: 0, agent: 0, viewer: 0 }
        for (const u of result.data || []) {
          if (counts[u.role] !== undefined) counts[u.role]++
        }
        setUserCounts(counts)
      }

      if (permsRes.ok) {
        const result = await permsRes.json()
        if (result.data) {
          setPermissions(result.data)
          setSavedPermissions(result.data)
        }
      }
    } catch {} finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { fetchData() }, [fetchData])

  const cycleAccess = (role: RoleKey, module: string) => {
    // Admin settings always "full" — locked
    if (role === "admin" && module === "settings") return

    setPermissions(prev => {
      const current = prev[role][module] as AccessLevel
      const idx = ACCESS_CYCLE.indexOf(current)
      const next = ACCESS_CYCLE[(idx + 1) % ACCESS_CYCLE.length]
      return {
        ...prev,
        [role]: { ...prev[role], [module]: next },
      }
    })
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/v1/settings/permissions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify(permissions),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to save")
      }
      setSavedPermissions({ ...permissions })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPermissions({ ...savedPermissions })
    setError("")
    setSaveSuccess(false)
  }

  const handleResetDefaults = () => {
    setPermissions({ ...DEFAULT_PERMISSIONS })
    setError("")
    setSaveSuccess(false)
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("roles")}</h1>
          <p className="text-muted-foreground">{t("rolesPageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              {t("cancelChanges")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            {t("resetDefaults")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" />{t("saving")}</>
            ) : saveSuccess ? (
              <><Check className="h-4 w-4 mr-1" />{t("saved")}</>
            ) : (
              <><Save className="h-4 w-4 mr-1" />{t("savePermissions")}</>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {ROLES.map(role => {
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
          <p className="text-xs text-muted-foreground mb-4">{t("clickToChange")}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">{t("module")}</th>
                {ROLES.map(role => {
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
              {MODULES.map((mod, idx) => (
                <tr key={mod} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                  <td className="py-3 px-4 font-medium">{t(`module_${mod}`)}</td>
                  {ROLES.map(role => {
                    const level = (permissions[role]?.[mod] || "none") as AccessLevel
                    const style = ACCESS_STYLES[level]
                    const IconEl = style.icon
                    const isLocked = role === "admin" && mod === "settings"
                    return (
                      <td key={role} className="py-3 px-4">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => cycleAccess(role, mod)}
                            disabled={isLocked}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${style.className} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={isLocked ? t("adminSettingsLocked") : t("clickToChange")}
                          >
                            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <IconEl className="h-3.5 w-3.5" />}
                            {accessLabel(level)}
                          </button>
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
