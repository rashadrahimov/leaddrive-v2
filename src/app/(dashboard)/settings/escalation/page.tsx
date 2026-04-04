"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { DataTable } from "@/components/data-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Loader2, AlertTriangle, Zap } from "lucide-react"

interface EscalationRule {
  id: string
  name: string
  triggerType: string
  triggerMinutes: number
  level: number
  actions: { type: string; target?: string }[]
  isActive: boolean
  createdAt: string
}

interface RuleFormData {
  name: string
  triggerType: string
  triggerMinutes: number
  level: number
  actionType: string
  actionTarget: string
  isActive: boolean
}

const TRIGGER_LABELS: Record<string, string> = {
  first_response_breach: "First Response Breach",
  resolution_breach: "Resolution Breach",
  resolution_warning: "Resolution Warning",
}

const ACTION_LABELS: Record<string, string> = {
  notify: "Notify",
  increase_priority: "Increase Priority",
  reassign: "Reassign Ticket",
}

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  3: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  4: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-300",
  5: "bg-red-300 text-red-950 dark:bg-red-900/70 dark:text-red-200",
}

function RuleFormDialog({
  open,
  onOpenChange,
  onSaved,
  orgId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  orgId?: string
}) {
  const [form, setForm] = useState<RuleFormData>({
    name: "",
    triggerType: "first_response_breach",
    triggerMinutes: 0,
    level: 1,
    actionType: "notify",
    actionTarget: "manager",
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        triggerType: "first_response_breach",
        triggerMinutes: 0,
        level: 1,
        actionType: "notify",
        actionTarget: "manager",
        isActive: true,
      })
      setError("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const actions = [
        {
          type: form.actionType,
          ...(form.actionType === "notify" ? { target: form.actionTarget } : {}),
        },
      ]

      const res = await fetch("/api/v1/escalation-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          name: form.name,
          triggerType: form.triggerType,
          triggerMinutes: form.triggerMinutes,
          level: form.level,
          actions,
          isActive: form.isActive,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create rule")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Create Escalation Rule</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">
              {error}
            </div>
          )}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. L1 - Notify manager on first response breach"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select
                  value={form.triggerType}
                  onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
                >
                  <option value="first_response_breach">First Response Breach</option>
                  <option value="resolution_breach">Resolution Breach</option>
                  <option value="resolution_warning">Resolution Warning</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="level">Escalation Level (1-5)</Label>
                <Input
                  id="level"
                  type="number"
                  min={1}
                  max={5}
                  value={form.level}
                  onChange={(e) => setForm((f) => ({ ...f, level: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="triggerMinutes">
                {form.triggerType === "resolution_warning"
                  ? "Minutes before SLA breach"
                  : "Minutes after SLA breach"}
              </Label>
              <Input
                id="triggerMinutes"
                type="number"
                min={0}
                value={form.triggerMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, triggerMinutes: parseInt(e.target.value) || 0 }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {form.triggerType === "resolution_warning"
                  ? "How many minutes before the SLA deadline to trigger this rule"
                  : "0 = immediately on breach, or set delay in minutes after breach"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="actionType">Action</Label>
                <Select
                  value={form.actionType}
                  onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}
                >
                  <option value="notify">Notify</option>
                  <option value="increase_priority">Increase Priority</option>
                  <option value="reassign">Reassign Ticket</option>
                </Select>
              </div>
              {form.actionType === "notify" && (
                <div>
                  <Label htmlFor="actionTarget">Notify Target</Label>
                  <Select
                    value={form.actionTarget}
                    onChange={(e) => setForm((f) => ({ ...f, actionTarget: e.target.value }))}
                  >
                    <option value="manager">Managers</option>
                    <option value="admin">Admins Only</option>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create Rule"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}

export default function EscalationSettingsPage() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<EscalationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<EscalationRule | null>(null)
  const orgId = session?.user?.organizationId

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/v1/escalation-rules", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setRules(json.data)
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [session])

  const handleToggleActive = async (rule: EscalationRule) => {
    await fetch(`/api/v1/escalation-rules/${rule.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {}),
      },
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    fetchRules()
  }

  const confirmDelete = async () => {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/escalation-rules/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchRules()
  }

  const columns = [
    {
      key: "level",
      label: "Level",
      sortable: true,
      render: (item: EscalationRule) => (
        <Badge className={LEVEL_COLORS[item.level] || LEVEL_COLORS[3]}>L{item.level}</Badge>
      ),
    },
    {
      key: "name",
      label: "Rule Name",
      sortable: true,
      render: (item: EscalationRule) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "triggerType",
      label: "Trigger",
      render: (item: EscalationRule) => (
        <div>
          <span className="text-sm">{TRIGGER_LABELS[item.triggerType] || item.triggerType}</span>
          {item.triggerMinutes > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              ({item.triggerMinutes}min)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: EscalationRule) => (
        <div className="flex flex-wrap gap-1">
          {item.actions.map((a, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {ACTION_LABELS[a.type] || a.type}
              {a.target ? ` (${a.target})` : ""}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (item: EscalationRule) => (
        <Badge
          className={`cursor-pointer ${
            item.isActive
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={() => handleToggleActive(item)}
        >
          {item.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "delete",
      label: "",
      render: (item: EscalationRule) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteItem(item)
            setDeleteOpen(true)
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Escalation Rules</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escalation Rules</h1>
          <p className="text-sm text-muted-foreground">
            Configure automatic escalation when SLA deadlines are breached
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No escalation rules</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Create rules to automatically escalate tickets when SLA deadlines are missed. Rules can
            notify managers, increase priority, or reassign tickets.
          </p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create First Rule
          </Button>
        </div>
      ) : (
        <DataTable
          data={rules as any}
          columns={columns as any}
          searchKey="name"
          searchPlaceholder="Search rules..."
        />
      )}

      <RuleFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchRules} orgId={orgId} />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Escalation Rule"
        itemName={deleteItem?.name}
      />
    </div>
  )
}
