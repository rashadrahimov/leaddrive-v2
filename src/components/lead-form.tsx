"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
}

export function LeadForm({ open, onOpenChange, onSaved, initialData, orgId }: LeadFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    contactName: initialData?.contactName || "",
    companyName: initialData?.companyName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    source: initialData?.source || "",
    status: initialData?.status || "new",
    priority: initialData?.priority || "medium",
    estimatedValue: String(initialData?.estimatedValue || ""),
    notes: initialData?.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        contactName: initialData?.contactName || "",
        companyName: initialData?.companyName || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        source: initialData?.source || "",
        status: initialData?.status || "new",
        priority: initialData?.priority || "medium",
        estimatedValue: String(initialData?.estimatedValue || ""),
        notes: initialData?.notes || "",
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/leads/${initialData!.id}` : "/api/v1/leads"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify({ ...form, estimatedValue: parseFloat(form.estimatedValue) || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed")
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const u = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? "Edit Lead" : "New Lead"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name *</Label><Input value={form.contactName} onChange={e => u("contactName", e.target.value)} required /></div>
              <div><Label>Company Name</Label><Input value={form.companyName} onChange={e => u("companyName", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => u("email", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => u("phone", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Source</Label><Select value={form.source} onChange={e => u("source", e.target.value)}><option value="">Select...</option><option value="website">Website</option><option value="referral">Referral</option><option value="cold_call">Cold Call</option><option value="linkedin">LinkedIn</option></Select></div>
              <div><Label>Priority</Label><Select value={form.priority} onChange={e => u("priority", e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select></div>
              <div><Label>Est. Value</Label><Input type="number" value={form.estimatedValue} onChange={e => u("estimatedValue", e.target.value)} placeholder="0" /></div>
            </div>
            {isEdit && (
              <div><Label>Status</Label><Select value={form.status} onChange={e => u("status", e.target.value)}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="converted">Converted</option><option value="lost">Lost</option></Select></div>
            )}
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => u("notes", e.target.value)} rows={2} /></div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update" : "Create Lead"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
