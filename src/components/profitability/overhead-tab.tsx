"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Check, X, Pencil } from "lucide-react"

interface OverheadItem {
  id: string
  category: string
  label: string
  amount: number
  is_annual: boolean
  has_vat: boolean
  is_admin: boolean
  target_service: string
  monthly_amount?: number
}

const SERVICE_OPTIONS = [
  { value: "", label: "None (Admin)" },
  { value: "permanent_it", label: "Daimi IT" },
  { value: "infosec", label: "InfoSec" },
  { value: "helpdesk", label: "HelpDesk" },
  { value: "erp", label: "ERP" },
  { value: "grc", label: "GRC" },
  { value: "projects", label: "PM" },
  { value: "cloud", label: "Cloud" },
]

const INITIAL_OVERHEAD: OverheadItem[] = [
  { id: "1", category: "cloud_servers", label: "Cloud Servers", amount: 20000, is_annual: false, has_vat: true, is_admin: false, target_service: "cloud", monthly_amount: 23600 },
  { id: "2", category: "office_rent", label: "Office Rent", amount: 30000, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 30000 },
  { id: "3", category: "insurance", label: "Insurance (per employee)", amount: 40, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 5480 },
  { id: "4", category: "mobile", label: "Mobile (per employee)", amount: 30, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 4110 },
  { id: "5", category: "cortex", label: "Cortex XDR", amount: 500000, is_annual: true, has_vat: true, is_admin: false, target_service: "infosec", monthly_amount: 49166.67 },
  { id: "6", category: "ms_license", label: "MS License", amount: 6800, is_annual: false, has_vat: true, is_admin: false, target_service: "permanent_it", monthly_amount: 8024 },
  { id: "7", category: "service_desk", label: "Service Desk", amount: 50000, is_annual: true, has_vat: true, is_admin: false, target_service: "permanent_it", monthly_amount: 4916.67 },
  { id: "8", category: "palo_alto", label: "Palo Alto", amount: 76000, is_annual: true, has_vat: true, is_admin: false, target_service: "infosec", monthly_amount: 7475.56 },
  { id: "9", category: "pam", label: "PAM", amount: 40000, is_annual: true, has_vat: true, is_admin: false, target_service: "infosec", monthly_amount: 3933.33 },
  { id: "10", category: "lms", label: "LMS", amount: 49999.97, is_annual: true, has_vat: true, is_admin: true, target_service: "", monthly_amount: 4916.66 },
  { id: "11", category: "trainings", label: "Trainings", amount: 250000, is_annual: true, has_vat: false, is_admin: true, target_service: "", monthly_amount: 20833.33 },
  { id: "12", category: "ai_licenses", label: "AI Licenses", amount: 3800, is_annual: true, has_vat: true, is_admin: true, target_service: "", monthly_amount: 373.67 },
  { id: "13", category: "car_amort", label: "Car Amortization", amount: 2500, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 2500 },
  { id: "14", category: "car_expenses", label: "Car Expenses", amount: 1200, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 1200 },
  { id: "15", category: "firewall_amort", label: "Firewall Amort", amount: 1547.62, is_annual: false, has_vat: false, is_admin: false, target_service: "infosec", monthly_amount: 1547.62 },
  { id: "16", category: "laptops", label: "Laptops", amount: 8500, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 8500 },
  { id: "17", category: "internet", label: "Internet", amount: 439, is_annual: false, has_vat: false, is_admin: true, target_service: "", monthly_amount: 439 },
  { id: "18", category: "team_building", label: "Team Building", amount: 120000, is_annual: true, has_vat: false, is_admin: true, target_service: "", monthly_amount: 10000 },
]

