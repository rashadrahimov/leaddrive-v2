"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, Search, Bell,
  Megaphone, Inbox, Mail, BarChart3, Send,
  Eye, MousePointer, TrendingUp, DollarSign,
  Calendar, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Sidebar items ── */
const sidebarItems = [
  { icon: LayoutDashboard, label: "İdarə paneli", active: false, section: "CRM" },
  { icon: Building2, label: "Şirkətlər", active: false },
  { icon: UserCheck, label: "Kontaktlar", active: false },
  { icon: Briefcase, label: "Sövdələşmələr", active: false },
  { icon: Target, label: "Lidlər", active: false },
  { icon: FileText, label: "Tapşırıqlar", active: false },
  { icon: Receipt, label: "Müqavilələr", active: false },
  { icon: Megaphone, label: "Kampaniyalar", active: true, section: "MARKETİNQ" },
  { icon: BarChart3, label: "Seqmentlər", active: false },
  { icon: Mail, label: "Email şablonlar", active: false },
  { icon: Inbox, label: "Email log", active: false },
]

/* ── Status cards ── */
const statusCards = [
  { label: "QARALAMA", count: 3, color: "bg-slate-500" },
  { label: "PLANLAŞDIRILIR", count: 2, color: "bg-orange-500" },
  { label: "GÖNDƏRİLİR", count: 1, color: "bg-blue-500" },
  { label: "GÖNDƏRİLİB", count: 5, color: "bg-emerald-500" },
  { label: "LƏĞV EDİLİB", count: 0, color: "bg-red-500" },
]

/* ── KPI metrics ── */
const kpiMetrics = [
  { icon: Send, value: "2,450", label: "GÖNDƏRİLİB", color: "text-blue-600" },
  { icon: Eye, value: "24.5%", label: "AÇILMA DƏRƏCƏSİ", color: "text-emerald-600" },
  { icon: MousePointer, value: "3.8%", label: "KLİK DƏRƏCƏSİ", color: "text-violet-600" },
  { icon: TrendingUp, value: "1.2%", label: "BOUNCE", color: "text-orange-600" },
  { icon: DollarSign, value: "$12.5k", label: "BÜDCƏ", color: "text-slate-700" },
  { icon: Zap, value: "+285%", label: "ROI", color: "text-emerald-600" },
]

/* ── Best campaigns ── */
const topCampaigns = [
  { name: "Spring Promo 2026", sent: "1,250 gönd.", openRate: "28%", clickRate: "4.2%", type: "Email" },
  { name: "Product Launch Q2", sent: "800 gönd.", openRate: "22%", clickRate: "3.5%", type: "Email" },
  { name: "Loyalty Program", sent: "400 gönd.", openRate: "31%", clickRate: "5.1%", type: "Email" },
]

/* ── Funnel data ── */
const funnelData = [
  { label: "Göndərilib", value: "2,450", pct: "100%", width: "100%" },
  { label: "Açılib", value: "601", pct: "24.5%", width: "24.5%" },
  { label: "Klikləni̇b", value: "93", pct: "3.8%", width: "3.8%" },
  { label: "Bounce", value: "29", pct: "1.2%", width: "1.2%" },
]

