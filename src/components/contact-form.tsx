"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface ContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
}

export function ContactForm({ open, onOpenChange, onSaved, initialData, orgId }: ContactFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    fullName: initialData?.fullName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    position: initialData?.position || "",
    companyId: initialData?.companyId || "",
    source: initialData?.source || "",
  })
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open && orgId) {
      fetch("/api/v1/companies?limit=500", {
        headers: { "x-organization-id": orgId },
      }).then(r => r.json()).then(j => {
        if (j.success) setCompanies(j.data.companies.map((c: any) => ({ id: c.id, name: c.name })))
      }).catch(() => {})
    }
  }, [open, orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/contacts/${initialData!.id}` : "/api/v1/contacts"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify({ ...form, companyId: form.companyId || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" value={form.fullName} onChange={e => update("fullName", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={form.email} onChange={e => update("email", e.target.value)} /></div>
              <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={e => update("phone", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="position">Position</Label><Input id="position" value={form.position} onChange={e => update("position", e.target.value)} /></div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select value={form.source} onChange={e => update("source", e.target.value)}>
                  <option value="">Select...</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="cold_call">Cold Call</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="event">Event</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="companyId">Company</Label>
              <Select value={form.companyId} onChange={e => update("companyId", e.target.value)}>
                <option value="">No company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
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
