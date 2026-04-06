"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Pencil, RefreshCw, Filter, Loader2, Save, X } from "lucide-react"
import { toast } from "sonner"

type AssignmentMethod = "round_robin" | "condition"

interface Condition {
  field: string
  operator: string
  value: string
}

interface AssignmentRule {
  id: string
  name: string
  method: AssignmentMethod
  isActive: boolean
  priority: number
  conditions: Condition[]
  assignees: string[]
  description: string | null
}

const FIELD_OPTIONS = ["source", "estimated_value", "interest", "company_size", "country", "industry"]
const OPERATOR_OPTIONS = ["==", "!=", ">=", "<=", "contains", "starts_with"]

export default function LeadRulesPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [rules, setRules] = useState<AssignmentRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<AssignmentRule>>({})
  const [saving, setSaving] = useState(false)

  const headers = useCallback(() => ({
    "Content-Type": "application/json",
    ...(orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>),
  }), [orgId])

  const loadRules = useCallback(async () => {
    if (!orgId) return
    try {
      const res = await fetch("/api/v1/lead-rules", { headers: headers() })
      const json = await res.json()
      if (json.success) setRules(json.data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [orgId, headers])

  useEffect(() => { loadRules() }, [loadRules])

  const toggleActive = async (rule: AssignmentRule) => {
    try {
      await fetch(`/api/v1/lead-rules/${rule.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ isActive: !rule.isActive }),
      })
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
    } catch { toast.error("Failed to update rule") }
  }

  const deleteRule = async (id: string) => {
    try {
      await fetch(`/api/v1/lead-rules/${id}`, { method: "DELETE", headers: headers() })
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success("Rule deleted")
    } catch { toast.error("Failed to delete rule") }
  }

  const addRule = async () => {
    try {
      const res = await fetch("/api/v1/lead-rules", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name: "New Rule",
          method: "condition",
          isActive: false,
          priority: 50,
          conditions: [{ field: "source", operator: "==", value: "" }],
          assignees: [],
        }),
      })
      const json = await res.json()
      if (json.success) {
        setRules(prev => [...prev, json.data])
        startEdit(json.data)
        toast.success("Rule created")
      }
    } catch { toast.error("Failed to create rule") }
  }

  const startEdit = (rule: AssignmentRule) => {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      description: rule.description || "",
      method: rule.method,
      priority: rule.priority,
      conditions: [...(rule.conditions || [])],
      assignees: [...(rule.assignees || [])],
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/lead-rules/${editingId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify(editForm),
      })
      const json = await res.json()
      if (json.success) {
        setRules(prev => prev.map(r => r.id === editingId ? json.data : r))
        setEditingId(null)
        toast.success("Rule saved")
      }
    } catch { toast.error("Failed to save rule") } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Filter className="h-6 w-6" /> Lead Assignment Rules
          </h1>
          <p className="text-sm text-muted-foreground">Automated lead routing based on conditions or round-robin</p>
        </div>
        <Button onClick={addRule}>
          <Plus className="h-4 w-4 mr-1" /> Add Rule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Rules</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{rules.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Rules</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{rules.filter(r => r.isActive).length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Assignees</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{new Set(rules.flatMap(r => r.assignees || [])).size}</p></CardContent>
        </Card>
      </div>

      {rules.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium mb-2">No assignment rules yet</p>
          <p className="text-sm mb-4">Create rules to automatically route leads to the right team members</p>
          <Button onClick={addRule}><Plus className="h-4 w-4 mr-1" /> Create First Rule</Button>
        </Card>
      )}

      <div className="space-y-3">
        {[...rules].sort((a, b) => a.priority - b.priority).map(rule => (
          <Card key={rule.id} className={rule.isActive ? "" : "opacity-60"}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">
                    {rule.method === "round_robin" ? (
                      <><RefreshCw className="h-3 w-3 mr-1" /> Round Robin</>
                    ) : (
                      <><Filter className="h-3 w-3 mr-1" /> Condition</>
                    )}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Priority: {rule.priority}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleActive(rule)} className="h-7 px-2 text-xs">
                  {rule.isActive ? "Disable" : "Enable"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => editingId === rule.id ? setEditingId(null) : startEdit(rule)} className="h-7 w-7 p-0">
                  {editingId === rule.id ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="h-7 w-7 p-0">
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingId === rule.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Name</label>
                      <Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Priority (lower = first)</label>
                      <Input type="number" value={editForm.priority ?? 50} onChange={e => setEditForm(f => ({ ...f, priority: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Description</label>
                    <Input value={editForm.description || ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Method</label>
                    <select className="border border-border rounded-md px-3 py-2 text-sm bg-background w-full"
                      value={editForm.method || "condition"}
                      onChange={e => setEditForm(f => ({ ...f, method: e.target.value as AssignmentMethod }))}>
                      <option value="condition">Condition-based</option>
                      <option value="round_robin">Round Robin</option>
                    </select>
                  </div>
                  {editForm.method !== "round_robin" && (
                    <div>
                      <label className="text-xs font-medium mb-1 block">Conditions</label>
                      <div className="space-y-2">
                        {(editForm.conditions || []).map((cond, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <select className="border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                              value={cond.field} onChange={e => {
                                const next = [...(editForm.conditions || [])]
                                next[i] = { ...next[i], field: e.target.value }
                                setEditForm(f => ({ ...f, conditions: next }))
                              }}>
                              {FIELD_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <select className="border border-border rounded-md px-2 py-1.5 text-sm bg-background"
                              value={cond.operator} onChange={e => {
                                const next = [...(editForm.conditions || [])]
                                next[i] = { ...next[i], operator: e.target.value }
                                setEditForm(f => ({ ...f, conditions: next }))
                              }}>
                              {OPERATOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <Input className="flex-1" value={cond.value} onChange={e => {
                              const next = [...(editForm.conditions || [])]
                              next[i] = { ...next[i], value: e.target.value }
                              setEditForm(f => ({ ...f, conditions: next }))
                            }} placeholder="Value" />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                              setEditForm(f => ({ ...f, conditions: (f.conditions || []).filter((_, j) => j !== i) }))
                            }}>
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                          setEditForm(f => ({ ...f, conditions: [...(f.conditions || []), { field: "source", operator: "==", value: "" }] }))
                        }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Condition
                        </Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium mb-1 block">Assignees (comma-separated names)</label>
                    <Input value={(editForm.assignees || []).join(", ")}
                      onChange={e => setEditForm(f => ({ ...f, assignees: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                      placeholder="John Doe, Jane Smith" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-medium">{rule.name}</h3>
                  {rule.description && <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>}

                  {(rule.conditions as Condition[])?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {(rule.conditions as Condition[]).map((cond, i) => (
                        <div key={i} className="text-xs font-mono bg-muted/50 rounded px-2 py-1 inline-block mr-2">
                          {cond.field} {cond.operator} &quot;{cond.value}&quot;
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {(rule.assignees as string[])?.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                    ))}
                    {(!rule.assignees || (rule.assignees as string[]).length === 0) && (
                      <span className="text-xs text-muted-foreground">No assignees</span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
