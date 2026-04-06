"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"

interface CurrencyFormData {
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBase: boolean
}

interface CurrencyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: Partial<CurrencyFormData> & { id?: string }
  orgId?: string
}

export function CurrencyForm({ open, onOpenChange, onSaved, initialData, orgId }: CurrencyFormProps) {
  const tf = useTranslations("forms")
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState<CurrencyFormData>({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: 1.0,
    isBase: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        code: initialData?.code || "",
        name: initialData?.name || "",
        symbol: initialData?.symbol || "",
        exchangeRate: initialData?.exchangeRate ?? 1.0,
        isBase: initialData?.isBase ?? false,
      })
      setError("")
    }
  }, [open, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")

    try {
      const url = isEdit ? `/api/v1/currencies/${initialData!.id}` : "/api/v1/currencies"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>),
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

  const update = (key: keyof CurrencyFormData, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? tf("editCurrency") : tf("newCurrency")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="code">{tf("currencyCode")} *</Label>
                <Input id="code" value={form.code} onChange={(e) => update("code", e.target.value)} placeholder="USD" required />
              </div>
              <div>
                <Label htmlFor="symbol">{tf("currencySymbol")} *</Label>
                <Input id="symbol" value={form.symbol} onChange={(e) => update("symbol", e.target.value)} placeholder="$" required />
              </div>
            </div>
            <div>
              <Label htmlFor="name">{tc("name")} *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="US Dollar" required />
            </div>
            <div>
              <Label htmlFor="exchangeRate">{tf("exchangeRate")} *</Label>
              <Input id="exchangeRate" type="number" step="0.0001" min="0.0001" value={form.exchangeRate} onChange={(e) => update("exchangeRate", parseFloat(e.target.value) || 1)} required />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isBase} onChange={(e) => update("isBase", e.target.checked)} className="rounded" />
              <span className="text-sm">{tf("baseCurrency")}</span>
            </label>
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