export function CampaignsPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-slate-900 text-white select-none">
      {/* Sidebar */}
      <div className="w-[120px] flex-shrink-0 bg-slate-900 border-r border-slate-700/50 py-2 px-1.5 hidden sm:block">
        <div className="flex items-center gap-1.5 px-2 mb-3">
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-orange-400 to-red-500 rounded-md" />
          <span className="font-bold text-[7px] text-white/90">LeadDrive</span>
        </div>
        <div className="relative mb-2 px-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 text-slate-500" />
          <div className="bg-slate-800 rounded-md py-1 pl-5 text-slate-500 text-[6px]">Axtar...</div>
        </div>
        {sidebarItems.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i}>
              {item.section && (
                <div className="text-[5px] font-semibold text-slate-500 uppercase tracking-wider px-2 mt-2 mb-1">{item.section}</div>
              )}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-[3px] rounded-md mb-[1px]",
                item.active ? "bg-orange-500/20 text-orange-400" : "text-slate-400"
              )}>
                <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 bg-slate-50 text-slate-900 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200">
          <span className="text-[8px] font-medium text-slate-400">Nexora Solutions LLC</span>
          <div className="flex items-center gap-1.5">
            <Bell className="w-2.5 h-2.5 text-slate-400" />
            <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-[5px] font-bold text-white">A</div>
          </div>
        </div>

        <div className="p-2.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-[10px] font-bold text-slate-900">Kampaniyalar</h2>
              <p className="text-[5px] text-slate-500">Email və SMS kampaniyalarını yaradın və göndərin</p>
            </div>
            <div className="bg-orange-500 rounded-md px-2 py-0.5 text-[6px] text-white font-medium">+ Yeni kampaniya</div>
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mb-2 border-b border-slate-200 pb-1">
            <span className="text-[6px] font-semibold text-slate-900 border-b-2 border-blue-500 pb-0.5">Analitika</span>
            <span className="text-[6px] text-slate-400">Siyahı</span>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {statusCards.map((card, i) => (
              <div key={i} className={cn("text-white rounded-lg p-1.5", card.color)}>
                <div className="flex items-center justify-between">
                  <span className="text-[5px] opacity-80">{card.label}</span>
                  <Mail className="w-2 h-2 opacity-60" />
                </div>
                <div className="text-[10px] font-bold mt-0.5">{card.count}</div>
              </div>
            ))}
          </div>

          {/* KPI metrics */}
          <div className="grid grid-cols-6 gap-1 mb-2.5">
            {kpiMetrics.map((kpi, i) => {
              const Icon = kpi.icon
              return (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-1.5 text-center">
                  <Icon className={cn("w-2.5 h-2.5 mx-auto mb-0.5", kpi.color)} />
                  <div className={cn("text-[9px] font-bold", kpi.color)}>{kpi.value}</div>
                  <div className="text-[4px] text-slate-400 uppercase tracking-wider mt-0.5">{kpi.label}</div>
                </div>
              )
            })}
          </div>

          {/* Three columns: Trend + Funnel + Top Campaigns */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Monthly trend */}
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <div className="flex items-center gap-1 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[6px] font-semibold text-slate-700 uppercase">Aylıq göndərmə trendi</span>
              </div>
              {/* Simple bar chart */}
              <div className="flex items-end gap-[2px] h-[40px]">
                {[15, 25, 40, 35, 55, 70, 60, 80, 45, 90, 65, 75].map((h, i) => (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-t-sm", i === 9 ? "bg-blue-500" : "bg-blue-200")}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[4px] text-slate-400">Yan</span>
                <span className="text-[4px] text-slate-400">Mar</span>
                <span className="text-[4px] text-slate-400">İyn</span>
                <span className="text-[4px] text-slate-400">Sen</span>
                <span className="text-[4px] text-slate-400">Dek</span>
              </div>
            </div>

            {/* Delivery funnel */}
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <div className="flex items-center gap-1 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[6px] font-semibold text-slate-700 uppercase">Çatdırılma hunisi</span>
              </div>
              <div className="space-y-1.5">
                {funnelData.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[5px] text-slate-600">{item.label}</span>
                      <span className="text-[5px] font-medium text-slate-800">{item.value} <span className="text-slate-400">{item.pct}</span></span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: item.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top campaigns */}
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <div className="flex items-center gap-1 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="text-[6px] font-semibold text-slate-700 uppercase">Ən yaxşı kampaniyalar</span>
              </div>
              <div className="space-y-1">
                {topCampaigns.map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 p-1 rounded bg-slate-50 border border-slate-100">
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[5px] font-bold text-white flex-shrink-0",
                      i === 0 ? "bg-orange-500" : i === 1 ? "bg-emerald-500" : "bg-blue-500"
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[6px] font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[4px] text-slate-500">{c.sent}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[5px] font-medium text-emerald-600">{c.openRate} açılma</div>
                      <div className="text-[4px] text-blue-500">{c.clickRate} klik</div>
                    </div>
                    <div className="bg-slate-200 rounded px-1 py-[1px] text-[4px] text-slate-600 flex-shrink-0">{c.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
