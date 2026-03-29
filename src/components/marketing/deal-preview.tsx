"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, DollarSign, TrendingUp,
  Clock, CheckCircle2, Search, Bell, ArrowUpRight,
  Shield, Zap, Phone, Mail, Calendar,
  MessageSquare, User, Tag, ChevronRight,
  Megaphone, Inbox, BarChart3, Settings,
  Bot, Users, Headphones,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Mini line chart (SVG) ── */
function MiniLineChart({ data, color, width = 200, height = 40 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(" ")
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`lg-deal-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#lg-deal-${color.replace("#","")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Mini donut (SVG) ── */
function MiniDonut({ segments, size = 48, label }: { segments: { pct: number; color: string }[]; size?: number; label?: string }) {
  let offset = 0
  const r = size / 2 - 6, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="5" />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * c
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color}
            strokeWidth="5" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        )
        offset += dash
        return el
      })}
      {label && <text x={size/2} y={size/2+3} textAnchor="middle" className="text-[8px] font-bold fill-slate-700">{label}</text>}
    </svg>
  )
}

/* ── Data ── */
const dealVelocity = [14, 18, 12, 22, 16, 20, 15, 24, 19, 26, 21, 28]
const revenueProjection = [45, 52, 48, 68, 72, 85, 78, 92, 88, 105, 98, 120]

const sidebarItems = [
  { icon: LayoutDashboard, label: "İdarə paneli" },
  { icon: Building2, label: "Şirkətlər" },
  { icon: Users, label: "Kontaktlar" },
  { icon: Target, label: "Sövdələşmələr", active: true },
  { icon: UserCheck, label: "Lidlər" },
  { icon: Inbox, label: "Gələn qutusu" },
  { icon: Megaphone, label: "Kampaniyalar" },
  { icon: Headphones, label: "Tiketlər" },
  { icon: BarChart3, label: "Hesabatlar" },
  { icon: Receipt, label: "Maliyyə" },
  { icon: Bot, label: "AI Mərkəzi" },
  { icon: Settings, label: "Parametrlər" },
]

/* ── Pipeline stages ── */
const pipelineStages = [
  { label: "Lid", count: 8, amount: "₼24.5K", pct: 100, color: "bg-violet-500" },
  { label: "Kvalifikasiya", count: 6, amount: "₼42.3K", pct: 75, color: "bg-blue-500" },
  { label: "Təklif", count: 5, amount: "₼68.2K", pct: 63, color: "bg-cyan-500" },
  { label: "Danışıqlar", count: 3, amount: "₼52.0K", pct: 38, color: "bg-teal-500" },
  { label: "Qazanıldı", count: 4, amount: "₼98.7K", pct: 50, color: "bg-emerald-500" },
]


/* ── Win/Loss analysis ── */
const winLossData = [
  { month: "Yan", won: 3, lost: 1 },
  { month: "Fev", won: 5, lost: 2 },
  { month: "Mar", won: 4, lost: 1 },
]

/* ── Competitors ── */
const competitors = [
  { name: "Bitrix24", deals: 3, winRate: "33%", threat: "Yüksək", color: "text-red-600 bg-red-50 border-red-200" },
  { name: "AmoCRM", deals: 2, winRate: "50%", threat: "Orta", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "HubSpot", deals: 1, winRate: "100%", threat: "Aşağı", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
]

/* ── AI Predictions ── */
const aiPredictions = [
  { deal: "NeftGaz ERP", prediction: "Qazanılacaq", confidence: 85, reason: "Güclü champion, büdcə təsdiqi alınıb", icon: CheckCircle2, color: "text-emerald-600" },
  { deal: "DevPort Kiber", prediction: "Risk altında", confidence: 30, reason: "Rəqib aktiv, qərar verici cavab vermir", icon: XCircle, color: "text-red-600" },
  { deal: "FinServ Data", prediction: "Ehtimal yüksək", confidence: 68, reason: "Demo uğurlu, texniki qiymətləndirmə başlayıb", icon: TrendingUp, color: "text-blue-600" },
]

/* ── Contact roles ── */
const contactRoles = [
  { name: "Kamran Əliyev", role: "Qərar verici", loyalty: 92, color: "bg-emerald-500" },
  { name: "Nigar Həsənova", role: "Champion", loyalty: 88, color: "bg-blue-500" },
  { name: "Rəşad Məmmədov", role: "Təsiredici", loyalty: 65, color: "bg-amber-500" },
]

export function DealPreview() {
  return (
    <div className="w-full bg-white rounded-xl overflow-hidden text-[11px] leading-tight select-none pointer-events-none shadow-inner">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[10px] font-bold">LeadDrive</span>
          </div>
          <div className="flex items-center gap-0.5 bg-slate-800 rounded-md px-2 py-1">
            <Search className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[9px] text-slate-400 ml-1">Axtar...</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-3 h-3 text-slate-400" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-[8px] font-bold">R</div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="flex flex-col w-[120px] bg-[#0f172a] text-white py-2 flex-shrink-0">
          {sidebarItems.map((item) => (
            <div key={item.label} className={cn(
              "flex items-center gap-2 px-3 py-[5px] text-[9px] cursor-default transition-colors",
              item.active ? "bg-orange-600/20 text-orange-300 border-l-2 border-orange-400" : "text-slate-400 border-l-2 border-transparent"
            )}>
              <item.icon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 bg-slate-50 p-1.5 space-y-1 min-w-0">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-slate-800">Satış Pipeline & Analitika</h2>
              <p className="text-[8px] text-slate-400">26 sövdələşmə • ₼285.5K huni dəyəri</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">Bu rüb</span>
              <span className="text-[8px] px-2 py-0.5 rounded-md bg-orange-500 text-white font-medium">+ Yeni sövdələşmə</span>
            </div>
          </div>

          {/* KPI Row - 6 cards */}
          <div className="grid grid-cols-6 gap-1">
            {[
              { label: "Huni dəyəri", value: "₼285.5K", change: "+22%", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Qazanıldı", value: "₼98.7K", change: "4 sövdə", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
              { label: "Konversiya", value: "32.4%", change: "+5.1%", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
              { label: "Ort. dövrü", value: "24 gün", change: "-3 gün", icon: Clock, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-100" },
              { label: "Ort. dəyər", value: "₼11.0K", change: "+8%", icon: Target, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
              { label: "AI Proqnoz", value: "₼142K", change: "Bu rüb", icon: Bot, color: "text-pink-600", bg: "bg-pink-50 border-pink-100" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center border", kpi.bg)}>
                    <kpi.icon className={cn("w-2.5 h-2.5", kpi.color)} />
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900">{kpi.value}</div>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <ArrowUpRight className="w-2 h-2 text-emerald-500" />
                  <span className="text-[8px] text-emerald-600">{kpi.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: Kanban Mini + Revenue Projection + Win/Loss */}
          <div className="grid grid-cols-3 gap-1">
            {/* Mini Kanban columns */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700">Pipeline Kanban</span>
                <span className="text-[8px] text-slate-400">26 sövdə</span>
              </div>
              <div className="flex gap-[3px]">
                {pipelineStages.map((s) => (
                  <div key={s.label} className="flex-1 min-w-0">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <div className={cn("w-1 h-1 rounded-full", s.color)} />
                      <span className="text-[7px] text-slate-500 truncate">{s.label}</span>
                    </div>
                    <div className="text-[8px] font-bold text-slate-700 mb-0.5">{s.amount}</div>
                    {Array.from({ length: Math.min(s.count, 3) }).map((_, j) => (
                      <div key={j} className="bg-slate-50 border border-slate-100 rounded p-0.5 mb-[2px]">
                        <div className="w-full h-[3px] bg-slate-200 rounded" />
                        <div className="w-2/3 h-[2px] bg-slate-100 rounded mt-[1px]" />
                      </div>
                    ))}
                    <span className="text-[6px] text-slate-300">{s.count} sövdə</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue projection */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-700">Gəlir Proqnozu</span>
                <span className="text-[8px] text-emerald-600 font-medium">↑ 32%</span>
              </div>
              <MiniLineChart data={revenueProjection} color="#8b5cf6" width={180} height={40} />
              <div className="flex justify-between mt-1 text-[7px] text-slate-300">
                {["Y","F","M","A","M","İ","İ","A","S","O","N","D"].map((m,i) => <span key={i}>{m}</span>)}
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span className="text-[7px] text-slate-400">Çatdırılacaq (proqnoz)</span>
                <span className="text-[8px] font-bold text-violet-600">₼420K</span>
              </div>
            </div>

            {/* Win/Loss donut + analysis */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-700">Qazanma / İtirmə</span>
                <span className="text-[8px] text-slate-400">Bu rüb</span>
              </div>
              <div className="flex items-center gap-2">
                <MiniDonut size={48} segments={[
                  { pct: 65, color: "#10b981" }, { pct: 20, color: "#ef4444" }, { pct: 15, color: "#94a3b8" },
                ]} label="65%" />
                <div className="space-y-[3px] flex-1">
                  {[
                    { l: "Qazanıldı", v: "12", c: "bg-emerald-500", pct: "65%" },
                    { l: "İtirildi", v: "4", c: "bg-red-500", pct: "20%" },
                    { l: "Davam edir", v: "10", c: "bg-slate-400", pct: "—" },
                  ].map((s) => (
                    <div key={s.l} className="flex items-center gap-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", s.c)} />
                      <span className="text-[8px] text-slate-500 flex-1">{s.l}</span>
                      <span className="text-[8px] font-medium text-slate-700">{s.v}</span>
                      <span className="text-[7px] text-slate-400">{s.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span className="text-[7px] text-slate-400">İtirmə səbəbi #1</span>
                <span className="text-[8px] text-red-600">Qiymət (45%)</span>
              </div>
            </div>
          </div>

          {/* Row 3: Top Deals + AI Predictions + Competitors */}
          <div className="grid grid-cols-3 gap-1">
            {/* Engagement metrics */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700">Kontakt Meşğulluğu</span>
                <MessageSquare className="w-3 h-3 text-cyan-500" />
              </div>
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                {[
                  { icon: Phone, label: "Zənglər", value: "47", color: "text-blue-600", bg: "bg-blue-50" },
                  { icon: Mail, label: "E-poçt", value: "124", color: "text-violet-600", bg: "bg-violet-50" },
                  { icon: Calendar, label: "Görüşlər", value: "18", color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((m) => (
                  <div key={m.label} className={cn("rounded p-1 text-center", m.bg)}>
                    <m.icon className={cn("w-2.5 h-2.5 mx-auto mb-0.5", m.color)} />
                    <div className={cn("text-[9px] font-bold", m.color)}>{m.value}</div>
                    <div className="text-[7px] text-slate-500">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-[4px]">
                {[
                  { name: "Kamran Əliyev", action: "Zəng — 15 dəq", time: "2 saat əvvəl", color: "text-blue-500" },
                  { name: "Nigar Həsənova", action: "Email açıldı", time: "4 saat əvvəl", color: "text-violet-500" },
                  { name: "Rəşad Məmmədov", action: "Görüş planlandı", time: "Dünən", color: "text-emerald-500" },
                ].map((a) => (
                  <div key={a.name} className="flex items-center gap-1 py-[2px]">
                    <div className={cn("w-1 h-3 rounded-full", a.color.replace("text-", "bg-"))} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] text-slate-700 font-medium block">{a.name}</span>
                      <span className="text-[7px] text-slate-400">{a.action}</span>
                    </div>
                    <span className="text-[7px] text-slate-300 flex-shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Predictions */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Bot className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-semibold text-slate-700">AI Proqnoz</span>
                </div>
                <span className="text-[7px] px-1 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-200">Da Vinci</span>
              </div>
              <div className="space-y-[5px]">
                {aiPredictions.map((p) => (
                  <div key={p.deal} className="p-1 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 mb-0.5">
                      <p.icon className={cn("w-2.5 h-2.5 flex-shrink-0", p.color)} />
                      <span className="text-[9px] font-medium text-slate-700">{p.deal}</span>
                      <span className={cn("text-[7px] ml-auto font-bold", p.color)}>{p.confidence}%</span>
                    </div>
                    <span className="text-[7px] text-slate-500 block truncate">{p.reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitors + Contact Roles */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700">Rəqib Analizi</span>
                <Shield className="w-3 h-3 text-orange-500" />
              </div>
              <div className="space-y-[4px] mb-1.5">
                {competitors.map((c) => (
                  <div key={c.name} className="flex items-center gap-1 py-[2px]">
                    <span className="text-[9px] text-slate-700 font-medium flex-1">{c.name}</span>
                    <span className="text-[8px] text-slate-500">{c.deals} sövdə</span>
                    <span className={cn("text-[7px] px-1 py-0.5 rounded border font-medium", c.color)}>{c.threat}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 border-t border-slate-100">
                <span className="text-[8px] font-semibold text-slate-600 block mb-1">Kontakt Rolları</span>
                {contactRoles.map((c) => (
                  <div key={c.name} className="flex items-center gap-1 py-[2px]">
                    <div className={cn("w-1 h-3.5 rounded-full flex-shrink-0", c.color)} />
                    <span className="text-[8px] text-slate-700 flex-1">{c.name}</span>
                    <span className="text-[7px] text-slate-400">{c.role}</span>
                    <span className="text-[7px] font-semibold text-slate-600">{c.loyalty}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Deal velocity + Weekly closings + Next Best Offers */}
          <div className="grid grid-cols-3 gap-1">
            {/* Deal velocity */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-700">Sövdələşmə Sürəti</span>
                <span className="text-[8px] text-emerald-600 font-medium">↑ 15%</span>
              </div>
              <MiniLineChart data={dealVelocity} color="#06b6d4" width={180} height={35} />
              <div className="grid grid-cols-3 gap-1 pt-1 mt-1 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-[9px] font-bold text-slate-700">24 gün</div>
                  <div className="text-[7px] text-slate-400">Ort. dövrü</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold text-emerald-600">12 gün</div>
                  <div className="text-[7px] text-slate-400">Ən sürətli</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold text-amber-600">45 gün</div>
                  <div className="text-[7px] text-slate-400">Ən yavaş</div>
                </div>
              </div>
            </div>

            {/* Upcoming deal tasks */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-slate-700">Növbəti Addımlar</span>
                <FileText className="w-3 h-3 text-orange-500" />
              </div>
              <div className="space-y-[4px]">
                {[
                  { task: "NeftGaz — Demo təqdimat", due: "Sabah", priority: "Yüksək", color: "bg-red-500" },
                  { task: "BankTech — Təklif göndər", due: "30 Mar", priority: "Orta", color: "bg-amber-500" },
                  { task: "FinServ — Texniki qiy.", due: "2 Apr", priority: "Yüksək", color: "bg-red-500" },
                  { task: "DevPort — Follow-up zəng", due: "3 Apr", priority: "Aşağı", color: "bg-blue-500" },
                ].map((t) => (
                  <div key={t.task} className="flex items-center gap-1 py-[2px]">
                    <div className={cn("w-1 h-3.5 rounded-full flex-shrink-0", t.color)} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] text-slate-700 font-medium block truncate">{t.task}</span>
                      <span className="text-[7px] text-slate-400">{t.priority}</span>
                    </div>
                    <span className="text-[7px] text-slate-500 flex-shrink-0 font-medium">{t.due}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1 pt-1 border-t border-slate-100 flex justify-between">
                <span className="text-[7px] text-slate-400">Gecikmiş tapşırıqlar</span>
                <span className="text-[8px] text-red-600 font-semibold">2</span>
              </div>
            </div>

            {/* Next Best Offers */}
            <div className="rounded-lg bg-white border border-slate-200 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-orange-500" />
                  <span className="text-[10px] font-semibold text-slate-700">Next Best Offers</span>
                </div>
              </div>
              {[
                { name: "Cloud Migration", client: "NeftGaz", match: 96, price: "₼8,000", color: "from-violet-500 to-blue-500" },
                { name: "Cybersecurity Suite", client: "BankTech", match: 88, price: "₼3,600", color: "from-emerald-500 to-teal-500" },
                { name: "Data Analytics Pro", client: "FinServ", match: 72, price: "₼15,000", color: "from-orange-500 to-red-500" },
              ].map((offer) => (
                <div key={offer.name} className="flex items-center gap-1 p-1 rounded bg-slate-50 border border-slate-100 mb-[3px]">
                  <div className={cn("w-4 h-4 rounded flex items-center justify-center flex-shrink-0 bg-gradient-to-br", offer.color)}>
                    <Shield className="w-2 h-2 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] font-medium text-slate-700 block truncate">{offer.name}</span>
                    <span className="text-[7px] text-slate-400">{offer.client} • {offer.price}</span>
                  </div>
                  <div className={cn(
                    "w-6 h-4 rounded flex items-center justify-center text-[7px] font-bold flex-shrink-0",
                    offer.match >= 90 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {offer.match}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
