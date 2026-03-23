"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from "next-intl"

interface OfferFormData {
  offerNumber: string
  title: string
  companyId: string
  status: string
  totalAmount: string
  currency: string
  validUntil: string
  notes: string
}

interface OfferFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<OfferFormData> & { id?: string }
  orgId?: string
}

export function OfferForm({ open, onOpenChange, onSaved, initialData, orgId }: OfferFormProps) {
  const t = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<OfferFormData>({
    offerNumber: initialData?.offerNumber || "",
    title: initialData?.title || "",
    companyId: initialData?.companyId || "",
    status: initialData?.status || "draft",
    totalAmount: initialData?.totalAmount || "",
    currency: initialData?.currency || "AZN",
    validUntil: initialData?.validUntil || "",
    notes: initialData?.notes || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        offerNumber: initialData?.offerNumber || "",
        title: initialData?.title || "",
        companyId: initialData?.companyId || "",
        status: initialData?.status || "draft",
        totalAmount: initialData?.totalAmount || "",
        currency: initialData?.currency || "AZN",
        validUntil: initialData?.validUntil || "",
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
      const url = isEdit ? `/api/v1/offers/${initialData!.id}` : "/api/v1/offers"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          ...form,
          totalAmount: form.totalAmount ? parseFloat(form.totalAmount) : undefined,
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

  const update = (key: keyof OfferFormData, value: string) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? t("editOffer") : t("addOffer")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="offerNumber">{t("offerNumber")}</Label>
                <Input id="offerNumber" value={form.offerNumber} onChange={(e) => update("offerNumber", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="title">{tc("title")} *</Label>
                <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="companyId">{tc("company")}</Label>
              <Input id="companyId" value={form.companyId} onChange={(e) => update("companyId", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="status">{tc("status")}</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="draft">{tc("draft")}</option>
                  <option value="sent">{tc("sent")}</option>
                  <option value="accepted">{tc("completed")}</option>
                  <option value="rejected">{tc("cancelled")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="validUntil">{tc("validUntil")}</Label>
                <Input id="validUntil" type="date" value={form.validUntil} onChange={(e) => update("validUntil", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="totalAmount">{tc("amount")}</Label>
                <Input id="totalAmount" type="number" step="0.01" value={form.totalAmount} onChange={(e) => update("totalAmount", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="currency">{tc("currency")}</Label>
                <Input id="currency" value={form.currency} onChange={(e) => update("currency", e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">{tc("notes")}</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
            </div>
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
