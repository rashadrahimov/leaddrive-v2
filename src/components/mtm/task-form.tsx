"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: any
  orgId?: string
}

export function MtmTaskForm({ open, onOpenChange, onSaved, initialData, orgId }: TaskFormProps) {
  const tc = useTranslations("common")
  const tf = useTranslations("mtmForms")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({ title: "", description: "", agentId: "", customerId: "", priority: "MEDIUM", status: "PENDING", dueDate: "" })
  const [agents, setAgents] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        title: initialData?.title || "", description: initialData?.description || "",
        agentId: initialData?.agentId || "", customerId: initialData?.customerId || "",
        priority: initialData?.priority || "MEDIUM", status: initialData?.status || "PENDING",
        dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
      })
      setError("")
      const headers = orgId ? { "x-organization-id": orgId } : {} as Record<string, string>
      Promise.all([
        fetch("/api/v1/mtm/agents?limit=200", { headers }).then(r => r.json()),
        fetch("/api/v1/mtm/customers?limit=200", { headers }).then(r => r.json()),
      ]).then(([a, c]) => {
        if (a.success) setAgents(a.data.agents || [])
        if (c.success) setCustomers(c.data.customers || [])
      }).catch(() => {})
    }
  }, [open, initialData])

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/mtm/tasks/${initialData!.id}` : "/api/v1/mtm/tasks"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify({ ...form, customerId: form.customerId || null, dueDate: form.dueDate || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || tc("failedToSave"))
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? tf("editTask") : tf("addTask")}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div><Label htmlFor="title">{`${tc("title")} *`}</Label><Input id="title" value={form.title} onChange={e => update("title", e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="agentId">{`${tf("agent")} *`}</Label>
                <Select value={form.agentId} onChange={e => update("agentId", e.target.value)} required>
                  <option value="">{tf("selectAgent")}</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="customerId">{tf("customer")}</Label>
                <Select value={form.customerId} onChange={e => update("customerId", e.target.value)}>
                  <option value="">{tf("none")}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="priority">{tc("priority")}</Label>
                <Select value={form.priority} onChange={e => update("priority", e.target.value)}>
                  <option value="LOW">{tc("low")}</option>
                  <option value="MEDIUM">{tc("medium")}</option>
                  <option value="HIGH">{tc("high")}</option>
                  <option value="URGENT">{tc("urgent")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">{tc("status")}</Label>
                <Select value={form.status} onChange={e => update("status", e.target.value)}>
                  <option value="PENDING">{tc("pending")}</option>
                  <option value="IN_PROGRESS">{tc("inProgress")}</option>
                  <option value="COMPLETED">{tc("completed")}</option>
                  <option value="CANCELLED">{tc("cancelled")}</option>
                </Select>
              </div>
              <div><Label htmlFor="dueDate">{tc("dueDate")}</Label><Input id="dueDate" type="date" value={form.dueDate} onChange={e => update("dueDate", e.target.value)} /></div>
            </div>
            <div><Label htmlFor="description">{tc("description")}</Label><Textarea id="description" value={form.description} onChange={e => update("description", e.target.value)} rows={3} /></div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
          <Button type="submit" disabled={saving}>{saving ? tc("saving") : isEdit ? tc("update") : tc("create")}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
