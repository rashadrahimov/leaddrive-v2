"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, DollarSign, TrendingUp,
  Clock, CheckCircle2, Search, Bell, ArrowUpRight,
  Filter, Plus, Mail, Send, RefreshCw,
  Megaphone, Inbox, Bot, Settings,
  MessageSquare, Phone, Zap, CalendarClock,
  Headphones, BarChart3, Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Mini bar chart ── */
function MiniBarChart({ data, color, height = "h-12" }: { data: number[]; color: string; height?: string }) {
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
function MiniLineChart({ data, color, width = 200, height = 40 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(" ")
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`lg-inv-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#lg-inv-${color.replace("#","")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Mini donut (SVG) ── */
function MiniDonut({ segments, size = 48 }: { segments: { pct: number; color: string }[]; size?: number }) {
  let offset = 0
  const r = size / 2 - 6, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E9ED" strokeWidth="5" />
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
    </svg>
  )
}

/* ── Data ── */
const revenueMonthly = [42, 55, 48, 62, 58, 71, 65, 78, 82, 91, 88, 98]
const collectionsWeekly = [12, 18, 8, 22, 15, 25, 19]

const sidebarItems = [
  { icon: LayoutDashboard, label: "İdarə paneli", active: false },
  { icon: Building2, label: "Şirkətlər" },
  { icon: Users, label: "Kontaktlar" },
  { icon: Target, label: "Sövdələşmələr" },
  { icon: UserCheck, label: "Lidlər" },
  { icon: Inbox, label: "Gələn qutusu" },
  { icon: Megaphone, label: "Kampaniyalar" },
  { icon: Headphones, label: "Tiketlər" },
  { icon: BarChart3, label: "Hesabatlar" },
  { icon: Receipt, label: "Maliyyə", active: true },
  { icon: Bot, label: "Da Vinci Mərkəzi" },
  { icon: Settings, label: "Parametrlər" },
]

/* ── Recurring invoice rules ── */
const recurringRules = [
  { client: "TechVision MMC", amount: "₼4,500/ay", cycle: "Aylıq", nextDate: "01/04/2026", status: "Aktiv", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { client: "NeftGaz MMC", amount: "₼8,200/ay", cycle: "Aylıq", nextDate: "01/04/2026", status: "Aktiv", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { client: "BankTech", amount: "₼2,800/rüb", cycle: "Rüblük", nextDate: "01/07/2026", status: "Aktiv", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { client: "CloudAz", amount: "₼6,000/ay", cycle: "Aylıq", nextDate: "01/04/2026", status: "Pauza", statusColor: "bg-amber-50 text-amber-700 border-amber-200" },
]

/* ── Payment notification rules ── */
const notificationRules = [
  { trigger: "Faktura yaradıldı", channels: ["email", "whatsapp"], delay: "Dərhal", active: true },
  { trigger: "3 gün qalmış", channels: ["email", "sms"], delay: "Son tarixdən 3 gün əvvəl", active: true },
  { trigger: "Son tarix keçdi", channels: ["email", "whatsapp", "sms"], delay: "Son tarix günü", active: true },
  { trigger: "7 gün gecikmiş", channels: ["email", "phone"], delay: "Son tarixdən +7 gün", active: true },
  { trigger: "30 gün gecikmiş", channels: ["email", "whatsapp", "sms", "phone"], delay: "Son tarixdən +30 gün", active: false },
]

const channelIcons: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone,
  phone: Phone,
}

const channelColors: Record<string, string> = {
  email: "bg-blue-100 text-blue-600",
  whatsapp: "bg-emerald-100 text-emerald-600",
  sms: "bg-violet-100 text-violet-600",
  phone: "bg-amber-100 text-amber-600",
}

/* ── Recent invoices ── */
const invoices = [
  { number: "INV-2026-042", client: "TechVision MMC", amount: "₼8,145", status: "Ödənilib", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200", date: "28/03" },
  { number: "INV-2026-041", client: "AzərLogistik", amount: "₼12,800", status: "Gözləyir", statusColor: "bg-amber-50 text-amber-700 border-amber-200", date: "25/03" },
  { number: "INV-2026-040", client: "NeftGaz MMC", amount: "₼25,000", status: "Ödənilib", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200", date: "22/03" },
  { number: "INV-2026-039", client: "BankTech", amount: "₼5,000", status: "Gecikmiş", statusColor: "bg-red-50 text-red-700 border-red-200", date: "15/03" },
  { number: "INV-2026-038", client: "DevPort", amount: "₼9,605", status: "Ödənilib", statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200", date: "12/03" },
]

/* ── Aging buckets ── */
const agingBuckets = [
  { label: "Cari", amount: "₼19,375", pct: 35, color: "bg-emerald-500" },
  { label: "1-30 gün", amount: "₼12,800", pct: 23, color: "bg-blue-500" },
  { label: "31-60 gün", amount: "₼8,200", pct: 15, color: "bg-amber-500" },
  { label: "61-90 gün", amount: "₼5,000", pct: 9, color: "bg-[#0176D3]" },
  { label: "90+ gün", amount: "₼9,825", pct: 18, color: "bg-red-500" },
]

export function InvoicePreview() {
  return (
    <div className="w-full bg-white rounded-xl overflow-hidden text-[11px] leading-tight select-none pointer-events-none shadow-inner">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-[#0176D3] to-[#0176D3] flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[10px] font-bold">LeadDrive</span>
          </div>
          <div className="flex items-center gap-0.5 bg-[#001E3C]/60 rounded-md px-2 py-1">
            <Search className="w-2.5 h-2.5 text-[#001E3C]/40" />
            <span className="text-[9px] text-[#001E3C]/40 ml-1">Axtar...</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-3 h-3 text-[#001E3C]/40" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0176D3] to-[#0176D3] flex items-center justify-center text-[8px] font-bold">R</div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="flex flex-col w-[120px] bg-[#0f172a] text-white py-2 flex-shrink-0">
          {sidebarItems.map((item) => (
            <div key={item.label} className={cn(
              "flex items-center gap-2 px-3 py-[5px] text-[9px] cursor-default transition-colors",
              item.active ? "bg-[#0176D3]/20 text-[#0176D3] border-l-2 border-[#0176D3]" : "text-[#001E3C]/40 border-l-2 border-transparent"
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
              <h2 className="text-[13px] font-bold text-[#001E3C]">Hesab-fakturalar</h2>
              <p className="text-[8px] text-[#001E3C]/40">Fakturaları yaradın, göndərin və izləyin</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px] px-2 py-0.5 rounded-md bg-[#F3F4F7] text-[#001E3C]/60 border border-[#001E3C]/10 flex items-center gap-0.5"><Filter className="w-2 h-2" /> Filter</span>
              <span className="text-[8px] px-2 py-0.5 rounded-md bg-[#0176D3] text-white font-medium flex items-center gap-0.5"><Plus className="w-2 h-2" /> Yeni faktura</span>
            </div>
          </div>

          {/* KPI Row - 6 cards */}
          <div className="grid grid-cols-6 gap-1">
            {[
              { label: "Ümumi gəlir", value: "₼247.8K", change: "+18%", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { label: "Gözləyir", value: "₼55.2K", change: "12 faktura", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
              { label: "Ödənilib", value: "₼168.4K", change: "+24%", icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
              { label: "Gecikmiş", value: "₼24.2K", change: "4 faktura", icon: TrendingUp, color: "text-red-600", bg: "bg-red-50 border-red-100" },
              { label: "Təkrarlanan", value: "₼21.5K/ay", change: "4 qayda", icon: RefreshCw, color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
              { label: "Orta ödəniş", value: "18 gün", change: "-3 gün", icon: CalendarClock, color: "text-cyan-600", bg: "bg-cyan-50 border-cyan-100" },
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

          {/* Row 2: Revenue Trend + Aging Analysis + Payment Status Donut */}
          <div className="grid grid-cols-3 gap-1">
            {/* Revenue trend */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Gəlir Trendi</span>
                <span className="text-[8px] text-emerald-600 font-medium">↑ 28%</span>
              </div>
              <MiniLineChart data={revenueMonthly} color="#f97316" width={180} height={40} />
              <div className="flex justify-between mt-1 text-[7px] text-[#001E3C]/25">
                {["Y","F","M","A","M","İ","İ","A","S","O","N","D"].map((m,i) => <span key={i}>{m}</span>)}
              </div>
            </div>

            {/* Debitor aging analysis */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Debitor Borcu (Aging)</span>
                <span className="text-[8px] text-[#001E3C]/40">₼55.2K</span>
              </div>
              <div className="space-y-[5px]">
                {agingBuckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-1">
                    <span className="text-[8px] text-[#001E3C]/40 w-12 truncate">{b.label}</span>
                    <div className="flex-1 h-2.5 bg-[#F3F4F7] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", b.color)} style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="text-[8px] text-[#001E3C]/60 w-10 text-right font-medium">{b.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment status donut */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Ödəniş Statusu</span>
                <span className="text-[8px] text-[#001E3C]/40">42 faktura</span>
              </div>
              <div className="flex items-center gap-2">
                <MiniDonut size={48} segments={[
                  { pct: 55, color: "#10b981" }, { pct: 25, color: "#f59e0b" },
                  { pct: 12, color: "#ef4444" }, { pct: 8, color: "#6366f1" },
                ]} />
                <div className="space-y-[3px] flex-1">
                  {[
                    { l: "Ödənilib", p: "55%", c: "bg-emerald-500" },
                    { l: "Gözləyir", p: "25%", c: "bg-amber-500" },
                    { l: "Gecikmiş", p: "12%", c: "bg-red-500" },
                    { l: "Qaralama", p: "8%", c: "bg-indigo-500" },
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

          {/* Row 3: Recurring Invoices + Payment Notification Rules + Recent Invoices */}
          <div className="grid grid-cols-3 gap-1">
            {/* Recurring invoices (auto monthly) */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-semibold text-[#001E3C]/80">Avto-fakturalar</span>
                </div>
                <span className="text-[8px] text-violet-600">+ Yeni</span>
              </div>
              <div className="space-y-[4px]">
                {recurringRules.map((rule) => (
                  <div key={rule.client} className="flex items-center gap-1 py-[3px]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-[#001E3C]/80 font-medium truncate">{rule.client}</span>
                        <span className={cn("text-[7px] px-1 py-0.5 rounded border font-medium", rule.statusColor)}>{rule.status}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-semibold text-emerald-600">{rule.amount}</span>
                        <span className="text-[7px] text-[#001E3C]/40">{rule.cycle}</span>
                        <span className="text-[7px] text-[#001E3C]/40">→ {rule.nextDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment notification rules (multi-channel) */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1">
                  <Send className="w-3 h-3 text-[#0176D3]" />
                  <span className="text-[10px] font-semibold text-[#001E3C]/80">Ödəniş Xəbərdarlıqları</span>
                </div>
                <span className="text-[8px] text-[#0176D3]">Qaydalar</span>
              </div>
              <div className="space-y-[4px]">
                {notificationRules.map((rule) => (
                  <div key={rule.trigger} className="flex items-center gap-1 py-[2px]">
                    <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", rule.active ? "bg-emerald-500" : "bg-[#001E3C]/25")} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-[#001E3C]/80 font-medium block truncate">{rule.trigger}</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {rule.channels.map((ch) => {
                          const Icon = channelIcons[ch]
                          return (
                            <div key={ch} className={cn("w-3.5 h-3.5 rounded flex items-center justify-center", channelColors[ch])}>
                              <Icon className="w-2 h-2" />
                            </div>
                          )
                        })}
                        <span className="text-[7px] text-[#001E3C]/40 ml-1">{rule.delay}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent invoices + Weekly collections */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Son Fakturalar</span>
                <span className="text-[8px] text-[#0176D3]">Hamısı →</span>
              </div>
              <div className="space-y-[4px]">
                {invoices.map((inv) => (
                  <div key={inv.number} className="flex items-center gap-1 py-[2px]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-blue-600 font-medium">{inv.number}</span>
                        <span className={cn("text-[7px] px-1 py-0.5 rounded border font-medium", inv.statusColor)}>{inv.status}</span>
                      </div>
                      <span className="text-[8px] text-[#001E3C]/40">{inv.client}</span>
                    </div>
                    <span className="text-[9px] font-semibold text-[#001E3C] flex-shrink-0">{inv.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Collections chart + Flow diagram + Quick stats */}
          <div className="grid grid-cols-3 gap-1">
            {/* Weekly collections */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Həftəlik Yığım</span>
                <span className="text-[8px] font-semibold text-emerald-600">₼119.5K</span>
              </div>
              <MiniBarChart data={collectionsWeekly} color="bg-[#0176D3]" height="h-8" />
              <div className="grid grid-cols-3 gap-1 pt-1 mt-1 border-t border-[#001E3C]/8">
                <div className="text-center">
                  <div className="text-[9px] font-bold text-[#001E3C]/80">92%</div>
                  <div className="text-[7px] text-[#001E3C]/40">Yığım %</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold text-emerald-600">18 gün</div>
                  <div className="text-[7px] text-[#001E3C]/40">Ort. ödəniş</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-bold text-[#0176D3]">₼21.5K</div>
                  <div className="text-[7px] text-[#001E3C]/40">Aylıq avto</div>
                </div>
              </div>
            </div>

            {/* Financial flow */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Maliyyə Axını</span>
                <Zap className="w-3 h-3 text-[#0176D3]" />
              </div>
              <div className="space-y-1">
                {[
                  { from: "Təklif", to: "Faktura", count: "8 bu ay", color: "bg-violet-100 text-violet-700" },
                  { from: "Faktura", to: "Ödəniş", count: "24 bu ay", color: "bg-blue-100 text-blue-700" },
                  { from: "Ödəniş", to: "Debitor", count: "₼168.4K", color: "bg-emerald-100 text-emerald-700" },
                  { from: "Debitor", to: "Fond", count: "3 hesab", color: "bg-amber-100 text-amber-700" },
                ].map((flow) => (
                  <div key={flow.from} className="flex items-center gap-1">
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-medium", flow.color)}>{flow.from}</span>
                    <span className="text-[8px] text-[#001E3C]/25">→</span>
                    <span className={cn("text-[8px] px-1.5 py-0.5 rounded font-medium", flow.color)}>{flow.to}</span>
                    <span className="text-[7px] text-[#001E3C]/40 ml-auto">{flow.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-currency + Quick actions */}
            <div className="rounded-lg bg-white border border-[#001E3C]/10 p-2 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-[#001E3C]/80">Multi-valyuta</span>
                <DollarSign className="w-3 h-3 text-emerald-500" />
              </div>
              {[
                { cur: "AZN", amount: "₼168,420", flag: "🇦🇿", change: "+18%" },
                { cur: "USD", amount: "$45,200", flag: "🇺🇸", change: "+12%" },
                { cur: "EUR", amount: "€12,800", flag: "🇪🇺", change: "+8%" },
              ].map((c) => (
                <div key={c.cur} className="flex items-center gap-1 py-[3px]">
                  <span className="text-[10px]">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-[#001E3C]/80 font-medium">{c.cur}</span>
                  </div>
                  <span className="text-[9px] font-semibold text-[#001E3C]">{c.amount}</span>
                  <span className="text-[7px] text-emerald-600">{c.change}</span>
                </div>
              ))}
              <div className="mt-1.5 pt-1 border-t border-[#001E3C]/8">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-[#001E3C]/60">Məzənnə</span>
                  <span className="text-[8px] text-[#001E3C]/60">1 USD = 1.70 AZN</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-[#001E3C]/60">Yenilənmə</span>
                  <span className="text-[8px] text-[#001E3C]/40">Avtomatik</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
