"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface JourneyFormData {
  name: string
  description: string
  status: string
  triggerType: string
}

interface JourneyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<JourneyFormData> & { id?: string }
  orgId?: string
}

export function JourneyForm({ open, onOpenChange, onSaved, initialData, orgId }: JourneyFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<JourneyFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    status: initialData?.status || "draft",
    triggerType: initialData?.triggerType || "lead_created",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        description: initialData?.description || "",
        status: initialData?.status || "draft",
        triggerType: initialData?.triggerType || "lead_created",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/journeys/${initialData!.id}` : "/api/v1/journeys"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
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

  const update = (key: keyof JourneyFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Journey" : "Add Journey"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Journey Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select value={form.triggerType} onChange={(e) => update("triggerType", e.target.value)}>
                  <option value="lead_created">Lead Created</option>
                  <option value="contact_created">Contact Created</option>
                  <option value="deal_stage_change">Deal Stage Change</option>
                  <option value="manual">Manual</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
