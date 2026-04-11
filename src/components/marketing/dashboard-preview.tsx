"use client"

import {
  TrendingUp, Users, DollarSign, Target,
  ArrowUpRight, Calendar, Briefcase,
  Megaphone, Globe, Star, CheckCircle2, Zap,
  LayoutDashboard, Building2, UserCheck, Inbox,
  Headphones, BarChart3, Bot, Settings, Mail,
  Phone, Clock, Bell, Search, ChevronDown,
  MessageSquare, FileText, Receipt,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

/* ── Mini bar chart ── */
function MiniBarChart({ data, color, height = "h-16" }: { data: number[]; color: string; height?: string }) {
  const max = Math.max(...data)
  return (
    <div className={cn("flex items-end gap-[2px]", height)}>
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t-sm min-w-[4px]", color)}
          style={{ height: `${(v / max) * 100}%`, opacity: 0.45 + (v / max) * 0.55 }}
        />
      ))}
    </div>
  )
}

/* ── Mini line chart (SVG) ── */
function MiniLineChart({ data, color, width = 200, height = 50 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(" ")
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`lg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#lg-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Mini donut (SVG) ── */
function MiniDonut({ segments, size = 52 }: { segments: { pct: number; color: string }[]; size?: number }) {
  let offset = 0
  const r = size / 2 - 6, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color}
            strokeWidth="6" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        )
        offset += dash
        return el
      })}
    </svg>
  )
}

/* ── Data ── */
const revenueMonthly = [42, 38, 55, 48, 62, 58, 71, 65, 78, 82, 91, 98]
const leadsWeekly = [18, 22, 15, 28, 24, 31, 27]
const ticketsDaily = [8, 12, 6, 15, 9, 11, 14]

const pipelineStagesData = [
  { key: "new", count: 24, pct: 100, color: "bg-violet-500" },
  { key: "qualification", count: 18, pct: 75, color: "bg-blue-500" },
  { key: "proposal", count: 12, pct: 50, color: "bg-cyan-500" },
  { key: "negotiation", count: 7, pct: 29, color: "bg-teal-500" },
  { key: "won", count: 5, pct: 21, color: "bg-emerald-500" },
]

const recentDeals = [
  { name: "ERP Tətbiqi", company: "NeftGaz MMC", value: "₼25,000", stage: "Təklif", color: "bg-cyan-500", hot: true },
  { name: "CRM Lisenziya", company: "BankTech", value: "₼18,500", stage: "Danışıq", color: "bg-teal-500", hot: true },
  { name: "Cloud Miqrasiya", company: "AzərLogistik", value: "₼12,800", stage: "Kvalifikasiya", color: "bg-blue-500", hot: false },
  { name: "Kibertəhlükəsizlik", company: "DevPort", value: "₼31,200", stage: "Yeni", color: "bg-violet-500", hot: false },
  { name: "Data Analytics", company: "FinServ Group", value: "₼22,400", stage: "Təklif", color: "bg-cyan-500", hot: true },
]

const topLeads = [
  { name: "Kamran Əliyev", company: "TechVision", score: "A", bg: "bg-green-50 text-green-700 border-green-200" },
  { name: "Nigar Həsənova", company: "DataPro", score: "A", bg: "bg-green-50 text-green-700 border-green-200" },
  { name: "Rəşad Məmmədov", company: "CloudAz", score: "B", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  { name: "Aynur Quliyeva", company: "FinServ", score: "B", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  { name: "Tural Həsənov", company: "LogiTech AZ", score: "C", bg: "bg-amber-50 text-amber-700 border-amber-200" },
]

const activities = [
  { text: "Yeni lid: TechVision MMC", time: "2 dəq əvvəl", icon: UserCheck, color: "text-green-500" },
  { text: "Sövdələşmə yeniləndi: ₼25K", time: "15 dəq əvvəl", icon: Target, color: "text-violet-500" },
  { text: "Tiket həll edildi: #1247", time: "32 dəq əvvəl", icon: CheckCircle2, color: "text-emerald-500" },
  { text: "E-poçt kampaniyası göndərildi", time: "1 saat əvvəl", icon: Mail, color: "text-cyan-500" },
  { text: "Yeni müqavilə imzalandı", time: "2 saat əvvəl", icon: FileText, color: "text-blue-500" },
]

const sidebarItemsDef = [
  { icon: LayoutDashboard, key: "dashboard", active: true },
  { icon: Building2, key: "companies" },
  { icon: Users, key: "contacts" },
  { icon: Target, key: "deals" },
  { icon: UserCheck, key: "leads" },
  { icon: Inbox, key: "inbox" },
  { icon: Megaphone, key: "campaigns" },
  { icon: Headphones, key: "tickets" },
  { icon: BarChart3, key: "reports" },
  { icon: Receipt, key: "finance" },
  { icon: Bot, key: "daVinci" },
  { icon: Settings, key: "settings" },
]

export function DashboardPreview() {
  const t = useTranslations("marketing")

  const sidebarItems = sidebarItemsDef.map(item => ({
    ...item,
    label: t(`preview.sidebar.${item.key}`),
  }))

  const pipelineStages = pipelineStagesData.map(s => ({
    ...s,
    label: t(`preview.pipeline.${s.key}`),
  }))
  return (
    <div className="w-full bg-white rounded-xl overflow-hidden text-[11px] leading-tight select-none pointer-events-none shadow-inner">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[10px] font-bold">LeadDrive</span>
          </div>
          <div className="flex items-center gap-0.5 bg-[#001E3C]/60 rounded-md px-2 py-1">
            <Search className="w-2.5 h-2.5 text-[#001E3C]/40" />
            <span className="text-[9px] text-[#001E3C]/40 ml-1">{t("preview.search")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-3 h-3 text-[#001E3C]/40" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center text-[8px] font-bold">R</div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="flex flex-col w-[120px] bg-[#0f172a] text-white py-2 flex-shrink-0">
          {sidebarItems.map((item) => (
            <div key={item.label} className={cn(
              "flex items-center gap-2 px-3 py-[5px] text-[9px] cursor-default transition-colors",
              item.active ? "bg-violet-600/20 text-violet-300 border-l-2 border-violet-400" : "text-[#001E3C]/40 border-l-2 border-transparent"
            )}>
              <item.icon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 bg-[#F3F4F7] p-1.5 space-y-1 min-w-0">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-[#001E3C]">{t("preview.dashboard.title")}</h2>
              <p className="text-[8px] text-[#001E3C]/40">{t("preview.dashboard.subtitle")}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] px-2 py-0.5 rounded-md bg-[#F3F4F7] text-[#001E3C]/60 border border-[#001E3C]/10">{t("preview.dashboard.thisMonth")}</span>
              <ChevronDown className="w-2.5 h-2.5 text-[#001E3C]/40" />
            </div>
          </div>

          {/* KPI Row - 6 cards */}
          <div className="grid grid-cols-6 gap-1">
            {[
              { label: t("preview.dashboard.kpiRevenue"), value: "₼247.8K", change: "+18%", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { label: t("preview.dashboard.kpiLeads"), value: "142", change: "+24", icon: UserCheck, color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
              { label: t("preview.dashboard.kpiDeals"), value: "38", change: "₼384K", icon: Target, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-100" },
              { label: t("preview.dashboard.kpiConversion"), value: "32.4%", change: "+5.1%", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
              { label: t("preview.dashboard.kpiTickets"), value: "15", change: t("preview.dashboard.kpiTicketsAvg"), icon: Headphones, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
              { label: t("preview.dashboard.kpiCampaigns"), value: "4", change: t("preview.dashboard.kpiCampaignsOpen"), icon: Megaphone, color: "text-pink-600", bg: "bg-pink-50 border-pink-100" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] text-[#001E3C]/40 uppercase tracking-wider">{kpi.label}</span>
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center border", kpi.bg)}>
                    <kpi.icon className={cn("w-2.5 h-2.5", kpi.color)} />
                  </div>
                </div>
                <div className="text-sm font-bold text-[#001E3C]">{kpi.value}</div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <ArrowUpRight className="w-2 h-2 text-emerald-500" />
                  <span className="text-[8px] text-emerald-600">{kpi.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: Pipeline + Revenue + Lead Sources */}
          <div className="grid grid-cols-3 gap-1">
            {/* Pipeline */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.salesPipeline")}</span>
                <span className="text-[8px] text-[#001E3C]/40">₼384K</span>
              </div>
              <div className="space-y-[5px]">
                {pipelineStages.map((s) => (
                  <div key={s.label} className="flex items-center gap-1">
                    <span className="text-[8px] text-[#001E3C]/40 w-14 truncate">{s.label}</span>
                    <div className="flex-1 h-2.5 bg-[#F3F4F7] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-[8px] text-[#001E3C]/60 w-4 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue trend */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.revenueTrend")}</span>
                <span className="text-[8px] text-emerald-600 font-medium">↑ 28%</span>
              </div>
              <MiniLineChart data={revenueMonthly} color="#8b5cf6" width={180} height={45} />
              <div className="flex justify-between mt-1 text-[7px] text-[#001E3C]/25">
                {["Y","F","M","A","M","İ","İ","A","S","O","N","D"].map((m,i) => <span key={i}>{m}</span>)}
              </div>
            </div>

            {/* Lead sources donut */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.leadSources")}</span>
                <span className="text-[8px] text-[#001E3C]/40">142</span>
              </div>
              <div className="flex items-center gap-2">
                <MiniDonut size={48} segments={[
                  { pct: 35, color: "#8b5cf6" }, { pct: 25, color: "#06b6d4" },
                  { pct: 20, color: "#10b981" }, { pct: 12, color: "#f59e0b" }, { pct: 8, color: "#6366f1" },
                ]} />
                <div className="space-y-[3px] flex-1">
                  {[
                    { l: t("preview.dashboard.srcWebsite"), p: "35%", c: "bg-violet-500" },
                    { l: "LinkedIn", p: "25%", c: "bg-cyan-500" },
                    { l: t("preview.dashboard.srcReferral"), p: "20%", c: "bg-emerald-500" },
                    { l: t("preview.dashboard.srcCampaign"), p: "12%", c: "bg-amber-500" },
                    { l: t("preview.dashboard.srcOther"), p: "8%", c: "bg-indigo-500" },
                  ].map((s) => (
                    <div key={s.l} className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", s.c)} />
                      <span className="text-[8px] text-[#001E3C]/60 flex-1">{s.l}</span>
                      <span className="text-[8px] text-[#001E3C]/40">{s.p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Deals + Leads + Activity */}
          <div className="grid grid-cols-3 gap-1">
            {/* Recent Deals */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.recentDeals")}</span>
                <span className="text-[8px] text-violet-600">{t("preview.viewAll")}</span>
              </div>
              <div className="space-y-[4px]">
                {recentDeals.map((d) => (
                  <div key={d.name} className="flex items-center gap-1 py-[3px]">
                    <div className={cn("w-1 h-5 rounded-full flex-shrink-0", d.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-[#001E3C]/80 font-medium truncate">{d.name}</span>
                        {d.hot && <Star className="w-2 h-2 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      </div>
                      <span className="text-[8px] text-[#001E3C]/40">{d.company}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-emerald-600 flex-shrink-0">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Leads with AI scoring */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Bot className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.daVinciScoring")}</span>
                </div>
                <span className="text-[8px] text-violet-600">{t("preview.viewAll")}</span>
              </div>
              <div className="space-y-[4px]">
                {topLeads.map((l) => (
                  <div key={l.name} className="flex items-center gap-1 py-[3px]">
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0 border", l.bg)}>
                      {l.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-[#001E3C]/80 font-medium truncate block">{l.name}</span>
                      <span className="text-[8px] text-[#001E3C]/40">{l.company}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.recentActivity")}</span>
                <Clock className="w-3 h-3 text-[#001E3C]/40" />
              </div>
              <div className="space-y-[4px]">
                {activities.map((a) => (
                  <div key={a.text} className="flex items-start gap-1 py-[2px]">
                    <a.icon className={cn("w-3 h-3 mt-[1px] flex-shrink-0", a.color)} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-[#001E3C]/60 block truncate">{a.text}</span>
                      <span className="text-[7px] text-[#001E3C]/25">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Marketing + Events + Weekly Charts */}
          <div className="grid grid-cols-3 gap-1">
            {/* Marketing campaigns */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.sidebar.campaigns")}</span>
                <Megaphone className="w-3 h-3 text-violet-500" />
              </div>
              {[
                { name: "Yaz Kampaniyası", sent: "2,450", open: "68%", click: "17%" },
                { name: "Webinar Dəvət", sent: "890", open: "70%", click: "22%" },
              ].map((c) => (
                <div key={c.name} className="mb-1.5 last:mb-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-[#001E3C]/80 font-medium">{c.name}</span>
                    <span className="text-[7px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Aktiv</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { v: c.sent, l: t("preview.dashboard.metricSent") },
                      { v: c.open, l: t("preview.dashboard.metricOpen") },
                      { v: c.click, l: t("preview.dashboard.metricClick") },
                    ].map((m) => (
                      <div key={m.l} className="text-center p-0.5 rounded bg-[#F3F4F7] border border-[#001E3C]/8">
                        <div className="text-[9px] font-semibold text-[#001E3C]/80">{m.v}</div>
                        <div className="text-[7px] text-[#001E3C]/40">{m.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Events */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.events")}</span>
                <Calendar className="w-3 h-3 text-violet-500" />
              </div>
              {[
                { title: "Bakı Tech Summit", date: "Apr 5", att: 124, type: "Konfrans" },
                { title: "CRM Demo Day", date: "Apr 12", att: 45, type: "Webinar" },
                { title: "Satış Təlimi", date: "Apr 18", att: 32, type: "Təlim" },
              ].map((e) => (
                <div key={e.title} className="flex items-center gap-1 py-[3px]">
                  <div className="w-7 h-7 rounded bg-violet-50 border border-violet-200 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[7px] text-violet-400 leading-none">{e.date.split(" ")[0]}</span>
                    <span className="text-[9px] font-bold text-violet-700 leading-none">{e.date.split(" ")[1]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-[#001E3C]/80 font-medium truncate block">{e.title}</span>
                    <span className="text-[7px] text-[#001E3C]/40">{e.type} • {e.att} nəfər</span>
                  </div>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Weekly mini charts */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">{t("preview.dashboard.weekly")}</span>
                <BarChart3 className="w-3 h-3 text-[#001E3C]/40" />
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] text-[#001E3C]/40">{t("preview.dashboard.newLeads")}</span>
                    <span className="text-[8px] font-semibold text-violet-600">165</span>
                  </div>
                  <MiniBarChart data={leadsWeekly} color="bg-violet-400" height="h-6" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] text-[#001E3C]/40">{t("preview.sidebar.tickets")}</span>
                    <span className="text-[8px] font-semibold text-cyan-600">75</span>
                  </div>
                  <MiniBarChart data={ticketsDaily} color="bg-cyan-400" height="h-6" />
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#001E3C]/8">
                  <div className="text-center">
                    <div className="text-[9px] font-bold text-[#001E3C]/80">94%</div>
                    <div className="text-[7px] text-[#001E3C]/40">SLA</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-bold text-emerald-600">4.7</div>
                    <div className="text-[7px] text-[#001E3C]/40">CSAT</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[9px] font-bold text-violet-600">2.1h</div>
                    <div className="text-[7px] text-[#001E3C]/40">{t("preview.dashboard.avgResponse")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
