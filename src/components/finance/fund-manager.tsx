"use client"

import { useState } from "react"
import { useFunds, useCreateFund, useDeleteFund, useFundTransactions, useCreateFundTransaction, useFundRules, useCreateFundRule, useDeleteFundRule } from "@/lib/finance/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, History, Settings2, PiggyBank } from "lucide-react"
import type { Fund } from "@/lib/finance/types"

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

const FUND_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"]

export function FundManager() {
  const { data: funds, isLoading } = useFunds()
  const createFund = useCreateFund()
  const deleteFund = useDeleteFund()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedFund, setSelectedFund] = useState<string | null>(null)
  const [showTx, setShowTx] = useState(false)
  const [showRules, setShowRules] = useState(false)

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Загрузка фондов...</div>

  const totalBalance = (funds || []).reduce((s, f) => s + f.currentBalance, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Общий баланс фондов</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(totalBalance)} AZN</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> Новый фонд
        </Button>
      </div>

      {/* Fund Cards */}
      {funds && funds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map((fund: Fund, i: number) => {
            const color = fund.color || FUND_COLORS[i % FUND_COLORS.length]
            const pct = fund.targetAmount ? Math.min(100, Math.round((fund.currentBalance / fund.targetAmount) * 100)) : null

            return (
              <Card key={fund.id} className="overflow-hidden">
                <div className="h-1" style={{ backgroundColor: color }} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <PiggyBank className="w-4 h-4" style={{ color }} />
                      {fund.name}
                    </CardTitle>
                    {!fund.isActive && <Badge variant="secondary" className="text-[10px]">Неактивен</Badge>}
                  </div>
                  {fund.description && <p className="text-xs text-muted-foreground">{fund.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold tabular-nums" style={{ color }}>
                        {fmt(fund.currentBalance)}
                      </span>
                      <span className="text-xs text-muted-foreground">{fund.currency}</span>
                    </div>
                    {fund.targetAmount && (
                      <>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Цель: {fmt(fund.targetAmount)}</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct || 0} className="h-2 mt-1" />
                      </>
                    )}
                  </div>

                  {/* Rules count */}
                  {fund.rules && fund.rules.length > 0 && (
                    <p className="text-xs text-muted-foreground">{fund.rules.length} правил(о) авто-распределения</p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => { setSelectedFund(fund.id); setShowTx(true) }}>
                      <ArrowDownToLine className="w-3 h-3 mr-1" /> Внести
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedFund(fund.id); setShowRules(true) }}>
                      <Settings2 className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => { if (confirm(`Удалить фонд «${fund.name}»?`)) deleteFund.mutate(fund.id) }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="py-20 text-center text-muted-foreground">
          <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет фондов. Создайте первый для резервирования средств.</p>
        </div>
      )}

      {/* Create Fund Dialog */}
      <CreateFundDialog open={showCreate} onClose={() => setShowCreate(false)} onCreate={createFund} />

      {/* Transaction Dialog */}
      {selectedFund && showTx && (
        <TransactionDialog fundId={selectedFund} onClose={() => { setShowTx(false); setSelectedFund(null) }} />
      )}

      {/* Rules Dialog */}
      {selectedFund && showRules && (
        <RulesDialog fundId={selectedFund} onClose={() => { setShowRules(false); setSelectedFund(null) }} />
      )}
    </div>
  )
}

function CreateFundDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: any }) {
  const [form, setForm] = useState({ name: "", description: "", targetAmount: "", color: "#3b82f6" })

  const handleSubmit = () => {
    if (!form.name) return
    onCreate.mutate(
      { ...form, targetAmount: form.targetAmount ? parseFloat(form.targetAmount) : undefined },
      { onSuccess: () => { onClose(); setForm({ name: "", description: "", targetAmount: "", color: "#3b82f6" }) } }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый фонд</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Название *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Налоговый резерв" /></div>
          <div><Label>Описание</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Резерв на квартальные налоги" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Целевая сумма</Label><Input type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} placeholder="50000" /></div>
            <div><Label>Цвет</Label><Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={onCreate.isPending}>{onCreate.isPending ? "Создаётся..." : "Создать фонд"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TransactionDialog({ fundId, onClose }: { fundId: string; onClose: () => void }) {
  const { data: transactions, isLoading } = useFundTransactions(fundId)
  const createTx = useCreateFundTransaction()
  const [type, setType] = useState("deposit")
  const [amount, setAmount] = useState("")
  const [desc, setDesc] = useState("")

  const handleAdd = () => {
    if (!amount) return
    createTx.mutate(
      { fundId, type, amount: parseFloat(amount), description: desc || undefined },
      { onSuccess: () => { setAmount(""); setDesc("") } }
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Транзакции фонда</DialogTitle></DialogHeader>

        {/* Add transaction form */}
        <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="deposit">Внесение</option>
              <option value="withdrawal">Списание</option>
            </select>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма" className="flex-1" />
            <Button size="sm" onClick={handleAdd} disabled={createTx.isPending}>
              {type === "deposit" ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
            </Button>
          </div>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Описание (необязательно)" />
        </div>

        {/* Transaction history */}
        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>}
          {transactions && transactions.length > 0 ? transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 px-1 border-b last:border-0">
              <div className="flex items-center gap-2">
                {tx.type === "deposit" || tx.type === "transfer_in" || tx.type === "auto_allocation" ? (
                  <ArrowDownToLine className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-red-600" />
                )}
                <div>
                  <p className="text-xs font-medium">{tx.type}</p>
                  {tx.description && <p className="text-[10px] text-muted-foreground">{tx.description}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold tabular-nums ${tx.type === "deposit" || tx.type === "transfer_in" ? "text-green-600" : "text-red-600"}`}>
                  {tx.type === "deposit" || tx.type === "transfer_in" ? "+" : "-"}{fmt(tx.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("ru-RU")}</p>
              </div>
            </div>
          )) : (
            !isLoading && <p className="text-sm text-muted-foreground text-center py-4">Нет транзакций</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RulesDialog({ fundId, onClose }: { fundId: string; onClose: () => void }) {
  const { data: rules, isLoading } = useFundRules(fundId)
  const createRule = useCreateFundRule()
  const deleteRule = useDeleteFundRule()
  const [name, setName] = useState("")
  const [trigger, setTrigger] = useState("revenue_percentage")
  const [pct, setPct] = useState("")
  const [fixed, setFixed] = useState("")

  const handleAdd = () => {
    if (!name) return
    createRule.mutate(
      {
        fundId,
        name,
        triggerType: trigger,
        percentage: trigger === "revenue_percentage" ? parseFloat(pct) / 100 : undefined,
        fixedAmount: trigger === "fixed_monthly" ? parseFloat(fixed) : undefined,
      },
      { onSuccess: () => { setName(""); setPct(""); setFixed("") } }
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Правила авто-распределения</DialogTitle></DialogHeader>

        {/* Add rule form */}
        <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название правила" />
          <div className="flex gap-2">
            <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1">
              <option value="revenue_percentage">% от выручки</option>
              <option value="fixed_monthly">Фикс. ежемесячно</option>
              <option value="invoice_paid">При оплате счёта</option>
            </select>
            {trigger === "revenue_percentage" && (
              <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="%" className="w-20" />
            )}
            {trigger === "fixed_monthly" && (
              <Input type="number" value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder="AZN" className="w-24" />
            )}
            <Button size="sm" onClick={handleAdd} disabled={createRule.isPending}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Rules list */}
        <div className="space-y-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
          {rules && rules.length > 0 ? rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between py-2 px-1 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{rule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rule.triggerType === "revenue_percentage" && `${((rule.percentage || 0) * 100).toFixed(0)}% от выручки`}
                  {rule.triggerType === "fixed_monthly" && `${fmt(rule.fixedAmount || 0)} AZN/мес`}
                  {rule.triggerType === "invoice_paid" && "При каждой оплате счёта"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rule.isActive ? "default" : "secondary"} className="text-[10px]">
                  {rule.isActive ? "Активно" : "Неактивно"}
                </Badge>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => deleteRule.mutate({ id: rule.id, fundId })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )) : (
            !isLoading && <p className="text-sm text-muted-foreground text-center py-4">Нет правил</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
