"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface SlaPolicyFormData {
  name: string
  priority: string
  firstResponseHours: number
  resolutionHours: number
  businessHoursOnly: boolean
  isActive: boolean
}

interface SlaPolicyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<SlaPolicyFormData> & { id?: string }
  orgId?: string
}

export function SlaPolicyForm({ open, onOpenChange, onSaved, initialData, orgId }: SlaPolicyFormProps) {
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<SlaPolicyFormData>({
    name: "",
    priority: "medium",
    firstResponseHours: 4,
    resolutionHours: 24,
    businessHoursOnly: true,
    isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        priority: initialData?.priority || "medium",
        firstResponseHours: initialData?.firstResponseHours ?? 4,
        resolutionHours: initialData?.resolutionHours ?? 24,
        businessHoursOnly: initialData?.businessHoursOnly ?? true,
        isActive: initialData?.isActive ?? true,
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/sla-policies/${initialData!.id}` : "/api/v1/sla-policies"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>),
        },
        body: JSON.stringify(form),
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

  const update = (key: keyof SlaPolicyFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? tf("editSlaPolicy") : tf("newSlaPolicy")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{tf("policyName")} *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Critical SLA" required />
            </div>
            <div>
              <Label htmlFor="priority">{tc("priority")}</Label>
              <Select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
                <option value="critical">{tc("critical")}</option>
                <option value="high">{tc("high")}</option>
                <option value="medium">{tc("medium")}</option>
                <option value="low">{tc("low")}</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstResponseHours">{tf("responseTimeHours")} *</Label>
                <Input id="firstResponseHours" type="number" step="0.5" min="0.5" value={form.firstResponseHours} onChange={(e) => update("firstResponseHours", parseFloat(e.target.value) || 1)} required />
              </div>
              <div>
                <Label htmlFor="resolutionHours">{tf("resolutionTimeHours")} *</Label>
                <Input id="resolutionHours" type="number" step="0.5" min="0.5" value={form.resolutionHours} onChange={(e) => update("resolutionHours", parseFloat(e.target.value) || 1)} required />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.businessHoursOnly} onChange={(e) => update("businessHoursOnly", e.target.checked)} className="rounded" />
              <span className="text-sm">{tf("businessHoursOnly")}</span>
            </label>
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