export function OverheadTab() {
  const [items, setItems] = useState<OverheadItem[]>(INITIAL_OVERHEAD)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<OverheadItem>>({})

  const calculateMonthly = (item: Partial<OverheadItem>): number => {
    let amt = item.amount || 0
    if (item.is_annual) amt = amt / 12
    if (item.has_vat) amt = amt * 1.18
    if (item.category === "insurance" || item.category === "mobile") amt = amt * 137
    return Math.round(amt * 100) / 100
  }

  const adminTotal = items
    .filter(i => i.is_admin)
    .reduce((sum, i) => sum + (i.monthly_amount || calculateMonthly(i)), 0)

  const techTotal = items
    .filter(i => !i.is_admin)
    .reduce((sum, i) => sum + (i.monthly_amount || calculateMonthly(i)), 0)

  const grandTotal = adminTotal + techTotal

  const startEdit = (item: OverheadItem) => {
    setEditingId(item.id)
    setEditForm({ ...item })
  }

  const saveEdit = () => {
    if (!editingId || !editForm) return
    const monthly = calculateMonthly(editForm)
    setItems(prev => prev.map(i =>
      i.id === editingId
        ? { ...i, ...editForm, monthly_amount: monthly, is_admin: !editForm.target_service }
        : i
    ))
    setEditingId(null)
    setEditForm({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const addItem = () => {
    const newId = String(Date.now())
    const newItem: OverheadItem = {
      id: newId,
      category: "new_item",
      label: "New Cost Item",
      amount: 0,
      is_annual: false,
      has_vat: false,
      is_admin: true,
      target_service: "",
      monthly_amount: 0,
    }
    setItems(prev => [...prev, newItem])
    startEdit(newItem)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Admin Overhead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{adminTotal.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tech Infrastructure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{techTotal.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Overhead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{grandTotal.toLocaleString("en", { minimumFractionDigits: 2 })} ₼</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Overhead Cost Items ({items.length})</CardTitle>
          <Button size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Label</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Annual</th>
                  <th className="pb-2 pr-4">VAT</th>
                  <th className="pb-2 pr-4">Target Service</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4 text-right">Monthly</th>
                  <th className="pb-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-4">
                            <Input
                              value={editForm.label || ""}
                              onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              type="number"
                              value={editForm.amount || 0}
                              onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                              className="h-8 text-sm w-28"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              type="checkbox"
                              checked={editForm.is_annual || false}
                              onChange={(e) => setEditForm(prev => ({ ...prev, is_annual: e.target.checked }))}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <input
                              type="checkbox"
                              checked={editForm.has_vat || false}
                              onChange={(e) => setEditForm(prev => ({ ...prev, has_vat: e.target.checked }))}
                              className="rounded"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <select
                              value={editForm.target_service || ""}
                              onChange={(e) => setEditForm(prev => ({
                                ...prev,
                                target_service: e.target.value,
                                is_admin: !e.target.value,
                              }))}
                              className="h-8 rounded-md border bg-background px-2 text-sm"
                            >
                              {SERVICE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant={editForm.target_service ? "default" : "secondary"}>
                              {editForm.target_service ? "Tech" : "Admin"}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {calculateMonthly(editForm).toLocaleString("en", { minimumFractionDigits: 2 })} ₼
                          </td>
                          <td className="py-2 flex gap-1">
                            <Button variant="ghost" size="sm" onClick={saveEdit} className="h-7 w-7 p-0">
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 w-7 p-0">
                              <X className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 pr-4 font-medium">{item.label}</td>
                          <td className="py-2 pr-4 font-mono">{item.amount.toLocaleString("en", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 pr-4">{item.is_annual ? "Yes" : "No"}</td>
                          <td className="py-2 pr-4">{item.has_vat ? "18%" : "No"}</td>
                          <td className="py-2 pr-4">
                            {item.target_service
                              ? SERVICE_OPTIONS.find(o => o.value === item.target_service)?.label || item.target_service
                              : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <Badge variant={item.is_admin ? "secondary" : "default"}>
                              {item.is_admin ? "Admin" : "Tech"}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono font-medium">
                            {(item.monthly_amount || 0).toLocaleString("en", { minimumFractionDigits: 2 })} ₼
                          </td>
                          <td className="py-2 flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-7 w-7 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)} className="h-7 w-7 p-0">
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
