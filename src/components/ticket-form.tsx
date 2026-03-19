"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface TicketFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
}

export function TicketForm({ open, onOpenChange, onSaved, initialData, orgId }: TicketFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    subject: initialData?.subject || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "medium",
    category: initialData?.category || "general",
    status: initialData?.status || "new",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/tickets/${initialData!.id}` : "/api/v1/tickets"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? "Edit Ticket" : "New Ticket"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div><Label>Subject *</Label><Input value={form.subject} onChange={e => u("subject", e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><Select value={form.priority} onChange={e => u("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></Select></div>
              <div><Label>Category</Label><Select value={form.category} onChange={e => u("category", e.target.value)}><option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="feature_request">Feature Request</option></Select></div>
            </div>
            {isEdit && (
              <div><Label>Status</Label><Select value={form.status} onChange={e => u("status", e.target.value)}><option value="new">New</option><option value="in_progress">In Progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select></div>
            )}
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => u("description", e.target.value)} rows={4} /></div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create Ticket"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
