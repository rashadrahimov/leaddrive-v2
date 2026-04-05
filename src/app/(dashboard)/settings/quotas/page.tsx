"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { MotionPage, MotionCard } from "@/components/ui/motion"
import { Plus, Save, Trash2, Loader2 } from "lucide-react"

interface QuotaRow {
  id: string
  userId: string
  user: { id: string; name: string; email: string }
  year: number
  quarter: number
  amount: number
  actual: number
  attainment: number
}

interface UserOption {
  id: string
  name: string
  email: string
}

function fmtCurrency(n: number): string {
  return `${n.toLocaleString()} ₼`
}

export default function QuotaSettingsPage() {
  const { data: session } = useSession()
  const [quotas, setQuotas] = useState<QuotaRow[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [year, setYear] = useState(new Date().getFullYear())

  // New quota form
  const [newUserId, setNewUserId] = useState("")
  const [newQuarter, setNewQuarter] = useState(1)
  const [newAmount, setNewAmount] = useState("")

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/sales-quotas?year=${year}`).then(r => r.json()),
      fetch("/api/v1/users?limit=100").then(r => r.json()),
    ])
      .then(([q, u]) => {
        if (q.success) setQuotas(q.data)
        if (u.success) setUsers((u.data?.users || u.data || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [year])

  const handleAdd = async () => {
    if (!newUserId || !newAmount) return
    setSaving(true)
    try {
      await fetch("/api/v1/sales-quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId, year, quarter: newQuarter, amount: parseFloat(newAmount) }),
      })
      setNewUserId("")
      setNewAmount("")
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/sales-quotas/${id}`, { method: "DELETE" })
    fetchData()
  }

  const handleInlineEdit = (q: QuotaRow) => {
    setEditingId(q.id)
    setEditAmount(String(q.amount))
  }

  const handleInlineSave = async (id: string) => {
    if (!editAmount) return
    await fetch(`/api/v1/sales-quotas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseFloat(editAmount) }),
    })
    setEditingId(null)
    fetchData()
  }

  // Group by user
  const userQuotas = new Map<string, QuotaRow[]>()
  for (const q of quotas) {
    const key = q.userId
    if (!userQuotas.has(key)) userQuotas.set(key, [])
    userQuotas.get(key)!.push(q)
  }

  return (
    <MotionPage className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Управление квотами</h1>
          <p className="text-sm text-muted-foreground">Квоты продаж по менеджерам и кварталам</p>
        </div>
        <div className="flex gap-2">
          {[year - 1, year, year + 1].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                year === y ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Quota */}
      <MotionCard className="p-4 rounded-xl border bg-card">
        <h3 className="text-sm font-semibold mb-3">Добавить квоту</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Менеджер</label>
            <select
              value={newUserId}
              onChange={e => setNewUserId(e.target.value)}
              className="h-9 rounded-md border px-2 text-sm bg-background min-w-[160px]"
            >
              <option value="">Выберите...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Квартал</label>
            <select
              value={newQuarter}
              onChange={e => setNewQuarter(parseInt(e.target.value))}
              className="h-9 rounded-md border px-2 text-sm bg-background w-20"
            >
              {[1, 2, 3, 4].map(q => (
                <option key={q} value={q}>Q{q}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Сумма (₼)</label>
            <input
              type="number"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              placeholder="150000"
              className="h-9 rounded-md border px-2 text-sm bg-background w-32"
            />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={saving || !newUserId || !newAmount}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Добавить
          </Button>
        </div>
      </MotionCard>

      {/* Quotas Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Загрузка...</div>
      ) : quotas.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Квоты не найдены для {year}</div>
      ) : (
        <MotionCard className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Менеджер</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">Квартал</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Квота</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">Факт</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted-foreground">%</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground w-16"></th>
              </tr>
            </thead>
            <tbody>
              {quotas.map(q => (
                <tr key={q.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-medium">{q.user.name || q.user.email}</td>
                  <td className="px-3 py-2.5 text-xs text-center">Q{q.quarter}</td>
                  <td className="px-3 py-2.5 text-xs text-right">
                    {editingId === q.id ? (
                      <input
                        autoFocus
                        type="number"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleInlineSave(q.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        onBlur={() => handleInlineSave(q.id)}
                        className="h-6 w-24 text-right border rounded px-1 text-xs bg-background"
                      />
                    ) : (
                      <span
                        onClick={() => handleInlineEdit(q)}
                        className="cursor-pointer hover:text-primary hover:underline transition-colors"
                        title="Нажмите для редактирования"
                      >
                        {fmtCurrency(q.amount)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-right">{fmtCurrency(q.actual)}</td>
                  <td className="px-3 py-2.5 text-xs text-right">
                    <span className={`font-semibold ${
                      q.attainment >= 100 ? "text-emerald-600" :
                      q.attainment >= 70 ? "text-blue-600" :
                      q.attainment >= 40 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {q.attainment}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </MotionCard>
      )}
    </MotionPage>
  )
}
