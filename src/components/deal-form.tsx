"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { DEFAULT_CURRENCY, CURRENCY_SYMBOLS } from "@/lib/constants"

interface DealFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Record<string, any>
  orgId?: string
  pipelineId?: string
}

export function DealForm({ open, onOpenChange, onSaved, initialData, orgId, pipelineId }: DealFormProps) {
  const t = useTranslations("forms")
  const tc = useTranslations("common")
  const td = useTranslations("deals")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    name: initialData?.name || "",
    companyId: initialData?.companyId || "",
    campaignId: initialData?.campaignId || "",
    stage: initialData?.stage || "LEAD",
    valueAmount: String(initialData?.valueAmount || "0"),
    currency: initialData?.currency || DEFAULT_CURRENCY,
    probability: String(initialData?.probability || "10"),
    expectedClose: initialData?.expectedClose?.slice(0, 10) || "",
    notes: initialData?.notes || "",
  })
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        name: initialData?.name || "",
        companyId: initialData?.companyId || "",
        campaignId: initialData?.campaignId || "",
        stage: initialData?.stage || "LEAD",
        valueAmount: String(initialData?.valueAmount || "0"),
        currency: initialData?.currency || DEFAULT_CURRENCY,
        probability: String(initialData?.probability || "10"),
        expectedClose: initialData?.expectedClose?.slice(0, 10) || "",
        notes: initialData?.notes || "",
      })
      setError("")
    }
  }, [open, initialData])

  useEffect(() => {
    if (open && orgId) {
      fetch("/api/v1/companies?limit=500", {
        headers: { "x-organization-id": orgId },
      }).then(r => r.json()).then(j => {
        if (j.success) setCompanies(j.data.companies.map((c: any) => ({ id: c.id, name: c.name })))
      }).catch(() => {})
      fetch("/api/v1/campaigns?limit=500", {
        headers: { "x-organization-id": orgId },
      }).then(r => r.json()).then(j => {
        if (j.success) setCampaigns(j.data.campaigns.map((c: any) => ({ id: c.id, name: c.name })))
      }).catch(() => {})
    }
  }, [open, orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const payload = {
        name: form.name,
        companyId: form.companyId || undefined,
        campaignId: form.campaignId || undefined,
        pipelineId: pipelineId || undefined,
        stage: form.stage,
        valueAmount: parseFloat(form.valueAmount) || 0,
        currency: form.currency,
        probability: parseInt(form.probability) || 0,
        expectedClose: form.expectedClose || undefined,
        notes: form.notes || undefined,
      }
      const url = isEdit ? `/api/v1/deals/${initialData!.id}` : "/api/v1/deals"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || tc("errorUpdateFailed"))
      onSaved()
      onOpenChange(false)
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{isEdit ? t("editDeal") : t("newDeal")}</DialogTitle></DialogHeader>
      <DialogContent>
        <form id="deal-form" onSubmit={handleSubmit}>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{tc("name")} *</Label>
              <Input id="name" value={form.name} onChange={e => update("name", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="companyId">{tc("company")}</Label>
                <Select value={form.companyId} onChange={e => update("companyId", e.target.value)}>
                  <option value="">{tc("select")}...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="campaignId">{t("campaignForRoi")}</Label>
                <Select value={form.campaignId} onChange={e => update("campaignId", e.target.value)}>
                  <option value="">{t("noCampaign")}</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stage">{tc("status")}</Label>
                <Select value={form.stage} onChange={e => update("stage", e.target.value)}>
                  <option value="LEAD">{td("stageLead")}</option>
                  <option value="QUALIFIED">{td("stageQualified")}</option>
                  <option value="PROPOSAL">{td("stageProposal")}</option>
                  <option value="NEGOTIATION">{td("stageNegotiation")}</option>
                  <option value="WON">{td("stageWon")}</option>
                  <option value="LOST">{td("stageLost")}</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="probability">{tc("probability")} %</Label>
                <Input id="probability" type="number" min="0" max="100" value={form.probability} onChange={e => update("probability", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valueAmount">{tc("amount")}</Label>
                <Input id="valueAmount" type="number" min="0" step="0.01" value={form.valueAmount} onChange={e => update("valueAmount", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="currency">{tc("currency")}</Label>
                <Select value={form.currency} onChange={e => update("currency", e.target.value)}>
                  {Object.entries(CURRENCY_SYMBOLS).map(([code, sym]) => (
                    <option key={code} value={code}>{code} {sym}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="expectedClose">{tc("dueDate")}</Label>
              <Input id="expectedClose" type="date" value={form.expectedClose} onChange={e => update("expectedClose", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="notes">{tc("notes")}</Label>
              <Textarea id="notes" value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} />
            </div>
          </div>
        </form>
      </DialogContent>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc("cancel")}</Button>
        <Button type="submit" form="deal-form" disabled={saving}>{saving ? tc("saving") : isEdit ? tc("update") : tc("create")}</Button>
      </DialogFooter>
    </Dialog>
  )
}
