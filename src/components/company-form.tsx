"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface CompanyFormData {
  name: string
  industry: string
  website: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  status: string
  description: string
  slaPolicyId: string | null
}

interface SlaPolicyOption {
  id: string
  name: string
  priority: string
  resolutionHours: number
}

interface CompanyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<CompanyFormData> & { id?: string }
  orgId?: string
}

export function CompanyForm({ open, onOpenChange, onSaved, initialData, orgId }: CompanyFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<CompanyFormData>({
    name: initialData?.name || "",
    industry: initialData?.industry || "",
    website: initialData?.website || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    country: initialData?.country || "",
    status: initialData?.status || "prospect",
    description: initialData?.description || "",
    slaPolicyId: (initialData as any)?.slaPolicyId || null,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicyOption[]>([])

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        industry: initialData?.industry || "",
        website: initialData?.website || "",
        phone: initialData?.phone || "",
        email: initialData?.email || "",
        address: initialData?.address || "",
        city: initialData?.city || "",
        country: initialData?.country || "",
        status: initialData?.status || "prospect",
        description: initialData?.description || "",
        slaPolicyId: (initialData as any)?.slaPolicyId || null,
      })
      setError("")
      // Fetch SLA policies
      fetch("/api/v1/sla-policies", {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
        .then(r => r.json())
        .then(json => {
          if (json.success) setSlaPolicies(json.data || [])
        })
        .catch(() => {})
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/companies/${initialData!.id}` : "/api/v1/companies"
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

  const update = (key: keyof CompanyFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" value={form.industry} onChange={(e) => update("industry", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={(e) => update("country", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="slaPolicy">SLA Policy</Label>
              <Select
                value={form.slaPolicyId || ""}
                onChange={(e) => setForm(f => ({ ...f, slaPolicyId: e.target.value || null }))}
              >
                <option value="">— По умолчанию (по приоритету) —</option>
                {slaPolicies.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.priority} ({p.resolutionHours}ч)
                  </option>
                ))}
              </Select>
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
