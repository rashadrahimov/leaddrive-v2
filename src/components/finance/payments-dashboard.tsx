"use client"

import { useState } from "react"
import {
  usePaymentRegistry,
  usePaymentOrders,
  usePaymentOrdersStats,
  useCreatePaymentOrder,
  useDeletePaymentOrder,
  useSubmitPaymentOrder,
  useApprovePaymentOrder,
  useRejectPaymentOrder,
  useExecutePaymentOrder,
  usePayables,
} from "@/lib/finance/hooks"
import { FinanceKpiCard } from "./finance-kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import {
  ArrowDownLeft, ArrowUpRight, Activity, Clock, Plus, Send, Check, X, Play, Trash2, FileText,
} from "lucide-react"
import type { PaymentRegistryFilters, PaymentOrder, CreatePaymentOrderInput } from "@/lib/finance/types"

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-foreground/70",
  pending_approval: "bg-blue-100 text-blue-700",
  approved: "bg-amber-100 text-amber-700",
  executed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  approved: "Одобрено",
  executed: "Исполнено",
  rejected: "Отклонено",
  cancelled: "Отменено",
}

const DIRECTION_BADGE: Record<string, { label: string; color: string }> = {
  incoming: { label: "Входящий", color: "bg-green-100 text-green-700" },
  outgoing: { label: "Исходящий", color: "bg-red-100 text-red-700" },
}

const CATEGORY_LABELS: Record<string, string> = {
  vendor_payment: "Оплата поставщику",
  revenue: "Доход",
  fund_allocation: "Фонд",
  manual: "Ручной",
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Банковский перевод",
  cash: "Наличные",
  card: "Карта",
  check: "Чек",
  other: "Другое",
}

