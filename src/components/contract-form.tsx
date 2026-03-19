"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface ContractFormData {
  contractNumber: string
  title: string
  companyId: string
  type: string
  status: string
  startDate: string
  endDate: string
  valueAmount: string
  currency: string
  notes: string
}

interface ContractFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<ContractFormData> & { id?: string }
  orgId?: string
}

export function ContractForm({ open, onOpenChange, onSaved, initialData, orgId }: ContractFormProps) {
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<ContractFormData>({
    contractNumber: initialData?.contractNumber || "",
    title: initialData?.title || "",
    companyId: initialData?.companyId || "",
    type: initialData?.type || "service_agreement",
    status: initialData?.status || "draft",
    startDate: initialData?.startDate || "",
    endDate: initialData?.endDate || "",
    valueAmount: initialData?.valueAmount || "",
    currency: initialData?.currency || "AZN",
    notes: initialData?.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        contractNumber: initialData?.contractNumber || "",
        title: initialData?.title || "",
        companyId: initialData?.companyId || "",
        type: initialData?.type || "service_agreement",
        status: initialData?.status || "draft",
        startDate: initialData?.startDate || "",
        endDate: initialData?.endDate || "",
        valueAmount: initialData?.valueAmount || "",
        currency: initialData?.currency || "AZN",
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
      const url = isEdit ? `/api/v1/contracts/${initialData!.id}` : "/api/v1/contracts"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          ...form,
          valueAmount: form.valueAmount ? parseFloat(form.valueAmount) : undefined,
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

  const update = (key: keyof ContractFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Contract" : "Add Contract"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="contractNumber">Contract Number</Label>
                <Input id="contractNumber" value={form.contractNumber} onChange={(e) => update("contractNumber", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="companyId">Company ID</Label>
              <Input id="companyId" value={form.companyId} onChange={(e) => update("companyId", e.target.value)} placeholder="Company UUID" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)}>
                  <option value="service_agreement">Service Agreement</option>
                  <option value="nda">NDA</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="license">License</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valueAmount">Value Amount</Label>
                <Input id="valueAmount" type="number" step="0.01" value={form.valueAmount} onChange={(e) => update("valueAmount", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={form.currency} onChange={(e) => update("currency", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
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
