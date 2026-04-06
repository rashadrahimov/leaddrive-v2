"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Shield, Save, Loader2, RotateCcw, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"

const ENTITY_TYPES = [
  { value: "company", label: "Companies" },
  { value: "contact", label: "Contacts" },
  { value: "deal", label: "Deals" },
  { value: "lead", label: "Leads" },
  { value: "ticket", label: "Tickets" },
]

const ROLES = ["admin", "manager", "sales", "support", "viewer"]

const ACCESS_OPTIONS = [
  { value: "editable", label: "Edit", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { value: "visible", label: "View", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "hidden", label: "Hidden", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
]

interface SharingRule {
  id: string
  entityType: string
  name: string
  description?: string
  ruleType: string
  sourceRole?: string
  targetRole?: string
  accessLevel: string
  isActive: boolean
}

export default function FieldPermissionsPage() {
  const { data: session } = useSession()
  const t = useTranslations()

  const [entityType, setEntityType] = useState("company")
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({})
  const [fields, setFields] = useState<{ name: string; label: string; sensitive?: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<string, Record<string, string>>>({})

  // Sharing rules state
  const [rules, setRules] = useState<SharingRule[]>([])
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<SharingRule | null>(null)
  const [ruleForm, setRuleForm] = useState({
    entityType: "deal", name: "", description: "", ruleType: "role",
    sourceRole: "", targetRole: "", accessLevel: "read",
  })
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  const loadPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/settings/field-permissions?entityType=${entityType}`)
      const data = await res.json()
      if (data.success) {
        setMatrix(data.data[entityType] || {})
        // Get field definitions from response keys or fetch entity-fields
        const fieldNames = Object.keys(data.data[entityType] || {})
        if (fieldNames.length > 0) {
          setFields(fieldNames.map(n => ({ name: n, label: n })))
        }
      }
      // Also load field definitions
      const fieldsModule = await import("@/lib/entity-fields")
      setFields(fieldsModule.ENTITY_FIELDS[entityType] || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [entityType])

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/settings/sharing-rules")
      const data = await res.json()
      if (data.success) setRules(data.data)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { loadPermissions() }, [loadPermissions])
  useEffect(() => { loadRules() }, [loadRules])

  const getAccess = (fieldName: string, roleId: string) => {
    return changes[fieldName]?.[roleId] ?? matrix[fieldName]?.[roleId] ?? "editable"
  }

  const setAccess = (fieldName: string, roleId: string, access: string) => {
    if (roleId === "admin") return // Admin always editable
    setChanges(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], [roleId]: access },
    }))
  }

  const cycleAccess = (fieldName: string, roleId: string) => {
    const current = getAccess(fieldName, roleId)
    const cycle = ["editable", "visible", "hidden"]
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length]
    setAccess(fieldName, roleId, next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: { roleId: string; entityType: string; fieldName: string; access: string }[] = []
      for (const [fieldName, roles] of Object.entries(changes)) {
        for (const [roleId, access] of Object.entries(roles)) {
          updates.push({ roleId, entityType, fieldName, access })
        }
      }
      if (updates.length === 0) return

      const res = await fetch("/api/v1/settings/field-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.success) {
        setChanges({})
        loadPermissions()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRule = async () => {
    try {
      const url = editingRule
        ? `/api/v1/settings/sharing-rules/${editingRule.id}`
        : "/api/v1/settings/sharing-rules"
      const method = editingRule ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleForm),
      })
      if (res.ok) {
        setRuleDialogOpen(false)
        setEditingRule(null)
        loadRules()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return
    try {
      await fetch(`/api/v1/settings/sharing-rules/${deleteRuleId}`, { method: "DELETE" })
      setDeleteRuleId(null)
      loadRules()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleRuleActive = async (rule: SharingRule) => {
    try {
      await fetch(`/api/v1/settings/sharing-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      loadRules()
    } catch (e) {
      console.error(e)
    }
  }

  const getAccessBadge = (access: string) => {
    const opt = ACCESS_OPTIONS.find(o => o.value === access)
    return opt || ACCESS_OPTIONS[0]
  }

  const hasChanges = Object.keys(changes).length > 0

  return (
    <div className="space-y-6">
      <PageDescription
        title="Field Permissions"
        description="Control visibility and editability of fields per role. Admin always has full access."
      />

      {/* Permission Matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Field Permission Matrix
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={entityType} onChange={e => { setEntityType(e.target.value); setChanges({}) }} className="w-[180px]">
                {ENTITY_TYPES.map(et => (
                  <option key={et.value} value={et.value}>{et.label}</option>
                ))}
            </Select>
            {hasChanges && (
              <>
                <Button variant="outline" size="sm" onClick={() => setChanges({})}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset Defaults
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Field</th>
                    {ROLES.map(role => (
                      <th key={role} className="text-center py-2 px-2 font-medium capitalize">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map(field => (
                    <tr key={field.name} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <span>{field.label}</span>
                        {field.sensitive && (
                          <Badge variant="outline" className="ml-2 text-xs">sensitive</Badge>
                        )}
                      </td>
                      {ROLES.map(role => {
                        const access = getAccess(field.name, role)
                        const badge = getAccessBadge(access)
                        const isAdmin = role === "admin"
                        const isChanged = changes[field.name]?.[role] !== undefined
                        return (
                          <td key={role} className="text-center py-2 px-2">
                            <button
                              onClick={() => cycleAccess(field.name, role)}
                              disabled={isAdmin}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${badge.color} ${isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"} ${isChanged ? "ring-2 ring-primary" : ""}`}
                            >
                              {badge.label}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sharing Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Sharing Rules</CardTitle>
          <Button size="sm" onClick={() => {
            setEditingRule(null)
            setRuleForm({ entityType: "deal", name: "", description: "", ruleType: "role", sourceRole: "", targetRole: "", accessLevel: "read" })
            setRuleDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" /> New Rule
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No sharing rules configured. By default, users see only their own records.</p>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {rule.entityType} | {rule.ruleType === "all" ? "All users" : `${rule.sourceRole || "—"} → ${rule.targetRole || "—"}`} | {rule.accessLevel}
                    </div>
                    {rule.description && <div className="text-xs text-muted-foreground mt-1">{rule.description}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRuleActive(rule)} className="text-muted-foreground hover:text-foreground">
                      {rule.isActive ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingRule(rule)
                      setRuleForm({
                        entityType: rule.entityType, name: rule.name, description: rule.description || "",
                        ruleType: rule.ruleType, sourceRole: rule.sourceRole || "", targetRole: rule.targetRole || "",
                        accessLevel: rule.accessLevel,
                      })
                      setRuleDialogOpen(true)
                    }}>
                      <Shield className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteRuleId(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Sharing Rule" : "New Sharing Rule"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Entity Type</Label>
              <Select value={ruleForm.entityType} onChange={e => setRuleForm(p => ({ ...p, entityType: e.target.value }))}>
                  {ENTITY_TYPES.map(et => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Rule Type</Label>
              <Select value={ruleForm.ruleType} onChange={e => setRuleForm(p => ({ ...p, ruleType: e.target.value }))}>
                  <option value="owner">Owner Only</option>
                  <option value="role">Role → Role</option>
                  <option value="all">All Users</option>
              </Select>
            </div>
            {ruleForm.ruleType === "role" && (
              <>
                <div className="grid gap-2">
                  <Label>Source Role (whose records)</Label>
                  <Select value={ruleForm.sourceRole} onChange={e => setRuleForm(p => ({ ...p, sourceRole: e.target.value }))}>
                      <option value="">Select...</option>
                      {ROLES.filter(r => r !== "admin").map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Target Role (who gets access)</Label>
                  <Select value={ruleForm.targetRole} onChange={e => setRuleForm(p => ({ ...p, targetRole: e.target.value }))}>
                      <option value="">Select...</option>
                      {ROLES.filter(r => r !== "admin").map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                  </Select>
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label>Access Level</Label>
              <Select value={ruleForm.accessLevel} onChange={e => setRuleForm(p => ({ ...p, accessLevel: e.target.value }))}>
                  <option value="read">Read Only</option>
                  <option value="readwrite">Read & Write</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={ruleForm.description} onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} disabled={!ruleForm.name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteRuleId}
        onOpenChange={() => setDeleteRuleId(null)}
        onConfirm={handleDeleteRule}
        title="Delete Sharing Rule"
        description="Are you sure you want to delete this sharing rule?"
      />
    </div>
  )
}
