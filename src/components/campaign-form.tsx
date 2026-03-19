"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface CampaignFormData {
  name: string
  type: string
  status: string
  subject: string
  templateId: string
  scheduledAt: string
  totalRecipients: string
  budget: string
}

interface CampaignFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<CampaignFormData> & { id?: string }
  orgId?: string
}

export function CampaignForm({ open, onOpenChange, onSaved, initialData, orgId }: CampaignFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<CampaignFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "email",
    status: initialData?.status || "draft",
    subject: initialData?.subject || "",
    templateId: initialData?.templateId || "",
    scheduledAt: initialData?.scheduledAt || "",
    totalRecipients: initialData?.totalRecipients || "",
    budget: initialData?.budget || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        type: initialData?.type || "email",
        status: initialData?.status || "draft",
        subject: initialData?.subject || "",
        templateId: initialData?.templateId || "",
        scheduledAt: initialData?.scheduledAt || "",
        totalRecipients: initialData?.totalRecipients || "",
        budget: initialData?.budget || "",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/campaigns/${initialData!.id}` : "/api/v1/campaigns"
      const payload = {
        ...form,
        totalRecipients: form.totalRecipients ? Number(form.totalRecipients) : undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      }
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify(payload),
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

  const update = (key: keyof CampaignFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Campaign" : "Add Campaign"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sending">Sending</option>
                  <option value="sent">Sent</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={form.subject} onChange={(e) => update("subject", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="templateId">Template ID</Label>
              <Input id="templateId" value={form.templateId} onChange={(e) => update("templateId", e.target.value)} placeholder="Optional template reference" />
            </div>
            <div>
              <Label htmlFor="scheduledAt">Scheduled At</Label>
              <Input id="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={(e) => update("scheduledAt", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="totalRecipients">Total Recipients</Label>
                <Input id="totalRecipients" type="number" value={form.totalRecipients} onChange={(e) => update("totalRecipients", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" type="number" step="0.01" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
              </div>
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