export function PaymentsDashboard() {
  const [subTab, setSubTab] = useState("orders")
  const [filters, setFilters] = useState<PaymentRegistryFilters>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showReject, setShowReject] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data: registryData, isLoading: registryLoading } = usePaymentRegistry(filters)
  const { data: orders, isLoading: ordersLoading } = usePaymentOrders()
  const { data: stats } = usePaymentOrdersStats()
  const { data: bills } = usePayables()

  const createOrder = useCreatePaymentOrder()
  const deleteOrder = useDeletePaymentOrder()
  const submitOrder = useSubmitPaymentOrder()
  const approveOrder = useApprovePaymentOrder()
  const rejectOrder = useRejectPaymentOrder()
  const executeOrder = useExecutePaymentOrder()

  const registryStats = registryData?.stats

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceKpiCard
          title="Входящие платежи"
          value={registryStats?.totalIncoming || 0}
          icon={<ArrowDownLeft className="w-5 h-5" />}
          color="#22c55e"
        />
        <FinanceKpiCard
          title="Исходящие платежи"
          value={registryStats?.totalOutgoing || 0}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="#8b5cf6"
        />
        <FinanceKpiCard
          title="Чистый поток"
          value={registryStats?.netFlow || 0}
          icon={<Activity className="w-5 h-5" />}
          color="#3b82f6"
        />
        <FinanceKpiCard
          title="Ожидают исполнения"
          value={registryStats?.pendingOrdersCount || 0}
          icon={<Clock className="w-5 h-5" />}
          color="#f59e0b"
          currency=""
        />
      </div>

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Платёжные поручения
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-1.5">
            <Activity className="w-4 h-4" />
            Реестр платежей
          </TabsTrigger>
        </TabsList>

        {/* Payment Orders */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Платёжные поручения</h3>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> Новое поручение
            </Button>
          </div>

          {ordersLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
          ) : !orders?.length ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Поручений пока нет</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium">№</th>
                        <th className="text-left p-3 font-medium">Контрагент</th>
                        <th className="text-right p-3 font-medium">Сумма</th>
                        <th className="text-left p-3 font-medium">Назначение</th>
                        <th className="text-left p-3 font-medium">Метод</th>
                        <th className="text-center p-3 font-medium">Статус</th>
                        <th className="text-left p-3 font-medium">Создано</th>
                        <th className="text-right p-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o: PaymentOrder) => (
                        <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                          <td className="p-3">{o.counterpartyName}</td>
                          <td className="p-3 text-right font-medium tabular-nums">{fmt(o.amount)} {o.currency}</td>
                          <td className="p-3 max-w-[200px] truncate text-muted-foreground">{o.purpose}</td>
                          <td className="p-3 text-xs">{METHOD_LABELS[o.paymentMethod] || o.paymentMethod}</td>
                          <td className="p-3 text-center">
                            <Badge variant="secondary" className={`text-[10px] ${STATUS_COLORS[o.status] || ""}`}>
                              {STATUS_LABELS[o.status] || o.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ru-RU")}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {o.status === "draft" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => submitOrder.mutate(o.id)}>
                                    <Send className="w-3 h-3 mr-1" /> На согласование
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteOrder.mutate(o.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              {o.status === "pending_approval" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => approveOrder.mutate(o.id)}>
                                    <Check className="w-3 h-3 mr-1" /> Одобрить
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-700" onClick={() => { setShowReject(o.id); setRejectReason("") }}>
                                    <X className="w-3 h-3 mr-1" /> Отклонить
                                  </Button>
                                </>
                              )}
                              {o.status === "approved" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700" onClick={() => executeOrder.mutate(o.id)}>
                                  <Play className="w-3 h-3 mr-1" /> Исполнить
                                </Button>
                              )}
                              {o.status === "rejected" && o.rejectionReason && (
                                <span className="text-xs text-red-600 truncate max-w-[150px]" title={o.rejectionReason}>{o.rejectionReason}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Registry */}
        <TabsContent value="registry" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Направление</Label>
              <Select className="w-[140px] h-8" value={filters.direction || "all"} onChange={(e) => setFilters((p) => ({ ...p, direction: e.target.value === "all" ? undefined : e.target.value as any }))}>
                <option value="all">Все</option>
                <option value="incoming">Входящие</option>
                <option value="outgoing">Исходящие</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Категория</Label>
              <Select className="w-[180px] h-8" value={filters.category || "all"} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value === "all" ? undefined : e.target.value }))}>
                <option value="all">Все</option>
                <option value="vendor_payment">Оплата поставщику</option>
                <option value="revenue">Доход</option>
                <option value="fund_allocation">Фонд</option>
              </Select>
            </div>
            <div>
              <Label className="text-xs">С</Label>
              <Input type="date" className="h-8 w-[140px]" value={filters.dateFrom || ""} onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">По</Label>
              <Input type="date" className="h-8 w-[140px]" value={filters.dateTo || ""} onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value || undefined }))} />
            </div>
            <div>
              <Label className="text-xs">Контрагент</Label>
              <Input className="h-8 w-[160px]" placeholder="Поиск..." value={filters.counterparty || ""} onChange={(e) => setFilters((p) => ({ ...p, counterparty: e.target.value || undefined }))} />
            </div>
          </div>

          {registryLoading ? (
            <div className="p-8 text-center text-muted-foreground">Загрузка реестра...</div>
          ) : !registryData?.data?.length ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Записей в реестре нет</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium">Дата</th>
                        <th className="text-center p-3 font-medium">Направление</th>
                        <th className="text-left p-3 font-medium">Контрагент</th>
                        <th className="text-left p-3 font-medium">Категория</th>
                        <th className="text-right p-3 font-medium">Сумма</th>
                        <th className="text-left p-3 font-medium">Источник</th>
                        <th className="text-left p-3 font-medium">Описание</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registryData.data.map((e) => {
                        const dir = DIRECTION_BADGE[e.direction] || { label: e.direction, color: "" }
                        return (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="p-3 text-xs">{new Date(e.paymentDate).toLocaleDateString("ru-RU")}</td>
                            <td className="p-3 text-center">
                              <Badge variant="secondary" className={`text-[10px] ${dir.color}`}>{dir.label}</Badge>
                            </td>
                            <td className="p-3">{e.counterpartyName}</td>
                            <td className="p-3 text-xs text-muted-foreground">{CATEGORY_LABELS[e.category || ""] || e.category || "—"}</td>
                            <td className={`p-3 text-right font-medium tabular-nums ${e.direction === "incoming" ? "text-green-700" : "text-red-700"}`}>
                              {e.direction === "incoming" ? "+" : "−"}{fmt(e.amount)} {e.currency}
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{e.sourceType.replace(/_/g, " ")}</td>
                            <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{e.description || "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {registryData.total > registryData.data.length && (
                  <div className="p-3 text-center text-xs text-muted-foreground border-t">
                    Показано {registryData.data.length} из {registryData.total}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(input) => {
          createOrder.mutate(input, { onSuccess: () => setShowCreate(false) })
        }}
        bills={bills || []}
        isPending={createOrder.isPending}
      />

      {/* Reject Dialog */}
      <Dialog open={!!showReject} onOpenChange={() => setShowReject(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить платёжное поручение</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Причина отклонения</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(null)}>Отмена</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectOrder.isPending}
              onClick={() => {
                if (showReject) {
                  rejectOrder.mutate({ id: showReject, reason: rejectReason }, { onSuccess: () => setShowReject(null) })
                }
              }}
            >
              {rejectOrder.isPending ? "Отклонение..." : "Отклонить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create Order Dialog ──────────────────────────────────────────────────

function CreateOrderDialog({
  open, onClose, onCreate, bills, isPending,
}: {
  open: boolean
  onClose: () => void
  onCreate: (input: CreatePaymentOrderInput) => void
  bills: any[]
  isPending: boolean
}) {
  const [form, setForm] = useState({
    counterpartyName: "",
    billId: "",
    amount: "",
    currency: "AZN",
    purpose: "",
    paymentMethod: "bank_transfer",
    bankDetails: "",
  })

  const unpaidBills = bills.filter((b) => b.status !== "paid" && b.status !== "cancelled")

  function handleBillSelect(billId: string) {
    if (billId === "none") {
      setForm((f) => ({ ...f, billId: "" }))
      return
    }
    const bill = bills.find((b) => b.id === billId)
    if (bill) {
      setForm((f) => ({
        ...f,
        billId: bill.id,
        counterpartyName: bill.vendorName,
        amount: String(bill.balanceDue),
        currency: bill.currency,
        purpose: `Оплата по счёту ${bill.billNumber}`,
      }))
    }
  }

  function handleSubmit() {
    if (!form.counterpartyName || !form.amount || !form.purpose) return
    onCreate({
      counterpartyName: form.counterpartyName,
      billId: form.billId || undefined,
      amount: parseFloat(form.amount),
      currency: form.currency,
      purpose: form.purpose,
      paymentMethod: form.paymentMethod,
      bankDetails: form.bankDetails || undefined,
    })
    setForm({ counterpartyName: "", billId: "", amount: "", currency: "AZN", purpose: "", paymentMethod: "bank_transfer", bankDetails: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Новое платёжное поручение</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {unpaidBills.length > 0 && (
            <div>
              <Label className="text-xs">Связанный счёт (необязательно)</Label>
              <Select className="h-9" value={form.billId || "none"} onChange={(e) => handleBillSelect(e.target.value)}>
                <option value="none">— Без привязки —</option>
                {unpaidBills.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.billNumber} — {b.vendorName} ({fmt(b.balanceDue)} {b.currency})
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Контрагент *</Label>
            <Input value={form.counterpartyName} onChange={(e) => setForm((f) => ({ ...f, counterpartyName: e.target.value }))} placeholder="Название контрагента" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Сумма *</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Валюта</Label>
              <Select className="h-9" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                <option value="AZN">AZN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Назначение платежа *</Label>
            <Textarea value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} rows={2} placeholder="Оплата по договору №..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Метод оплаты</Label>
              <Select className="h-9" value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="bank_transfer">Банковский перевод</option>
                <option value="cash">Наличные</option>
                <option value="card">Карта</option>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Банковские реквизиты</Label>
            <Textarea value={form.bankDetails} onChange={(e) => setForm((f) => ({ ...f, bankDetails: e.target.value }))} rows={2} placeholder="ИНН, р/с, банк..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.counterpartyName || !form.amount || !form.purpose}>
            {isPending ? "Создание..." : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
