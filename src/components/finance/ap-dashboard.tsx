"use client"

import { useState } from "react"
import { usePayables, usePayablesStats, useCreateBill, useUpdateBill, useDeleteBill, useCreateBillPayment } from "@/lib/finance/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts"
import { Plus, DollarSign, AlertTriangle, Clock, CreditCard, Trash2, ArrowRight, CheckSquare, XCircle } from "lucide-react"
import type { Bill } from "@/lib/finance/types"

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground/70",
  pending: "bg-blue-100 text-blue-700",
  partially_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
}

export function APDashboard() {
  const { data: bills, isLoading: billsLoading } = usePayables()
  const { data: stats, isLoading: statsLoading } = usePayablesStats()
  const createBill = useCreateBill()
  const updateBill = useUpdateBill()
  const deleteBill = useDeleteBill()
  const createPayment = useCreateBillPayment()
  const [showCreate, setShowCreate] = useState(false)
  const [showPayment, setShowPayment] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (billsLoading || statsLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка кредиторки...</div>

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (!bills) return
    if (selected.size === bills.length) setSelected(new Set())
    else setSelected(new Set(bills.map((b: Bill) => b.id)))
  }
  const clearSelection = () => setSelected(new Set())

  const bulkUpdateStatus = (status: string) => {
    selected.forEach((id) => updateBill.mutate({ id, status }))
    clearSelection()
  }
  const bulkDelete = () => {
    if (!confirm(`Удалить ${selected.size} счёт(ов)?`)) return
    selected.forEach((id) => deleteBill.mutate(id))
    clearSelection()
  }

  const selectedBills = bills?.filter((b: Bill) => selected.has(b.id)) || []
  const canBulkPending = selectedBills.some((b: Bill) => b.status === "draft" || b.status === "overdue")
  const canBulkCancel = selectedBills.some((b: Bill) => !["paid", "cancelled"].includes(b.status))

  const AGING_COLORS = ["#22c55e", "#f59e0b", "#f97316", "#ef4444"]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Всего кредиторка" value={`${fmt(stats?.total || 0)} AZN`} icon={<CreditCard className="w-5 h-5" />} color="#8b5cf6" />
        <SummaryCard title="Просрочено" value={`${fmt(stats?.overdueTotal || 0)} AZN`} icon={<AlertTriangle className="w-5 h-5" />} color="#ef4444" />
        <SummaryCard title="Просроченных счетов" value={String(stats?.overdueCount || 0)} icon={<Clock className="w-5 h-5" />} color="#f59e0b" />
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Счета к оплате</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новый счёт
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Анализ по срокам</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.aging?.some((b) => b.amount > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.aging}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={((value: number) => [`${fmt(value)} AZN`, "Сумма"]) as any} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {stats.aging.map((_, i) => (
                      <Cell key={i} fill={AGING_COLORS[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Нет данных</div>
            )}
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Крупнейшие поставщики</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topVendors && stats.topVendors.length > 0 ? (
              <div className="space-y-2">
                {stats.topVendors.map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{v.vendorName}</p>
                        <p className="text-xs text-muted-foreground">{v.billCount} счёт(ов)</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{fmt(v.amount)} AZN</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Нет поставщиков</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Выбрано: {selected.size}
          </span>
          <div className="flex gap-2 ml-auto">
            {canBulkPending && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700" onClick={() => bulkUpdateStatus("pending")}>
                <ArrowRight className="w-3 h-3 mr-1" /> В работу
              </Button>
            )}
            {canBulkCancel && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-amber-700" onClick={() => bulkUpdateStatus("cancelled")}>
                <XCircle className="w-3 h-3 mr-1" /> Отменить
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-700" onClick={bulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" /> Удалить
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
              Снять выбор
            </Button>
          </div>
        </div>
      )}

      {/* Bills Table */}
      <Card>
        <CardContent className="pt-4">
          {bills && bills.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2 w-8">
                      <input type="checkbox" checked={bills.length > 0 && selected.size === bills.length} onChange={toggleAll} className="rounded border-border" />
                    </th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Счёт №</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Поставщик</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Название</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">Статус</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-right">Сумма</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-right">Остаток</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-right">Срок</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill: Bill) => {
                    const isOverdue = bill.status === "overdue" || (bill.dueDate && new Date(bill.dueDate) < new Date() && bill.balanceDue > 0 && !["paid", "cancelled"].includes(bill.status))
                    return (
                    <tr key={bill.id} className={`border-b last:border-0 hover:bg-muted/50 ${isOverdue ? "bg-red-50/50 dark:bg-red-950/20" : ""} ${selected.has(bill.id) ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
                      <td className="py-2 px-2">
                        <input type="checkbox" checked={selected.has(bill.id)} onChange={() => toggleSelect(bill.id)} className="rounded border-border" />
                      </td>
                      <td className="py-2 px-2 font-medium">{bill.billNumber}</td>
                      <td className="py-2 px-2">{bill.vendorName}</td>
                      <td className="py-2 px-2">{bill.title}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[bill.status] || ""}`}>
                          {{ draft: "Черновик", pending: "Ожидает", partially_paid: "Частично", paid: "Оплачен", overdue: "Просрочен", cancelled: "Отменён" }[bill.status] || bill.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{fmt(bill.totalAmount)}</td>
                      <td className="py-2 px-2 text-right tabular-nums font-bold">{fmt(bill.balanceDue)}</td>
                      <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                        {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("ru-RU") : "—"}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex gap-1 justify-end">
                          {bill.status === "draft" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700" onClick={() => updateBill.mutate({ id: bill.id, status: "pending" })}>
                              <ArrowRight className="w-3 h-3 mr-1" /> В работу
                            </Button>
                          )}
                          {bill.status !== "paid" && bill.status !== "cancelled" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowPayment(bill.id)}>
                              <DollarSign className="w-3 h-3 mr-1" /> Оплатить
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => { if (confirm("Удалить этот счёт?")) deleteBill.mutate(bill.id) }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">Нет счетов. Нажмите «Новый счёт» чтобы создать.</div>
          )}
        </CardContent>
      </Card>

      {/* Create Bill Dialog */}
      <CreateBillDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={createBill} />

      {/* Add Payment Dialog */}
      {showPayment && (
        <AddPaymentDialog billId={showPayment} onClose={() => setShowPayment(null)} onPay={createPayment} />
      )}
    </div>
  )
}

function CreateBillDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: any }) {
  const [form, setForm] = useState({ billNumber: "", vendorName: "", title: "", totalAmount: "", dueDate: "", category: "" })

  const handleSubmit = () => {
    if (!form.billNumber || !form.vendorName || !form.title || !form.totalAmount) return
    onCreate.mutate(
      { ...form, totalAmount: parseFloat(form.totalAmount) },
      { onSuccess: () => { onClose(); setForm({ billNumber: "", vendorName: "", title: "", totalAmount: "", dueDate: "", category: "" }) } }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый счёт</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Номер счёта *</Label><Input value={form.billNumber} onChange={(e) => setForm({ ...form, billNumber: e.target.value })} placeholder="BILL-001" /></div>
          <div><Label>Поставщик *</Label><Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="ООО Пример" /></div>
          <div><Label>Название *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Аренда офиса Март 2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Сумма (AZN) *</Label><Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} placeholder="5000" /></div>
            <div><Label>Срок оплаты</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div><Label>Категория</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="аренда, ПО, услуги..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={onCreate.isPending}>{onCreate.isPending ? "Создаётся..." : "Создать счёт"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddPaymentDialog({ billId, onClose, onPay }: { billId: string; onClose: () => void; onPay: any }) {
  const [amount, setAmount] = useState("")
  const [ref, setRef] = useState("")

  const handleSubmit = () => {
    if (!amount) return
    onPay.mutate(
      { billId, amount: parseFloat(amount), reference: ref || undefined },
      { onSuccess: () => { onClose(); setAmount(""); setRef("") } }
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Добавить оплату</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Сумма (AZN) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" /></div>
          <div><Label>Основание</Label><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Банковский перевод №..." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={onPay.isPending}>{onPay.isPending ? "Оплата..." : "Записать оплату"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border shadow-sm" style={{ background: `linear-gradient(135deg, ${color}08 0%, ${color}18 100%)`, borderColor: `${color}20` }}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ backgroundColor: color }} />
      <div className="relative p-4 pt-5 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
        </div>
        <div className="p-2.5 rounded-xl" style={{ color, backgroundColor: `${color}12` }}>{icon}</div>
      </div>
    </div>
  )
}
