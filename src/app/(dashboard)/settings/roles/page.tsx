"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  Shield, ShieldCheck, UserCheck, Eye, Briefcase, Megaphone, Wallet, Headphones,
  Check, X, Pencil, EyeIcon, Save, RotateCcw, Loader2, Lock, Plus, Trash2, Tag,
} from "lucide-react"
import { useTranslations } from "next-intl"

type AccessLevel = "full" | "edit" | "view" | "none"

interface RoleConfig {
  id: string
  name: string
  color: string
  isSystem: boolean
}

const MODULES = [
  "companies", "contacts", "deals", "leads", "tasks", "tickets",
  "contracts", "offers", "campaigns", "reports", "ai", "settings",
]

const ACCESS_CYCLE: AccessLevel[] = ["full", "edit", "view", "none"]

const COLOR_OPTIONS = [
  { id: "red", label: "Red", bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  { id: "blue", label: "Blue", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { id: "purple", label: "Purple", bg: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  { id: "gray", label: "Gray", bg: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  { id: "emerald", label: "Green", bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  { id: "pink", label: "Pink", bg: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300" },
  { id: "amber", label: "Amber", bg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  { id: "cyan", label: "Cyan", bg: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300" },
  { id: "indigo", label: "Indigo", bg: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300" },
  { id: "teal", label: "Teal", bg: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300" },
  { id: "orange", label: "Orange", bg: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { id: "slate", label: "Slate", bg: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300" },
]

function getColorBg(color: string): string {
  return COLOR_OPTIONS.find(c => c.id === color)?.bg || COLOR_OPTIONS[COLOR_OPTIONS.length - 1].bg
}

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield, manager: ShieldCheck, agent: UserCheck, viewer: Eye,
  sales: Briefcase, marketing: Megaphone, finance: Wallet, service_desk: Headphones,
}

function getRoleIcon(roleId: string) {
  return ROLE_ICONS[roleId] || Tag
}

const ACCESS_STYLES: Record<AccessLevel, { icon: typeof Check; className: string }> = {
  full: { icon: Check,   className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40" },
  edit: { icon: Pencil,  className: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40" },
  view: { icon: EyeIcon, className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40" },
  none: { icon: X,       className: "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-700/40" },
}

type PermissionMatrix = Record<string, Record<string, AccessLevel>>

export default function RolesSettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  const [roles, setRoles] = useState<RoleConfig[]>([])
  const [permissions, setPermissions] = useState<PermissionMatrix>({})
  const [savedRoles, setSavedRoles] = useState<RoleConfig[]>([])
  const [savedPermissions, setSavedPermissions] = useState<PermissionMatrix>({})
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleColor, setNewRoleColor] = useState("slate")
  const [addingRole, setAddingRole] = useState(false)
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null)
  const [deleteRoleName, setDeleteRoleName] = useState("")
  const orgId = session?.user?.organizationId

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(savedPermissions)

  const fetchData = useCallback(async () => {
    if (!orgId) return
    const headers = { "x-organization-id": String(orgId) }
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/v1/users", { headers }),
        fetch("/api/v1/settings/roles", { headers }),
      ])

      if (usersRes.ok) {
        const result = await usersRes.json()
        const counts: Record<string, number> = {}
        for (const u of result.data || []) {
          counts[u.role] = (counts[u.role] || 0) + 1
        }
        setUserCounts(counts)
      }

      if (rolesRes.ok) {
        const result = await rolesRes.json()
        if (result.data) {
          setRoles(result.data.roles)
          setSavedRoles(result.data.roles)
          setPermissions(result.data.permissions)
          setSavedPermissions(result.data.permissions)
        }
      }
    } catch {} finally { setLoading(false) }
  }, [orgId])

  useEffect(() => { fetchData() }, [fetchData])

  const cycleAccess = (roleId: string, module: string) => {
    if (roleId === "admin" && module === "settings") return
    setPermissions(prev => {
      const current = (prev[roleId]?.[module] || "none") as AccessLevel
      const idx = ACCESS_CYCLE.indexOf(current)
      const next = ACCESS_CYCLE[(idx + 1) % ACCESS_CYCLE.length]
      return { ...prev, [roleId]: { ...prev[roleId], [module]: next } }
    })
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/v1/settings/roles", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ roles, permissions }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to save")
      }
      setSavedRoles([...roles])
      setSavedPermissions(JSON.parse(JSON.stringify(permissions)))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPermissions(JSON.parse(JSON.stringify(savedPermissions)))
    setError("")
    setSaveSuccess(false)
  }

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return
    setAddingRole(true)
    setError("")
    try {
      const res = await fetch("/api/v1/settings/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ name: newRoleName.trim(), color: newRoleColor }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Failed to create role")
      }
      setShowAddRole(false)
      setNewRoleName("")
      setNewRoleColor("slate")
      await fetchData()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAddingRole(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!deleteRoleId) return
    const res = await fetch(`/api/v1/settings/roles?id=${deleteRoleId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error || "Failed to delete")
    }
    setDeleteRoleId(null)
    await fetchData()
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
          <div className="h-32 bg-muted rounded-lg" />
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

      {/* Roles cards */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t("availableRoles")}</h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddRole(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("addRole")}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {roles.map(role => {
              const Icon = getRoleIcon(role.id)
              return (
                <div key={role.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card">
                  <Badge className={`${getColorBg(role.color)} gap-1`}>
                    <Icon className="h-3 w-3" />
                    {role.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {userCounts[role.id] || 0} {t("usersCount")}
                  </span>
                  {role.isSystem && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                  {!role.isSystem && (
                    <button
                      type="button"
                      onClick={() => { setDeleteRoleId(role.id); setDeleteRoleName(role.name) }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-4">{t("clickToChange")}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 font-semibold sticky left-0 bg-card z-10">{t("module")}</th>
                {roles.map(role => {
                  const Icon = getRoleIcon(role.id)
                  return (
                    <th key={role.id} className="text-center py-3 px-2 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={`${getColorBg(role.color)} gap-1 text-[10px]`}>
                          <Icon className="h-3 w-3" />
                          {role.name}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {userCounts[role.id] || 0} {t("usersCount")}
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
                  <td className="py-2.5 px-3 font-medium sticky left-0 bg-inherit z-10">{t(`module_${mod}`)}</td>
                  {roles.map(role => {
                    const level = (permissions[role.id]?.[mod] || "none") as AccessLevel
                    const style = ACCESS_STYLES[level]
                    const IconEl = style.icon
                    const isLocked = role.id === "admin" && mod === "settings"
                    return (
                      <td key={role.id} className="py-2.5 px-2">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => cycleAccess(role.id, mod)}
                            disabled={isLocked}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${style.className} ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={isLocked ? t("adminSettingsLocked") : t("clickToChange")}
                          >
                            {isLocked ? <Lock className="h-3 w-3" /> : <IconEl className="h-3 w-3" />}
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

      {/* Add Role Dialog */}
      <Dialog open={showAddRole} onOpenChange={setShowAddRole}>
        <DialogHeader>
          <DialogTitle>{t("addRole")}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="grid gap-4">
            <div>
              <Label>{t("roleName")}</Label>
              <Input
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                placeholder="e.g. HR, DevOps, Support..."
              />
            </div>
            <div>
              <Label>{t("roleColor")}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewRoleColor(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${c.bg} ${newRoleColor === c.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddRole(false)}>{t("cancelChanges")}</Button>
          <Button onClick={handleAddRole} disabled={addingRole || !newRoleName.trim()}>
            {addingRole ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {t("addRole")}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Role Dialog */}
      <DeleteConfirmDialog
        open={!!deleteRoleId}
        onOpenChange={(open) => { if (!open) setDeleteRoleId(null) }}
        onConfirm={handleDeleteRole}
        title={t("deleteRole")}
        itemName={deleteRoleName}
      />
    </div>
  )
}
