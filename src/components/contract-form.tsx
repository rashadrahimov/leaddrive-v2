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

interface Company {
  id: string
  name: string
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
    contractNumber: "",
    title: "",
    companyId: "",
    type: "service_agreement",
    status: "draft",
    startDate: "",
    endDate: "",
    valueAmount: "",
    currency: "AZN",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [companies, setCompanies] = useState<Company[]>([])

  useEffect(() => {
    if (open && orgId) {
      fetch("/api/v1/companies?limit=500&category=all", {
        headers: { "x-organization-id": String(orgId) },
      }).then(r => r.json()).then(j => {
        if (j.success) setCompanies(j.data.companies || [])
      }).catch(() => {})
    }
  }, [open, orgId])

  useEffect(() => {
    if (open) {
      const sd = initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : ""
      const ed = initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : ""
      setForm({
        contractNumber: initialData?.contractNumber || "",
        title: initialData?.title || "",
        companyId: initialData?.companyId || "",
        type: initialData?.type || "service_agreement",
        status: initialData?.status || "draft",
        startDate: sd,
        endDate: ed,
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
          valueAmount: form.valueAmount ? parseFloat(String(form.valueAmount)) : undefined,
          companyId: form.companyId || undefined,
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
        <DialogTitle>{isEdit ? "Редактировать контракт" : "Новый контракт"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="contractNumber">Номер контракта</Label>
                <Input id="contractNumber" value={form.contractNumber} onChange={(e) => update("contractNumber", e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="title">Название *</Label>
                <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="companyId">Компания</Label>
              <Select value={form.companyId} onChange={(e) => update("companyId", e.target.value)}>
                <option value="">— Не выбрана —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Тип</Label>
                <Select value={form.type} onChange={(e) => update("type", e.target.value)}>
                  <option value="service_agreement">Договор услуг</option>
                  <option value="nda">NDA</option>
                  <option value="maintenance">Обслуживание</option>
                  <option value="license">Лицензия</option>
                  <option value="sla">SLA</option>
                  <option value="other">Другое</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="draft">Черновик</option>
                  <option value="sent">Отправлен</option>
                  <option value="signed">Подписан</option>
                  <option value="active">Активный</option>
                  <option value="expiring">Истекает</option>
                  <option value="expired">Истёк</option>
                  <option value="renewed">Продлён</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate">Дата начала</Label>
                <Input id="startDate" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="endDate">Дата окончания</Label>
                <Input id="endDate" type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="valueAmount">Сумма</Label>
                <Input id="valueAmount" type="number" step="0.01" value={form.valueAmount} onChange={(e) => update("valueAmount", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="currency">Валюта</Label>
                <Select value={form.currency} onChange={(e) => update("currency", e.target.value)}>
                  <option value="AZN">AZN (₼)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="RUB">RUB (₽)</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Примечания</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button type="submit" disabled={saving}>{saving ? "Сохранение..." : isEdit ? "Обновить" : "Создать"}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
