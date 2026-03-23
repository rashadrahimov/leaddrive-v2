"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface WorkflowFormData {
  name: string
  entityType: string
  triggerEvent: string
  conditions: string
  isActive: boolean
}

interface WorkflowFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<WorkflowFormData> & { id?: string }
  orgId?: string
}

export function WorkflowForm({ open, onOpenChange, onSaved, initialData, orgId }: WorkflowFormProps) {
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<WorkflowFormData>({
    name: initialData?.name || "",
    entityType: initialData?.entityType || "deal",
    triggerEvent: initialData?.triggerEvent || "created",
    conditions: typeof initialData?.conditions === "string"
      ? initialData.conditions
      : JSON.stringify(initialData?.conditions || {}, null, 2),
    isActive: initialData?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        entityType: initialData?.entityType || "deal",
        triggerEvent: initialData?.triggerEvent || "created",
        conditions: typeof initialData?.conditions === "string"
          ? initialData.conditions
          : JSON.stringify(initialData?.conditions || {}, null, 2),
        isActive: initialData?.isActive ?? true,
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    let conditions: any = {}
    try {
      conditions = form.conditions ? JSON.parse(form.conditions) : {}
    } catch {
      setError("Invalid JSON in conditions")
      setSaving(false)
      return
    }

    try {
      const url = isEdit ? `/api/v1/workflows/${initialData!.id}` : "/api/v1/workflows"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          ...form,
          conditions,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof WorkflowFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? tf("editWorkflowRule") : tf("newWorkflowRule")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{tf("ruleName")} *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="entityType">{tf("entityType")}</Label>
                <Select value={form.entityType} onChange={(e) => update("entityType", e.target.value)}>
                  <option value="deal">{tf("entityDeal")}</option>
                  <option value="lead">{tf("entityLead")}</option>
                  <option value="ticket">{tf("entityTicket")}</option>
                  <option value="task">{tf("entityTask")}</option>
                  <option value="contact">{tf("entityContact")}</option>
                  <option value="company">{tf("entityCompany")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="triggerEvent">{tf("triggerEvent")}</Label>
                <Select value={form.triggerEvent} onChange={(e) => update("triggerEvent", e.target.value)}>
                  <option value="created">{tf("triggerCreated")}</option>
                  <option value="updated">{tf("triggerUpdated")}</option>
                  <option value="status_changed">{tf("triggerStatusChanged")}</option>
                  <option value="stage_changed">{tf("triggerStageChanged")}</option>
                  <option value="assigned">{tf("triggerAssigned")}</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="conditions">{tf("conditionsJson")}</Label>
              <Textarea
                id="conditions"
                value={form.conditions}
                onChange={(e) => update("conditions", e.target.value)}
                rows={4}
                placeholder='{"stage": "WON"}'
                className="font-mono text-sm"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} className="rounded" />
              <span className="text-sm">{tc("active")}</span>
            </label>
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
