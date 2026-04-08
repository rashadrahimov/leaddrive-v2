"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Plus, X } from "lucide-react"

interface OrderItem {
  product: string
  qty: string
  price: string
}

interface OrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  initialData?: any
  orgId?: string
}

export function MtmOrderForm({ open, onOpenChange, onSaved, initialData, orgId }: OrderFormProps) {
  const tc = useTranslations("common")
  const isEdit = !!initialData?.id
  const [form, setForm] = useState({
    agentId: "",
    customerId: "",
    status: "DRAFT",
    notes: "",
  })
  const [items, setItems] = useState<OrderItem[]>([{ product: "", qty: "1", price: "0" }])
  const [agents, setAgents] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      setForm({
        agentId: initialData?.agentId || "",
        customerId: initialData?.customerId || "",
        status: initialData?.status || "DRAFT",
        notes: initialData?.notes || "",
      })
      const parsed = initialData?.items
        ? (typeof initialData.items === "string" ? JSON.parse(initialData.items) : initialData.items)
        : []
      setItems(parsed.length > 0 ? parsed : [{ product: "", qty: "1", price: "0" }])
      setError("")

      const headers = orgId ? { "x-organization-id": orgId } : {} as Record<string, string>
      Promise.all([
        fetch("/api/v1/mtm/agents?limit=200", { headers }).then(r => r.json()),
        fetch("/api/v1/mtm/customers?limit=200", { headers }).then(r => r.json()),
      ]).then(([agentsRes, customersRes]) => {
        if (agentsRes.success) setAgents(agentsRes.data.agents || [])
        if (customersRes.success) setCustomers(customersRes.data.customers || [])
      }).catch(() => {})
    }
  }, [open, initialData])

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))
  const updateItem = (idx: number, key: keyof OrderItem, value: string) => {
    const newItems = [...items]
    newItems[idx] = { ...newItems[idx], [key]: value }
    setItems(newItems)
  }

  const total = items.reduce((sum, item) => sum + (parseFloat(item.price || "0") * parseInt(item.qty || "0")), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const url = isEdit ? `/api/v1/mtm/orders/${initialData!.id}` : "/api/v1/mtm/orders"
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>),
        },
        body: JSON.stringify({
          ...form,
          items: items.filter(i => i.product),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Order" : "New Order"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogContent>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">{error}</div>}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="agentId">Agent *</Label>
                <Select value={form.agentId} onChange={e => update("agentId", e.target.value)} required>
                  <option value="">— Select agent —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="customerId">Customer *</Label>
                <Select value={form.customerId} onChange={e => update("customerId", e.target.value)} required>
                  <option value="">— Select customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="status">{tc("status")}</Label>
              <Select value={form.status} onChange={e => update("status", e.target.value)}>
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
            <div>
              <Label>Order Items</Label>
              <div className="space-y-2 mt-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Product name"
                      value={item.product}
                      onChange={e => updateItem(idx, "product", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={e => updateItem(idx, "qty", e.target.value)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Price"
                      value={item.price}
                      onChange={e => updateItem(idx, "price", e.target.value)}
                      className="w-24"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { product: "", qty: "1", price: "0" }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                  </Button>
                  <span className="text-sm font-medium">Total: {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={e => update("notes", e.target.value)} rows={2} />
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
