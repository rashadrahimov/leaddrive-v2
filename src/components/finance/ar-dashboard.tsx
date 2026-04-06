"use client"

import { useTranslations } from "next-intl"
import { useReceivables } from "@/lib/finance/hooks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts"
import { AlertTriangle, DollarSign, Clock, Building2 } from "lucide-react"

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

export function ARDashboard() {
  const t = useTranslations("finance.ar")
  const { data, isLoading, error } = useReceivables()

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>
  if (error) return <div className="p-8 text-center text-red-500">{t("error")}: {(error as Error).message}</div>
  if (!data) return <div className="p-8 text-center text-muted-foreground">{t("noData")}</div>

  const AGING_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#f97316", "#ef4444"] // Текущие, 1-30, 31-60, 61-90, 90+

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title={t("totalAr")} value={`${fmt(data.total)} AZN`} icon={<DollarSign className="w-5 h-5" />} color="#3b82f6" />
        <SummaryCard title={t("overdueTotal")} value={`${fmt(data.overdueTotal)} AZN`} icon={<AlertTriangle className="w-5 h-5" />} color="#ef4444" />
        <SummaryCard title={t("overdueCount")} value={String(data.overdueCount)} icon={<Clock className="w-5 h-5" />} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Aging Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t("agingTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.aging.some((b) => b.amount > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.aging}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={((value: number) => [`${fmt(value)} AZN`, "Сумма"]) as any} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {data.aging.map((_, i) => (
                      <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">{t("noData")}</div>
            )}
          </CardContent>
        </Card>

        {/* Top Debtors */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {t("topDebtors")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topDebtors.length > 0 ? (
              <div className="space-y-2">
                {data.topDebtors.map((d, i) => (
                  <div key={d.companyId} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{d.companyName}</p>
                        <p className="text-xs text-muted-foreground">{d.invoiceCount} счёт(ов)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums">{fmt(d.amount)} AZN</p>
                      {d.overdueAmount > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {fmt(d.overdueAmount)} просрочено
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">{t("noDebtors")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices Table */}
      {data.overdueInvoices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {t("overdueInvoices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-2 font-medium text-muted-foreground">#</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">{t("colInvoice")}</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground">{t("colCompany")}</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-right">{t("colBalance")}</th>
                    <th className="py-2 px-2 font-medium text-muted-foreground text-right">{t("colDaysOverdue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueInvoices.map((inv, i) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 px-2 font-medium">{inv.invoiceNumber}</td>
                      <td className="py-2 px-2">{inv.companyName}</td>
                      <td className="py-2 px-2 text-right font-bold tabular-nums text-red-600">{fmt(inv.balanceDue)} AZN</td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={inv.daysOverdue > 60 ? "destructive" : "secondary"} className="text-xs">
                          {inv.daysOverdue} дн
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
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
