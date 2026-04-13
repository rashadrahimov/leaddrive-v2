"use client"

import { useRef, useState, useEffect, useLayoutEffect } from "react"
import { useTranslations } from "next-intl"
import { AnimateIn } from "./animate-in"
import {
  Users, Megaphone, MessageSquare, Headphones,
  LineChart, Receipt, Bot,
  ArrowRight, TrendingUp, Mail, Send,
  CheckCircle2, Clock, Zap, Target,
  Check, BarChart3, ArrowUpRight,
  Search, Bell, Settings, ChevronDown,
  LayoutDashboard, Building2, UserCheck, Inbox,
  Briefcase, FileText, Phone, Star,
  Globe, Calendar, CalendarDays, Presentation, Video, Wrench, Coffee, MapPin,
  UserPlus, TicketCheck, DollarSign, Layers,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { STAGE_COLORS } from "@/lib/constants"

/* ══════════════════════════════════════════════════════
   SHARED: App Shell (dark nav + sidebar) + Chart helpers
   ══════════════════════════════════════════════════════ */

function MiniBarChart({ data, color, height = "h-14" }: { data: number[]; color: string; height?: string }) {
  const max = Math.max(...data)
  return (
    <div className={cn("flex items-end gap-[2px]", height)}>
      {data.map((v, i) => (
        <div key={i} className={cn("flex-1 rounded-t-sm min-w-[3px]", color)} style={{ height: `${(v / max) * 100}%`, opacity: 0.4 + (v / max) * 0.6 }} />
      ))}
    </div>
  )
}

function MiniLineChart({ data, color, width = 180, height = 45 }: { data: number[]; color: string; width?: number; height?: number }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4)}`).join(" ")
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs><linearGradient id={`mlc-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#mlc-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MiniDonut({ segments, size = 48 }: { segments: { pct: number; color: string }[]; size?: number }) {
  let offset = 0; const r = size / 2 - 5, c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E8E9ED" strokeWidth="5" />
      {segments.map((seg, i) => { const dash = (seg.pct / 100) * c; const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={seg.color} strokeWidth="5" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />; offset += dash; return el })}
    </svg>
  )
}

/* Shared dark top nav + sidebar */
const sidebarItems = [
  { icon: LayoutDashboard, label: "İdarə Paneli" },
  { icon: Building2, label: "Şirkətlər" },
  { icon: UserCheck, label: "Kontaktlar" },
  { icon: Briefcase, label: "Sövdələşmələr" },
  { icon: Target, label: "Lidlər" },
  { icon: Inbox, label: "Gələn Qutusu" },
  { icon: Headphones, label: "Tiketlər" },
  { icon: BarChart3, label: "Hesabatlar" },
  { icon: Bot, label: "Da Vinci Mərkəzi" },
  { icon: Settings, label: "Parametrlər" },
]

function AppShell({ children, activeItem }: { children: React.ReactNode; activeItem: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#001E3C]/10 bg-white" style={{ fontSize: 11 }}>
      {/* Top nav */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f172a] text-white">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-[#0176D3] to-[#0176D3]" />
          <span className="text-[10px] font-bold tracking-wide">LeadDrive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Search className="w-3 h-3 text-[#001E3C]/40" />
          <Bell className="w-3 h-3 text-[#001E3C]/40" />
          <div className="w-4 h-4 rounded-full bg-[#0176D3] text-[7px] flex items-center justify-center font-bold">R</div>
        </div>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-28 shrink-0 bg-[#0f172a] py-1 hidden sm:block">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const active = item.label === activeItem
            return (
              <div key={item.label} className={cn("flex items-center gap-1.5 px-2 py-[5px] text-[9px] rounded-r-md mr-1", active ? "bg-white/10 text-white font-medium" : "text-[#001E3C]/60")}>
                <Icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            )
          })}
        </div>
        {/* Content */}
        <div className="flex-1 p-3 bg-[#F3F4F7] min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MODULE PREVIEWS — rich product screens
   ══════════════════════════════════════════════════════ */

function CrmPreview() {
  const kanbanCols = [
    { name: "Lid", color: STAGE_COLORS.LEAD, count: 2, value: "$4,500", deals: [
      { name: "Firewall Setup", company: "Afigroup", value: "$2,500" },
      { name: "Cloud Migration", company: "StarTech", value: "$2,000" },
    ]},
    { name: "Kvalifikasiya", color: STAGE_COLORS.QUALIFIED, count: 3, value: "$15,300", deals: [
      { name: "ERP Integration", company: "MedPlus", value: "$8,500" },
      { name: "SaaS Platform", company: "DataCore", value: "$5,000" },
      { name: "CRM Setup", company: "ZEYTUN PH...", value: "$1,800" },
    ]},
    { name: "Təklif", color: STAGE_COLORS.PROPOSAL, count: 4, value: "$34,500", deals: [
      { name: "IT Outsource", company: "NovaTech", value: "$15,000" },
      { name: "Cyber Security", company: "ZEYTUN PH...", value: "$16,284" },
    ]},
    { name: "Danışıqlar", color: STAGE_COLORS.NEGOTIATION, count: 3, value: "$35,000", deals: [
      { name: "Data Analytics", company: "FinGroup", value: "$8,000" },
      { name: "ERP Deployment", company: "Zeytun Ph...", value: "$25,000" },
    ]},
    { name: "Qazanıldı", color: STAGE_COLORS.WON, count: 1, value: "$3,500", bgExtra: "bg-emerald-50/50", deals: [
      { name: "Network Audit", company: "ZEYTUN PH...", value: "$3,500" },
    ]},
    { name: "İtirildi", color: STAGE_COLORS.LOST, count: 1, value: "$8,000", bgExtra: "bg-red-50/50", deals: [
      { name: "Test Project", company: "Afigroup", value: "$8,000" },
    ]},
  ]
  return (
    <AppShell activeItem="Sövdələşmələr">
      {/* Header — matches real page */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-bold text-[#001E3C]">Satış pipeline</div>
          <div className="text-[7px] text-[#001E3C]/40">14 sövdələşmə</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center border border-[#001E3C]/10 rounded px-1.5 py-0.5 text-[6px] text-[#001E3C]/60 gap-0.5">
            Ən yenilər <ChevronDown className="w-2 h-2" />
          </div>
          <span className="text-[6px] bg-[#001E3C] text-white px-2 py-0.5 rounded font-medium flex items-center gap-0.5">+ Yeni sövdələşmə</span>
        </div>
      </div>

      {/* KPI cards — gradient backgrounds like real product */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {[
          { l: "Cəmi\nsövdələşmə", v: "14", grad: "from-teal-600 to-teal-700" },
          { l: "Huni dəyəri", v: "$98,784", grad: "from-emerald-500 to-emerald-600" },
          { l: "Qazanıldı", v: "$3,500", grad: "from-teal-400 to-cyan-500" },
          { l: "İtirildi", v: "1", grad: "from-red-400 to-rose-500" },
          { l: "Ort. dövrü", v: "4 gün", grad: "from-[#0176D3] to-[#0176D3]" },
          { l: "Da Vinci Proqnoz", v: "$47,567", grad: "from-violet-500 to-purple-600" },
        ].map(k => (
          <div key={k.l} className={cn("rounded-xl bg-gradient-to-br text-white p-1.5 shadow-sm", k.grad)}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[5px] opacity-80 leading-tight whitespace-pre-line">{k.l}</span>
              <TrendingUp className="w-2.5 h-2.5 opacity-50" />
            </div>
            <div className="text-[11px] font-bold">{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs — Kanban / Analitika */}
      <div className="flex gap-3 mb-2 border-b border-[#001E3C]/10 pb-1">
        <span className="text-[7px] font-semibold text-[#001E3C] border-b border-[#001E3C] pb-0.5">Kanban</span>
        <span className="text-[7px] text-[#001E3C]/40 flex items-center gap-0.5"><BarChart3 className="w-2 h-2" /> Analitika</span>
      </div>

      {/* Kanban board — 6 columns matching real product */}
      <div className="flex gap-1 overflow-hidden">
        {kanbanCols.map(col => (
          <div key={col.name} className="flex-1 min-w-0">
            {/* Column header */}
            <div className="px-1 mb-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-[7px] font-semibold text-[#001E3C]/80 truncate">{col.name}</span>
                <span className="text-[5px] bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded-full ml-auto shrink-0">{col.count}</span>
              </div>
              <div className="text-[6px] text-[#001E3C]/40 mt-0.5 pl-3">{col.value}</div>
            </div>
            {/* Drop zone */}
            <div className={cn("rounded-lg border-2 border-dashed border-[#001E3C]/10 p-0.5 space-y-0.5 min-h-[80px]", col.bgExtra || "")}>
              {col.deals.map(d => (
                <div key={d.name} className="bg-white rounded-lg border border-[#001E3C]/8 shadow-sm p-1.5 text-[6px]">
                  <div className="font-medium text-[#001E3C] truncate">{d.name}</div>
                  <div className="text-[#001E3C]/40 truncate text-[5px]">{d.company}</div>
                  <div className="font-bold text-[#001E3C] mt-0.5">{d.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}

function MarketingPreview() {
  return (
    <AppShell activeItem="Kampaniyalar">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-bold text-[#001E3C]">Kampaniyalar</div>
          <div className="text-[7px] text-[#001E3C]/40">6 kampaniya</div>
        </div>
        <div className="flex gap-1">
          <span className="text-[6px] bg-[#F3F4F7] text-[#001E3C]/60 px-1.5 py-0.5 rounded font-medium">Analitika</span>
          <span className="text-[6px] bg-[#F3F4F7] text-[#001E3C]/40 px-1.5 py-0.5 rounded">Siyahı</span>
          <span className="text-[6px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-medium">+ Yeni</span>
        </div>
      </div>

      {/* Row 1: Status gradient cards */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {[
          { label: "Qaralama", count: 2, grad: "from-[#001E3C]/30 to-[#001E3C]/40" },
          { label: "Planlaşdırılıb", count: 1, grad: "from-amber-400 to-amber-500" },
          { label: "Göndərilir", count: 0, grad: "from-blue-400 to-blue-500" },
          { label: "Göndərilib", count: 3, grad: "from-green-500 to-green-600" },
          { label: "Ləğv edilib", count: 0, grad: "from-red-400 to-red-500" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-lg bg-gradient-to-br text-white p-1.5", s.grad)}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[6px] opacity-90">{s.label}</span>
              <Mail className="w-2.5 h-2.5 opacity-70" />
            </div>
            <div className="text-[12px] font-bold">{s.count}</div>
          </div>
        ))}
      </div>

      {/* Row 2: KPI Cards */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {[
          { icon: Send, label: "Göndərilib", value: "6,180", color: "#6366f1" },
          { icon: CheckCircle2, label: "Açılma", value: "34%", color: "#22c55e" },
          { icon: Target, label: "Klik", value: "8.2%", color: "#f59e0b" },
          { icon: TrendingUp, label: "Bounce", value: "2.1%", color: "#ef4444" },
          { icon: DollarSign, label: "Büdcə", value: "₼10k", color: "#8b5cf6" },
          { icon: ArrowUpRight, label: "ROI", value: "+142%", color: "#10b981" },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5 text-center">
              <Icon className="w-2.5 h-2.5 mx-auto mb-0.5" style={{ color: k.color }} />
              <div className="text-[9px] font-bold text-[#001E3C]">{k.value}</div>
              <div className="text-[5px] text-[#001E3C]/40">{k.label}</div>
            </div>
          )
        })}
      </div>

      {/* Row 3: Trend + Funnel + Top Campaigns */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {/* Monthly send trend */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">Aylıq göndərmə trendi</div>
          <div className="flex items-end gap-[2px] h-12 mb-1">
            {[
              { s: 320, o: 120, c: 28 },
              { s: 450, o: 180, c: 42 },
              { s: 280, o: 95, c: 22 },
              { s: 680, o: 245, c: 68 },
              { s: 520, o: 195, c: 52 },
              { s: 890, o: 340, c: 85 },
              { s: 750, o: 280, c: 72 },
              { s: 1100, o: 420, c: 110 },
              { s: 940, o: 360, c: 92 },
              { s: 1250, o: 480, c: 128 },
            ].map((m, i) => (
              <div key={i} className="flex-1 flex gap-[1px] items-end">
                <div className="flex-1 rounded-t-sm bg-indigo-400" style={{ height: `${(m.s / 1250) * 100}%` }} />
                <div className="flex-1 rounded-t-sm bg-green-400" style={{ height: `${(m.o / 1250) * 100}%` }} />
                <div className="flex-1 rounded-t-sm bg-amber-400" style={{ height: `${(m.c / 1250) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 text-[5px] text-[#001E3C]/40">
            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-indigo-400" />Göndərilib</span>
            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-green-400" />Açılıb</span>
            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-amber-400" />Kliklənib</span>
          </div>
        </div>

        {/* Delivery funnel */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">Çatdırılma hunisi</div>
          <div className="space-y-1.5">
            {[
              { name: "Göndərilib", value: "6,180", pct: 100, color: "#6366f1" },
              { name: "Açılıb", value: "2,101", pct: 34, color: "#22c55e" },
              { name: "Kliklənib", value: "507", pct: 8, color: "#f59e0b" },
              { name: "Bounce", value: "130", pct: 2, color: "#ef4444" },
            ].map(f => (
              <div key={f.name}>
                <div className="flex justify-between text-[6px] mb-0.5">
                  <span className="font-medium text-[#001E3C]/60">{f.name}</span>
                  <span className="text-[#001E3C]/40">{f.value} ({f.pct}%)</span>
                </div>
                <div className="h-1 rounded-full bg-[#F3F4F7] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top campaigns */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">Ən yaxşı kampaniyalar</div>
          <div className="space-y-1">
            {[
              { rank: 1, name: "Yaz Kampaniyası", sent: 2450, open: "42%", click: "12%", type: "Email" },
              { rank: 2, name: "Məhsul Lansman", sent: 1800, open: "38%", click: "9%", type: "Email" },
              { rank: 3, name: "Black Friday", sent: 1930, open: "28%", click: "6%", type: "SMS" },
            ].map(c => (
              <div key={c.rank} className="flex items-center gap-1.5 text-[6px]">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-50 flex items-center justify-center text-[6px] font-bold text-indigo-600 shrink-0">{c.rank}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#001E3C]/80 truncate">{c.name}</div>
                  <div className="flex gap-1.5 text-[5px] text-[#001E3C]/40">
                    <span>{c.sent} gönd.</span>
                    <span className="text-green-600">{c.open} açılma</span>
                    <span className="text-amber-600">{c.click} klik</span>
                  </div>
                </div>
                <span className="text-[5px] bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded shrink-0">{c.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Segments + Journeys + Templates */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Segments */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1"><Target className="w-2.5 h-2.5 text-indigo-500" /><span className="text-[8px] font-semibold text-[#001E3C]/80">Seqmentlər</span></div>
            <span className="text-[5px] bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded">8</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5 mb-1.5">
            {[{ l: "Cəmi", v: "8" }, { l: "Dinamik", v: "5" }, { l: "Kontakt", v: "1,248" }].map(s => (
              <div key={s.l} className="bg-[#F3F4F7] rounded p-1 text-center">
                <div className="text-[8px] font-bold text-[#001E3C]">{s.v}</div>
                <div className="text-[5px] text-[#001E3C]/40">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="space-y-0.5 text-[6px]">
            {[{ n: "VIP Müştərilər", c: 606, d: true }, { n: "Yeni lidlər (30g)", c: 142, d: true }, { n: "E-poçtsuz", c: 98, d: false }].map(s => (
              <div key={s.n} className="flex items-center justify-between">
                <span className="text-[#001E3C]/60 truncate">{s.n}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {s.d && <span className="text-[4px] bg-[#F3F4F7] text-[#001E3C]/60 px-0.5 rounded">din.</span>}
                  <span className="font-semibold text-[#001E3C]">{s.c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Journeys / Automation */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-amber-500" /><span className="text-[8px] font-semibold text-[#001E3C]/80">Avtomatlaşdırma</span></div>
            <span className="text-[5px] bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded">7</span>
          </div>
          <div className="grid grid-cols-3 gap-0.5 mb-1.5">
            {[{ l: "Aktiv", v: "5", c: "text-emerald-600" }, { l: "Giriş", v: "234" }, { l: "Konversiya", v: "59%" }].map(j => (
              <div key={j.l} className="bg-[#F3F4F7] rounded p-1 text-center">
                <div className={cn("text-[8px] font-bold", j.c || "text-[#001E3C]")}>{j.v}</div>
                <div className="text-[5px] text-[#001E3C]/40">{j.l}</div>
              </div>
            ))}
          </div>
          <div className="space-y-0.5 text-[6px]">
            {[
              { n: "Yeni lid onboarding", s: "active", e: 87 },
              { n: "Follow-up ardıcıllığı", s: "active", e: 62 },
              { n: "Win-back kampaniya", s: "paused", e: 34 },
            ].map(j => (
              <div key={j.n} className="flex items-center gap-1">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", j.s === "active" ? "bg-green-500" : "bg-amber-500")} />
                <span className="text-[#001E3C]/60 truncate flex-1">{j.n}</span>
                <span className="text-[#001E3C]/40 shrink-0">{j.e}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1"><FileText className="w-2.5 h-2.5 text-violet-500" /><span className="text-[8px] font-semibold text-[#001E3C]/80">Şablonlar</span></div>
            <span className="text-[5px] bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded">33</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5 mb-1.5">
            {[{ l: "Cəmi", v: "33" }, { l: "Aktiv", v: "28" }].map(t => (
              <div key={t.l} className="bg-[#F3F4F7] rounded p-1 text-center">
                <div className="text-[8px] font-bold text-[#001E3C]">{t.v}</div>
                <div className="text-[5px] text-[#001E3C]/40">{t.l}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <MiniDonut segments={[{ pct: 35, color: "#6366f1" }, { pct: 25, color: "#22c55e" }, { pct: 20, color: "#f59e0b" }, { pct: 12, color: "#ef4444" }, { pct: 8, color: "#8b5cf6" }]} size={36} />
            <div className="space-y-0.5 text-[5px]">
              {[{ l: "Ümumi", c: "#6366f1", v: 12 }, { l: "Xoş gəldin", c: "#22c55e", v: 8 }, { l: "Marketinq", c: "#f59e0b", v: 7 }, { l: "Follow-up", c: "#ef4444", v: 4 }, { l: "Təklif", c: "#8b5cf6", v: 2 }].map(cat => (
                <div key={cat.l} className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: cat.c }} />
                  <span className="text-[#001E3C]/60">{cat.l}</span>
                  <span className="font-semibold text-[#001E3C]/80 ml-auto">{cat.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function InboxPreview() {
  /* Incoming messages from different channels */
  const incomingMsgs = [
    { from: "Kamran Əliyev", ch: "WhatsApp", chIcon: "💬", chColor: "#25d366", text: "Salam, qiymət haqqında məlumat ala bilərəm?", time: "2 dəq", unread: true },
    { from: "Nigar Həsənova", ch: "E-poçt", chIcon: "📧", chColor: "#3b82f6", text: "Təşəkkür edirəm, təklifi nəzərdən keçirəcəyik", time: "15 dəq", unread: true },
    { from: "Rəşad Məmmədov", ch: "Telegram", chIcon: "✈️", chColor: "#229ed9", text: "Demo vaxtı dəyişə bilər?", time: "1 saat", unread: false },
    { from: "Fərid Hüseynov", ch: "SMS", chIcon: "📱", chColor: "#f59e0b", text: "Faktura aldım, təşəkkürlər", time: "3 saat", unread: false },
    { from: "Leyla Əlizadə", ch: "Instagram", chIcon: "📸", chColor: "#e4405f", text: "Məhsul demo istəyirəm", time: "5 saat", unread: false },
  ]
  /* Channel KPIs */
  const channelStats = [
    { name: "E-poçt", icon: "📧", color: "#3b82f6", msgs: 142, unread: 12 },
    { name: "WhatsApp", icon: "💬", color: "#25d366", msgs: 89, unread: 8 },
    { name: "Telegram", icon: "✈️", color: "#229ed9", msgs: 56, unread: 5 },
    { name: "SMS", icon: "📱", color: "#f59e0b", msgs: 34, unread: 3 },
    { name: "Facebook", icon: "👤", color: "#1877f2", msgs: 18, unread: 2 },
    { name: "Instagram", icon: "📸", color: "#e4405f", msgs: 12, unread: 1 },
    { name: "VK", icon: "🔵", color: "#4680c2", msgs: 5, unread: 1 },
  ]
  return (
    <AppShell activeItem="Gələn Qutusu">
      {/* Top: Channel KPI chips — colorful */}
      <div className="flex gap-1 mb-2.5 flex-wrap">
        {channelStats.map(ch => (
          <div key={ch.name} className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-white text-[7px] font-medium" style={{ backgroundColor: ch.color }}>
            <span>{ch.icon}</span>
            <span>{ch.name}</span>
            <span className="bg-white/25 rounded px-1 font-bold">{ch.unread}</span>
          </div>
        ))}
      </div>

      {/* Summary stats bar */}
      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
        {[
          { l: "Cəmi mesaj", v: "356", bg: "bg-blue-500" },
          { l: "Oxunmamış", v: "32", bg: "bg-red-500" },
          { l: "Avtomatik cavab", v: "68%", bg: "bg-violet-500" },
          { l: "Ort. cavab", v: "2.4 dəq", bg: "bg-emerald-500" },
        ].map(s => (
          <div key={s.l} className={cn("rounded-lg p-1.5 text-white text-center", s.bg)}>
            <div className="text-[6px] opacity-80">{s.l}</div>
            <div className="text-[10px] font-bold">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Main: Split view — Incoming channels left + Unified inbox right */}
      <div className="grid grid-cols-2 gap-2">
        {/* LEFT: Incoming from channels */}
        <div className="space-y-1">
          <div className="text-[8px] font-semibold text-[#001E3C]/60 uppercase tracking-wider mb-1">Gələn mesajlar</div>
          {incomingMsgs.map(m => (
            <div key={m.from} className={cn("rounded-lg border px-2 py-1.5 text-[8px]", m.unread ? "bg-white border-l-2" : "bg-[#F3F4F7] border-[#001E3C]/8")} style={m.unread ? { borderLeftColor: m.chColor } : {}}>
              <div className="flex items-center gap-1">
                {m.unread && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: m.chColor }} />}
                <span className="font-semibold text-[#001E3C]/80">{m.from}</span>
                <span className="text-[6px] px-1 py-0.5 rounded-full text-white font-medium ml-auto" style={{ backgroundColor: m.chColor }}>{m.chIcon} {m.ch}</span>
              </div>
              <div className="text-[#001E3C]/60 truncate mt-0.5">{m.text}</div>
              <div className="text-[7px] text-[#001E3C]/40 mt-0.5">{m.time}</div>
            </div>
          ))}
        </div>

        {/* RIGHT: Unified chat view */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/60 uppercase tracking-wider mb-1.5">Vahid söhbət görünüşü</div>
          {/* Contact header */}
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[#001E3C]/8">
            <div className="w-6 h-6 rounded-full bg-green-500 text-[7px] text-white flex items-center justify-center font-bold">KƏ</div>
            <div>
              <div className="text-[9px] font-semibold text-[#001E3C]/80">Kamran Əliyev</div>
              <div className="text-[7px] text-[#001E3C]/40">WhatsApp · Telegram · E-poçt</div>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[7px] text-emerald-500">Online</span>
            </div>
          </div>
          {/* Chat messages from different channels mixed */}
          <div className="space-y-1.5 text-[8px]">
            <div className="flex items-start gap-1">
              <span className="text-[6px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5" style={{ backgroundColor: "#25d366" }}>WA</span>
              <div className="bg-[#F3F4F7] rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/60">Salam, Professional plan haqqında qiymət ala bilərəm?</div>
            </div>
            <div className="flex items-start gap-1">
              <span className="text-[6px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5" style={{ backgroundColor: "#229ed9" }}>TG</span>
              <div className="bg-sky-50 rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/60">Həmçinin Telegram-dan da yazıram</div>
            </div>
            <div className="flex items-start gap-1 justify-end">
              <div className="bg-[#0176D3]/5 rounded-lg rounded-br-sm px-2 py-1 text-[#001E3C]/80">Əlbəttə! Sizə xüsusi təklif hazırlayıram. 📋</div>
            </div>
            <div className="flex items-start gap-1">
              <span className="text-[6px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5" style={{ backgroundColor: "#3b82f6" }}>📧</span>
              <div className="bg-blue-50 rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/60">E-poçtla da təklif göndərin zəhmət olmasa</div>
            </div>
            <div className="flex items-center gap-1 text-[7px] text-[#0176D3]">
              <Bot className="w-2.5 h-2.5" /> Avtomatik cavab hazırlanır...
            </div>
          </div>
          {/* Input */}
          <div className="mt-2 flex items-center gap-1 border-t border-[#001E3C]/8 pt-1.5">
            <div className="flex gap-0.5">
              {["#25d366", "#229ed9", "#3b82f6", "#f59e0b"].map(c => (
                <div key={c} className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex-1 bg-[#F3F4F7] rounded-full px-2 py-0.5 text-[7px] text-[#001E3C]/40">Mesaj yazın...</div>
            <div className="w-4 h-4 rounded-full bg-[#001E3C] flex items-center justify-center"><Send className="w-2 h-2 text-white" /></div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

/* Support renders 3 AppShell screens as overlapping collage — full-width layout with description below */
function SupportScreen1() {
  return (
    <AppShell activeItem="Tiketlər">
      <div className="flex gap-1 mb-2.5">
        {[
          { label: "Cəmi", count: 21, bg: "bg-blue-500", icon: "📋" },
          { label: "Açıq", count: 14, bg: "bg-[#0176D3]", icon: "⏳" },
          { label: "Təyin edilməyib", count: 5, bg: "bg-amber-500", icon: "👤" },
          { label: "SLA pozulub", count: 0, bg: "bg-red-500", icon: "⚠️" },
          { label: "Həll edilmiş", count: 1, bg: "bg-emerald-500", icon: "✅" },
        ].map(s => (
          <div key={s.label} className={cn("flex-1 rounded-lg p-1.5 text-white", s.bg)}>
            <div className="flex items-center justify-between">
              <span className="text-[6px] opacity-80">{s.label}</span>
              <span className="text-[7px]">{s.icon}</span>
            </div>
            <div className="text-sm font-bold">{s.count}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-semibold text-[#001E3C]/80">Tiketlər</span>
          <div className="flex gap-0.5">
            <span className="text-[6px] bg-[#001E3C] text-white px-1.5 py-0.5 rounded">Siyahı</span>
            <span className="text-[6px] bg-[#F3F4F7] text-[#001E3C]/60 px-1.5 py-0.5 rounded">Kanban</span>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { id: "Da Vinci 0021", subj: "Hesab girişi problemi", pr: "high", c: "#ef4444", agent: "Aysəl H.", sla: "6 dəq" },
            { id: "TK-0020", subj: "Faktura düzəlişi lazımdır", pr: "medium", c: "#f59e0b", agent: "Rüstəm Ə.", sla: "8 dəq" },
            { id: "Da Vinci 0019", subj: "API inteqrasiya sualı", pr: "high", c: "#ef4444", agent: "Da Vinci Bot", sla: "—" },
          ].map(t => (
            <div key={t.id} className="rounded border border-[#001E3C]/8 px-1.5 py-1 text-[8px]">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[#001E3C]/40 text-[7px]">{t.id}</span>
                <span className="font-medium text-[#001E3C]/80 flex-1 truncate">{t.subj}</span>
                <span className="text-[6px] px-1 py-0.5 rounded text-white font-medium" style={{ backgroundColor: t.c }}>{t.pr}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[7px] text-[#001E3C]/40">
                <span>👤 {t.agent}</span>
                <span className="ml-auto font-medium" style={{ color: t.sla === "—" ? "#94a3b8" : "#10b981" }}>⏱ {t.sla}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-1 mb-2">
        {[
          { name: "Portal", icon: "🌐", color: "#8b5cf6", tickets: 8 },
          { name: "WhatsApp", icon: "💬", color: "#25d366", tickets: 5 },
          { name: "Telegram", icon: "✈️", color: "#229ed9", tickets: 4 },
          { name: "E-poçt", icon: "📧", color: "#3b82f6", tickets: 3 },
          { name: "Telefon", icon: "📞", color: "#f97316", tickets: 1 },
        ].map(ch => (
          <div key={ch.name} className="flex items-center gap-0.5 rounded-lg px-1.5 py-1 text-white text-[7px] font-medium" style={{ backgroundColor: ch.color }}>
            <span>{ch.icon}</span><span>{ch.name}</span><span className="bg-white/25 rounded px-0.5 font-bold">{ch.tickets}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">📅 Agent Təqvimi</div>
          <div className="space-y-0.5 text-[7px]">
            <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-400" /><span className="text-[#001E3C]/60">10:00 — SLA review</span></div>
            <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-blue-400" /><span className="text-[#001E3C]/60">14:00 — Client call</span></div>
            <div className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-green-400" /><span className="text-[#001E3C]/60">16:00 — Team sync</span></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">📚 Bilik Bazası</div>
          <div className="space-y-0.5 text-[7px] text-[#001E3C]/60">
            <div>📘 Hesab yaratma qaydaları</div>
            <div>📘 API inteqrasiya sənədi</div>
            <div>📘 Faktura şablonları</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">🌐 Müştəri Portalı</div>
          <div className="space-y-0.5 text-[7px] text-[#001E3C]/60">
            <div>✅ Özünə-xidmət tiketlər</div>
            <div>✅ Bilik bazası axtarış</div>
            <div>✅ Canlı söhbət widget</div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function SupportScreen2() {
  return (
    <AppShell activeItem="Tiketlər">
      <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[#001E3C]/8">
        <span className="text-[7px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-medium">high</span>
        <span className="text-[9px] font-semibold text-[#001E3C]/80">Hesab girişi problemi</span>
        <span className="text-[7px] text-[#001E3C]/40 ml-auto">#AI-0021</span>
      </div>
      <div className="space-y-1.5 text-[8px] mb-2">
        <div className="flex items-start gap-1">
          <span className="text-[6px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5 bg-violet-500">DV</span>
          <div className="bg-violet-50 rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/60">Salam! 👋 CRM-iniz işləmir? Mən sizə kömək edəcəm. Konkret hata nədir?</div>
        </div>
        <div className="flex items-start gap-1">
          <span className="text-[6px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5" style={{ backgroundColor: "#25d366" }}>WA</span>
          <div className="bg-[#F3F4F7] rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/60">Chrome istifadə edirəm, login olmaq olmur</div>
        </div>
        <div className="flex items-start gap-1">
          <span className="text-[6px] px-1 py-0.5 rounded text-white shrink-0 mt-0.5 bg-violet-500">DV</span>
          <div className="bg-violet-50 rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/60">Chrome keşi təmizləyin, Caps Lock yoxlayın. Problemdir? Operatora bağlayım.</div>
        </div>
        <div className="flex items-center gap-1 text-[7px] text-[#0176D3] bg-[#0176D3]/5 rounded px-2 py-1">
          <Bot className="w-2.5 h-2.5" /> Eskalasiya → Texniki komanda · SLA: 4 saat
        </div>
      </div>
      <div className="flex gap-1 mb-2 flex-wrap">
        {[
          { l: "Cavab ver", c: "bg-[#0176D3]" }, { l: "Daxili qeyd", c: "bg-[#001E3C]/10 !text-[#001E3C]/60" },
          { l: "Avto Cavab", c: "bg-emerald-100 !text-emerald-700" }, { l: "Xülasə", c: "bg-blue-100 !text-blue-700" },
        ].map(b => (
          <span key={b.l} className={cn("text-[6px] px-1.5 py-0.5 rounded text-white font-medium", b.c)}>{b.l}</span>
        ))}
      </div>
      <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-2 mb-2">
        <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700 mb-1"><Bot className="w-3 h-3" /> Da Vinci Xülasə</div>
        <div className="text-[7px] text-emerald-600 leading-relaxed">
          <strong>Problem:</strong> Müştəri Chrome-da login ola bilmir. <strong>Status:</strong> Həll olunub — Da Vinci ətraflı təşxis etdi, texniki komandaya eskalasiya, 4 saat SLA daxilində cavab verildi.
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">⏱ SLA İzləmə</div>
          <div className="space-y-1 text-[7px]">
            <div className="flex justify-between"><span className="text-[#001E3C]/60">İlk cavab</span><span className="font-medium text-emerald-600">14:37 ✓</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Həll müddəti</span><span className="font-medium text-emerald-600">2 saat ✓</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">SLA statusu</span><span className="font-bold text-emerald-600">Vaxtında</span></div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">⭐ CSAT</div>
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
            <span className="text-[8px] font-bold text-[#001E3C]/80 ml-1">5.0</span>
          </div>
        </div>
      </div>
      <div className="bg-violet-50 rounded-lg border border-violet-200 p-2">
        <div className="text-[8px] font-semibold text-violet-700 mb-1">🤖 Da Vinci Asistent</div>
        <div className="grid grid-cols-2 gap-0.5 text-[6px] text-violet-600">
          <div>✓ Auto-cavab</div><div>✓ Xülasə</div>
          <div>✓ Operator təyini</div><div>✓ SLA xatırlatma</div>
          <div>✓ Eskalasiya</div><div>✓ Bilik bazası oxuma</div>
        </div>
      </div>
    </AppShell>
  )
}

function SupportScreen3() {
  return (
    <AppShell activeItem="Hesabatlar">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[{ l: "Açıq tiketlər", v: "14", bg: "bg-blue-500" }, { l: "Mənim", v: "3", bg: "bg-violet-500" }, { l: "Ort. cavab", v: "2h 15m", bg: "bg-[#0176D3]" }, { l: "CSAT", v: "100%", bg: "bg-amber-400" }].map(k => (
          <div key={k.l} className={cn("rounded-lg p-1.5 text-white text-center", k.bg)}>
            <div className="text-[6px] opacity-80">{k.l}</div>
            <div className="text-[10px] font-bold">{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {/* Donut Charts */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[7px] font-semibold text-[#001E3C]/60 mb-1">Həll olunmuş</div>
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 shrink-0">
              <svg viewBox="0 0 36 36" className="w-10 h-10">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E8E9ED" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="29 88" strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-blue-600">33%</div>
            </div>
            <div className="text-[6px] text-[#001E3C]/40 leading-relaxed">47 / 142<br />tiket</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[7px] font-semibold text-[#001E3C]/60 mb-1">SLA uyğunluq</div>
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 shrink-0">
              <svg viewBox="0 0 36 36" className="w-10 h-10">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E8E9ED" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="75 88" strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-emerald-600">85%</div>
            </div>
            <div className="text-[6px] text-[#001E3C]/40 leading-relaxed">121 / 142<br />vaxtında</div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[7px] font-semibold text-[#001E3C]/60 mb-1">Müştəri razılığı</div>
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 shrink-0">
              <svg viewBox="0 0 36 36" className="w-10 h-10">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#E8E9ED" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f97316" strokeWidth="3" strokeDasharray="88 88" strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-[#0176D3]">100%</div>
            </div>
            <div className="text-[6px] text-[#001E3C]/40 leading-relaxed">⭐ 4.8/5.0<br />orta bal</div>
          </div>
        </div>
      </div>

      {/* Channel sources */}
      <div className="flex flex-wrap gap-0.5 mb-2">
        {[{ n: "Portal", c: "#8b5cf6", v: 48 }, { n: "WhatsApp", c: "#25d366", v: 35 }, { n: "Telegram", c: "#229ed9", v: 24 }, { n: "E-poçt", c: "#3b82f6", v: 21 }, { n: "Telefon", c: "#f97316", v: 14 }].map(ch => (
          <span key={ch.n} className="text-[6px] text-white px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: ch.c }}>{ch.n} {ch.v}</span>
        ))}
      </div>

      {/* Recent tickets table */}
      <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2 mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[8px] font-semibold text-[#001E3C]/80">Son tiketlər</div>
          <div className="text-[6px] text-blue-500 font-medium">Hamısını gör →</div>
        </div>
        <div className="space-y-1">
          {[
            { id: "#1847", s: "Açıq", sc: "bg-blue-100 text-blue-700", t: "Login problemi", ag: "Nigar M.", ch: "WA", p: "Yüksək", pc: "text-red-500" },
            { id: "#1846", s: "Gözləmədə", sc: "bg-amber-100 text-amber-700", t: "Faktura düzəlişi", ag: "Kamran H.", ch: "Portal", p: "Orta", pc: "text-amber-500" },
            { id: "#1845", s: "Həll edildi", sc: "bg-emerald-100 text-emerald-700", t: "API inteqrasiya", ag: "Da Vinci Bot", ch: "E-poçt", p: "Aşağı", pc: "text-[#001E3C]/40" },
            { id: "#1844", s: "Açıq", sc: "bg-blue-100 text-blue-700", t: "Hesab bloku", ag: "Nigar M.", ch: "TG", p: "Kritik", pc: "text-red-600" },
          ].map(t => (
            <div key={t.id} className="flex items-center gap-1 text-[6px]">
              <span className="text-[#001E3C]/40 w-6 shrink-0 font-mono">{t.id}</span>
              <span className={cn("px-1 py-0.5 rounded text-[5px] font-medium shrink-0", t.sc)}>{t.s}</span>
              <span className="text-[#001E3C]/80 truncate flex-1">{t.t}</span>
              <span className="text-[#001E3C]/40 shrink-0">{t.ag}</span>
              <span className={cn("text-[5px] font-bold shrink-0", t.pc)}>{t.p}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {/* Agent Calendar */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">📅 Agent Təqvimi</div>
          <div className="space-y-0.5 text-[7px]">
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-[#001E3C]/60">09:00 — SLA review</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /><span className="text-[#001E3C]/60">11:00 — Tiket audit</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-[#001E3C]/60">14:00 — Client call</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-[#001E3C]/60">16:00 — Team sync</span></div>
          </div>
        </div>

        {/* Da Vinci performance */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">🤖 Da Vinci Performans</div>
          <div className="space-y-1 text-[7px]">
            <div className="flex items-center justify-between"><span className="text-[#001E3C]/60">Auto-cavab</span><span className="font-semibold text-emerald-600">42%</span></div>
            <div className="flex items-center justify-between"><span className="text-[#001E3C]/60">Xülasə dəqiqliyi</span><span className="font-semibold text-blue-600">94%</span></div>
            <div className="flex items-center justify-between"><span className="text-[#001E3C]/60">Eskalasiya</span><span className="font-semibold text-amber-600">8%</span></div>
            <div className="flex items-center justify-between"><span className="text-[#001E3C]/60">Ort. həll vaxtı</span><span className="font-semibold text-violet-600">1.4h</span></div>
          </div>
        </div>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-3 gap-1">
        {[{ l: "SLA", v: "94%", c: "#10b981" }, { l: "CSAT", v: "4.7", c: "#f59e0b" }, { l: "Ort. cavab", v: "2.1h", c: "#3b82f6" }].map(k => (
          <div key={k.l} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5 text-center">
            <div className="text-[10px] font-bold" style={{ color: k.c }}>{k.v}</div>
            <div className="text-[6px] text-[#001E3C]/40">{k.l}</div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}

/* ── Sliding Panels for Support (same effect as Hero) ── */
const SUPPORT_POSITIONS = {
  left:   { left: "-2%",  width: "42%", zIndex: 1 },
  center: { left: "17%",  width: "66%", zIndex: 3 },
  right:  { left: "60%",  width: "42%", zIndex: 1 },
} as const
const SUPPORT_HEIGHT = 640

type SupportSlot = "left" | "center" | "right"

const SUPPORT_PANELS = [
  { id: "service-desk", Component: SupportScreen1 },
  { id: "ai-ticket",    Component: SupportScreen2 },
  { id: "agent-desktop", Component: SupportScreen3 },
]

function SupportAutoScaledPanel({ children, baseWidth = 900 }: { children: React.ReactNode; baseWidth?: number }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<number | null>(null)

  useLayoutEffect(() => {
    const el = outerRef.current
    if (!el) return
    const measure = () => {
      const w = el.offsetWidth
      if (w > 0) setZoom(w / baseWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth])

  return (
    <div
      ref={outerRef}
      style={{
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 25px 60px -10px rgba(0,0,0,0.2), 0 12px 28px -6px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ width: baseWidth, zoom: zoom ?? 0.5, visibility: zoom !== null ? "visible" : "hidden" }}>
        {children}
      </div>
    </div>
  )
}

function SupportSlidingPanels() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const scrollLockRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [wrapHeight, setWrapHeight] = useState(620)
  const [slots, setSlots] = useState<SupportSlot[]>(["left", "center", "right"])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    Object.assign(wrap.style, { position: "relative", display: "block", overflowAnchor: "none" })
    setReady(true)
    // Measure tallest panel after render
    const timer = setTimeout(() => {
      let maxH = 0
      panelRefs.forEach(ref => {
        if (ref.current) maxH = Math.max(maxH, ref.current.offsetHeight)
      })
      if (maxH > 0) setWrapHeight(maxH)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  useLayoutEffect(() => {
    panelRefs.forEach((ref, i) => {
      const el = ref.current
      if (!el) return
      const pos = SUPPORT_POSITIONS[slots[i]]
      const isCenter = slots[i] === "center"
      Object.assign(el.style, {
        position: "absolute",
        bottom: "0",
        transition: "left 0.5s ease, width 0.5s ease, height 0.5s ease",
        left: pos.left,
        width: pos.width,
        zIndex: String(pos.zIndex),
        cursor: isCenter ? "default" : "pointer",
        pointerEvents: isCenter ? "none" : "auto",
      })
    })
    /* Restore scroll position after layout update */
    if (scrollLockRef.current !== null) {
      window.scrollTo(0, scrollLockRef.current)
      scrollLockRef.current = null
    }
  }, [slots])

  const handleClick = (panelIndex: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (slots[panelIndex] === "center") return
    /* Lock scroll — apply styles immediately to all panels before React re-render */
    const centerIdx = slots.indexOf("center")
    const clickedSlot = slots[panelIndex]
    const nextSlots = [...slots] as SupportSlot[]
    nextSlots[panelIndex] = "center"
    nextSlots[centerIdx] = clickedSlot
    scrollLockRef.current = window.scrollY
    setSlots(nextSlots)
  }

  return (
    <div
      ref={wrapRef}
      className="hidden lg:block"
      style={{ opacity: ready ? 1 : 0, transition: "opacity 0.3s", height: wrapHeight }}
    >
      {SUPPORT_PANELS.map((panel, i) => (
        <div key={panel.id} ref={panelRefs[i]} onClick={(e) => handleClick(i, e)}>
          <SupportAutoScaledPanel baseWidth={900}>
            <panel.Component />
          </SupportAutoScaledPanel>
        </div>
      ))}
    </div>
  )
}

function SupportPreview() {
  return null /* rendered via fullWidth layout */
}

function EventsPreview() {
  const statuses = [
    { label: "Planlaşdırılıb", count: 3, bg: "bg-blue-500", icon: "📋" },
    { label: "Qeydiyyat açıq", count: 2, bg: "bg-violet-500", icon: "📝" },
    { label: "Davam edir", count: 1, bg: "bg-amber-500", icon: "🔴" },
    { label: "Tamamlandı", count: 7, bg: "bg-emerald-500", icon: "✅" },
    { label: "Ləğv edildi", count: 1, bg: "bg-red-500", icon: "❌" },
  ]
  const events = [
    { id: "EV-014", name: "CRM Demo Day 2026", type: "Konfrans", typeIcon: "🎤", date: "12 Apr", loc: "Hilton Bakı", online: false, participants: 120, max: 150, budget: "₼8,500", status: "Qeydiyyat açıq", statusColor: "#8b5cf6" },
    { id: "EV-013", name: "Da Vinci in Sales — Vebinar", type: "Vebinar", typeIcon: "🎥", date: "18 Apr", loc: "Zoom", online: true, participants: 87, max: 200, budget: "₼800", status: "Planlaşdırılıb", statusColor: "#3b82f6" },
    { id: "EV-012", name: "LeadDrive Workshop", type: "Seminar", typeIcon: "🔧", date: "5 Mar", loc: "Ofis", online: false, participants: 24, max: 30, budget: "₼2,200", status: "Tamamlandı", statusColor: "#10b981" },
    { id: "EV-011", name: "Partner Networking", type: "Görüş", typeIcon: "☕", date: "28 Feb", loc: "Coworking", online: false, participants: 45, max: 50, budget: "₼3,100", status: "Tamamlandı", statusColor: "#10b981" },
  ]
  const participants = [
    { name: "Kamran Əliyev", role: "Speaker", roleColor: "#f59e0b", status: "Təsdiqləndi", company: "TechVision" },
    { name: "Aysəl Hüseynova", role: "Organizer", roleColor: "#8b5cf6", status: "Təsdiqləndi", company: "LeadDrive" },
    { name: "Rüstəm Məmmədov", role: "VIP", roleColor: "#ef4444", status: "Gözləyir", company: "BankTech" },
    { name: "Nigar Quliyeva", role: "Attendee", roleColor: "#3b82f6", status: "Qeydiyyatdan keçdi", company: "AzərLogistik" },
    { name: "Tural Həsənov", role: "Sponsor", roleColor: "#10b981", status: "Təsdiqləndi", company: "DataAxın" },
  ]
  return (
    <AppShell activeItem="Tədbirlər">
      {/* Status cards */}
      <div className="flex gap-1 mb-2.5">
        {statuses.map(s => (
          <div key={s.label} className={cn("flex-1 rounded-lg p-1.5 text-white", s.bg)}>
            <div className="flex items-center justify-between">
              <span className="text-[6px] opacity-80">{s.label}</span>
              <span className="text-[7px]">{s.icon}</span>
            </div>
            <div className="text-sm font-bold">{s.count}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        {/* LEFT: Event list */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-semibold text-[#001E3C]/80">Tədbirlər</span>
            <span className="text-[6px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">+ Yeni</span>
          </div>
          <div className="space-y-1">
            {events.map(e => (
              <div key={e.id} className="rounded border border-[#001E3C]/8 px-1.5 py-1 text-[8px]">
                <div className="flex items-center gap-1">
                  <span className="text-[7px]">{e.typeIcon}</span>
                  <span className="font-medium text-[#001E3C]/80 flex-1 truncate">{e.name}</span>
                  <span className="text-[6px] px-1 py-0.5 rounded text-white font-medium" style={{ backgroundColor: e.statusColor }}>{e.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[7px] text-[#001E3C]/40">
                  <span>📅 {e.date}</span>
                  <span>{e.online ? "🌐" : "📍"} {e.loc}</span>
                  <span className="ml-auto">👥 {e.participants}/{e.max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Participant management + invite tracking */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-semibold text-[#001E3C]/80">İştirakçılar — CRM Demo Day</span>
            <span className="text-[6px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">120/150</span>
          </div>
          <div className="space-y-0.5">
            {participants.map(p => (
              <div key={p.name} className="flex items-center gap-1 text-[8px] bg-[#F3F4F7] rounded px-1.5 py-1">
                <div className="w-4 h-4 rounded-full bg-[#001E3C]/10 flex items-center justify-center text-[5px] font-bold text-[#001E3C]/60 shrink-0">
                  {p.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#001E3C]/80 truncate">{p.name}</div>
                  <div className="text-[6px] text-[#001E3C]/40">{p.company}</div>
                </div>
                <span className="text-[6px] px-1 py-0.5 rounded text-white font-medium shrink-0" style={{ backgroundColor: p.roleColor }}>{p.role}</span>
              </div>
            ))}
          </div>
          {/* Invite status summary */}
          <div className="flex gap-1 mt-1.5 pt-1 border-t border-[#001E3C]/8">
            {[
              { l: "Göndərildi", v: "98", c: "#3b82f6" },
              { l: "Açıldı", v: "74", c: "#10b981" },
              { l: "Təsdiqləndi", v: "56", c: "#8b5cf6" },
              { l: "Rədd etdi", v: "8", c: "#ef4444" },
            ].map(s => (
              <div key={s.l} className="flex-1 text-center rounded px-1 py-0.5" style={{ backgroundColor: `${s.c}10` }}>
                <div className="text-[8px] font-bold" style={{ color: s.c }}>{s.v}</div>
                <div className="text-[5px] text-[#001E3C]/40">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Budget/ROI + Calendar + Registration */}
      <div className="grid grid-cols-3 gap-2">
        {/* Budget & ROI */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">💰 Büdcə & ROI</div>
          <div className="space-y-1 text-[7px]">
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Büdcə</span><span className="font-bold text-[#001E3C]/80">₼8,500</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Xərcləndi</span><span className="font-bold text-[#0176D3]">₼6,200</span></div>
            <div className="bg-[#F3F4F7] rounded-full h-1.5 my-0.5"><div className="bg-[#0176D3] h-1.5 rounded-full" style={{ width: "73%" }} /></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Gəlir</span><span className="font-bold text-emerald-600">₼22,400</span></div>
            <div className="flex justify-between border-t border-[#001E3C]/8 pt-1"><span className="text-[#001E3C]/60">ROI</span><span className="font-bold text-emerald-600">+261%</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Hər iştirakçı</span><span className="font-medium text-[#001E3C]/60">₼52</span></div>
          </div>
        </div>

        {/* Calendar mini */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">📅 Tədbir Təqvimi</div>
          <div className="space-y-1 text-[7px]">
            <div className="flex items-center gap-1 bg-violet-50 rounded px-1.5 py-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" /><div><div className="font-medium text-violet-700">12 Apr — CRM Demo Day</div><div className="text-[6px] text-[#001E3C]/40">Hilton Bakı · 120 nəfər</div></div></div>
            <div className="flex items-center gap-1 bg-blue-50 rounded px-1.5 py-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /><div><div className="font-medium text-blue-700">18 Apr — Da Vinci Vebinar</div><div className="text-[6px] text-[#001E3C]/40">Online · 87 nəfər</div></div></div>
            <div className="flex items-center gap-1 bg-amber-50 rounded px-1.5 py-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /><div><div className="font-medium text-amber-700">25 Apr — Sərgi</div><div className="text-[6px] text-[#001E3C]/40">Expo Center · 200 nəfər</div></div></div>
          </div>
        </div>

        {/* Self-registration & ICS */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">🌐 Qeydiyyat Portalı</div>
          <div className="space-y-1 text-[7px]">
            <div className="bg-emerald-50 border border-emerald-200 rounded px-1.5 py-1">
              <div className="text-[6px] text-emerald-600 font-medium">Açıq link</div>
              <div className="text-[7px] text-emerald-700 font-mono truncate">{(process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org").replace(/^https?:\/\//, "")}/r/ev014</div>
            </div>
            <div className="flex items-center gap-1 text-[7px] text-[#001E3C]/60">
              <span className="text-[6px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">📧 Dəvət</span>
              <span className="text-[6px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">📅 ICS</span>
              <span className="text-[6px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded">✅ Təsdiq</span>
            </div>
            <div className="border-t border-[#001E3C]/8 pt-1 space-y-0.5">
              <div className="text-[6px] font-semibold text-[#001E3C]/60">Qeydiyyat dinamikası</div>
              <MiniLineChart data={[5, 12, 18, 35, 48, 62, 78, 95, 105, 112, 118, 120]} color="#8b5cf6" width={120} height={28} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function FinancePreview() {
  return (
    <AppShell activeItem="Hesabatlar">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-bold text-[#001E3C]">Büdcələşdirmə</div>
          <div className="text-[7px] text-[#001E3C]/40">Büdcə planlaşdırma, proqnoz və nəzarət</div>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center border border-[#001E3C]/10 rounded px-1.5 py-0.5 text-[6px] text-[#001E3C]/60 gap-0.5">
            Q1 Budget 2026 <ChevronDown className="w-2 h-2" />
          </div>
          <span className="text-[6px] bg-[#001E3C] text-white px-2 py-0.5 rounded font-medium">+ Plan yarat</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-2 border-b border-[#001E3C]/10 pb-1">
        <span className="text-[7px] font-semibold text-[#001E3C] border-b border-[#001E3C] pb-0.5 flex items-center gap-0.5"><BarChart3 className="w-2 h-2" /> Analitika</span>
        <span className="text-[7px] text-[#001E3C]/40">Siyahı</span>
      </div>

      {/* Row 1: 5 KPI cards matching real budgeting page */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {/* Gəlir fakt */}
        <div className="bg-white rounded-lg border-2 border-emerald-200 p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
            <span className="text-[5px] px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">87%</span>
          </div>
          <div className="text-[10px] font-bold text-emerald-700">3,582,646 ₼</div>
          <div className="text-[6px] text-[#001E3C]/60 mt-0.5">Gəlir (fakt)</div>
          <div className="text-[5px] text-[#001E3C]/40">plan: 4,111,065 ₼</div>
        </div>
        {/* Xərclər fakt */}
        <div className="bg-white rounded-lg border-2 border-red-200 p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px]">〰️</span>
            <span className="text-[5px] px-1 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">61%</span>
          </div>
          <div className="text-[10px] font-bold text-red-600">3,880,529 ₼</div>
          <div className="text-[6px] text-[#001E3C]/60 mt-0.5">Xərclər (fakt)</div>
          <div className="text-[5px] text-[#001E3C]/40">plan: 6,408,996 ₼</div>
        </div>
        {/* Marja fakt */}
        <div className="bg-white rounded-lg border-2 border-[#0176D3]/20 p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <DollarSign className="w-2.5 h-2.5 text-[#0176D3]" />
            <ArrowUpRight className="w-2 h-2 text-red-400" />
          </div>
          <div className="text-[10px] font-bold text-[#0176D3]">-297,883 ₼</div>
          <div className="text-[6px] text-[#001E3C]/60 mt-0.5">Marja (fakt)</div>
          <div className="text-[5px] text-[#001E3C]/40">plan: -2,297,931 ₼</div>
        </div>
        {/* Büdcə icrası */}
        <div className="bg-white rounded-lg border-2 border-[#001E3C]/10 p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px]">⊙</span>
            <span className="text-[5px] font-bold text-[#001E3C]/80">112%</span>
          </div>
          <div className="bg-[#001E3C]/60 rounded-full h-1 mt-1"><div className="h-1 rounded-full bg-emerald-500" style={{ width: "100%" }} /></div>
          <div className="text-[6px] text-[#001E3C]/60 mt-1">Büdcə icrası</div>
          <div className="text-[5px] text-[#001E3C]/40">3 plan</div>
        </div>
        {/* Xalis pul axını */}
        <div className="bg-white rounded-lg border-2 border-cyan-200 p-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px]">📊</span>
            <ArrowUpRight className="w-2 h-2 text-emerald-500" />
          </div>
          <div className="text-[10px] font-bold text-cyan-700">177,379 ₼</div>
          <div className="text-[6px] text-[#001E3C]/60 mt-0.5">Xalis pul axını</div>
          <div className="text-[5px] text-[#001E3C]/40">giriş: 4.3M / çıxış: 4.2M</div>
        </div>
      </div>

      {/* Row 2: Gəlir trendi + Xərc trendi — grouped bars (plan + fakt) like real page */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Gəlir trendi</span>
          </div>
          <svg viewBox="0 0 180 40" className="w-full" style={{ height: 40 }}>
            {[
              { p: 85, f: 78 },{ p: 82, f: 72 },{ p: 85, f: 80 },{ p: 88, f: 65 },
              { p: 85, f: 60 },{ p: 88, f: 52 },{ p: 85, f: 44 },{ p: 82, f: 35 },
              { p: 85, f: 22 },{ p: 88, f: 0 },{ p: 85, f: 0 },{ p: 82, f: 0 },
            ].map((m, i) => {
              const x = 2 + i * 15
              return (
                <g key={i}>
                  <rect x={x} y={38 - m.p * 0.38} width="5" height={m.p * 0.38} rx="1" fill="#c4b5fd" opacity="0.7" />
                  <rect x={x + 6} y={38 - m.f * 0.38} width="5" height={Math.max(m.f * 0.38, 0)} rx="1" fill="#34d399" />
                </g>
              )
            })}
          </svg>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-2.5 h-2.5 text-red-400" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Xərc trendi</span>
          </div>
          <svg viewBox="0 0 180 40" className="w-full" style={{ height: 40 }}>
            {[
              { p: 65, f: 60 },{ p: 68, f: 62 },{ p: 65, f: 78 },{ p: 70, f: 88 },
              { p: 68, f: 82 },{ p: 70, f: 72 },{ p: 65, f: 62 },{ p: 68, f: 48 },
              { p: 65, f: 25 },{ p: 70, f: 0 },{ p: 68, f: 0 },{ p: 65, f: 0 },
            ].map((m, i) => {
              const x = 2 + i * 15
              return (
                <g key={i}>
                  <rect x={x} y={38 - m.p * 0.38} width="5" height={m.p * 0.38} rx="1" fill="#c4b5fd" opacity="0.7" />
                  <rect x={x + 6} y={38 - m.f * 0.38} width="5" height={Math.max(m.f * 0.38, 0)} rx="1" fill="#fb923c" />
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Row 3: Pul axını + Plan statusları — matching real page */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <div className="col-span-2 bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="w-2.5 h-2.5 text-cyan-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Pul axını (aylıq)</span>
          </div>
          <svg viewBox="0 0 200 42" className="w-full" style={{ height: 42 }}>
            {[
              { g: 90, x: 65 },{ g: 68, x: 65 },{ g: 68, x: 65 },{ g: 68, x: 65 },
              { g: 75, x: 65 },{ g: 68, x: 68 },{ g: 65, x: 65 },{ g: 65, x: 65 },
              { g: 68, x: 65 },{ g: 5, x: 4 },{ g: 4, x: 3 },{ g: 5, x: 4 },
            ].map((m, i) => {
              const bx = 2 + i * 16.5
              return (
                <g key={i}>
                  <rect x={bx} y={40 - m.g * 0.4} width="6" height={m.g * 0.4} rx="0.8" fill="#4ade80" />
                  <rect x={bx + 7} y={40 - m.x * 0.4} width="6" height={m.x * 0.4} rx="0.8" fill="#f87171" />
                </g>
              )
            })}
            <polyline
              points="8,18 24,20 41,20 57,19 74,18 90,17 107,16 123,17 140,28 156,36 173,38 189,39"
              fill="none" stroke="#6366f1" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <div className="flex gap-3 text-[5px] text-[#001E3C]/40 mt-0.5">
            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-emerald-400" />Gəlir</span>
            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-red-400" />Xərc</span>
            <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-indigo-500" />Xalis</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-2">Plan statusları</div>
          <div className="flex items-center justify-center mb-1">
            <MiniDonut segments={[{ pct: 67, color: "#94a3b8" }, { pct: 33, color: "#f59e0b" }]} size={44} />
          </div>
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between text-[6px]">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#001E3C]/30" />Qaralama</span>
              <span className="font-semibold">2</span>
            </div>
            <div className="flex items-center justify-between text-[6px]">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Gözləmədə</span>
              <span className="font-semibold">1</span>
            </div>
          </div>
          <div className="border-t border-[#001E3C]/8 pt-1 text-center">
            <div className="text-[14px] font-bold text-blue-600">3</div>
            <div className="text-[6px] text-[#001E3C]/40">Ümumi plan</div>
          </div>
        </div>
      </div>

      {/* Row 4: Gəlir Plan vs Fakt + Xərc Plan vs Fakt + Büdcə aşımları */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
            <span className="text-[7px] font-semibold text-[#001E3C]/80">Gəlir: Plan vs Fakt</span>
          </div>
          <div className="space-y-1 text-[6px]">
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Plan</span><span className="font-semibold text-[#001E3C]">$4,111,065</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Fakt</span><span className="font-bold text-emerald-600">$3,582,646</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Proqnoz</span><span className="font-semibold text-[#001E3C]">$4,111,065</span></div>
          </div>
          <div className="bg-[#F3F4F7] rounded-full h-1.5 mt-1.5"><div className="h-1.5 rounded-full bg-blue-600" style={{ width: "87%" }} /></div>
          <div className="text-center text-[5px] text-[#001E3C]/40 mt-0.5">87% icra</div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp className="w-2.5 h-2.5 text-red-400" />
            <span className="text-[7px] font-semibold text-[#001E3C]/80">Xərc: Plan vs Fakt</span>
          </div>
          <div className="space-y-1 text-[6px]">
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Plan</span><span className="font-semibold text-[#001E3C]">$2,528,467</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Fakt</span><span className="font-bold text-red-500">$0</span></div>
            <div className="flex justify-between"><span className="text-[#001E3C]/60">Proqnoz</span><span className="font-semibold text-[#001E3C]">$2,528,467</span></div>
          </div>
          <div className="bg-[#F3F4F7] rounded-full h-1.5 mt-1.5" />
          <div className="text-center text-[5px] text-[#001E3C]/40 mt-0.5">0% istifadə</div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[7px]">⚠️</span>
            <span className="text-[7px] font-semibold text-[#001E3C]/80">Büdcə aşımları</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between bg-[#F3F4F7] rounded p-1">
              <div><div className="text-[6px] font-medium text-[#001E3C]/80">Cloud</div><div className="text-[5px] text-[#001E3C]/40">$103K / $86K</div></div>
              <span className="text-[5px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">+19%</span>
            </div>
            <div className="flex items-center justify-between bg-[#F3F4F7] rounded p-1">
              <div><div className="text-[6px] font-medium text-[#001E3C]/80">Payroll — GRC</div><div className="text-[5px] text-[#001E3C]/40">$160K / $160K</div></div>
              <span className="text-[5px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">+0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Summary cards */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { icon: "📋", v: "3", l: "Büdcə planları" },
          { icon: "📊", v: "3", l: "Xərc növləri" },
          { icon: "🏢", v: "9", l: "Departamentlər" },
          { icon: "💰", v: "9", l: "Pul axını ayları" },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5 text-center">
            <div className="text-[7px] mb-0.5">{s.icon}</div>
            <div className="text-[11px] font-bold text-[#001E3C]">{s.v}</div>
            <div className="text-[5px] text-[#001E3C]/40">{s.l}</div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}

function SalesPipelinePreview() {
  const t = useTranslations("marketing.moduleData")
  return (
    <AppShell activeItem="Sövdələşmələr">
      {/* Top KPI row */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {[
          { l: "HUNİ DƏYƏRİ", v: "₼285.5K", sub: "↗ +22%", sc: "text-emerald-500", icon: "💰" },
          { l: "QAZANILDI", v: "₼98.7K", sub: "↗ 4 sövdə", sc: "text-emerald-500", icon: "✅" },
          { l: "KONVERSİYA", v: "32.4%", sub: "↗ +5.1%", sc: "text-emerald-500", icon: "📈" },
          { l: "ORT. DÖVRÜ", v: "24 gün", sub: "↗ -3 gün", sc: "text-emerald-500", icon: "⏱" },
          { l: "ORT. DƏYƏR", v: "₼11.0K", sub: "↗ +8%", sc: "text-emerald-500", icon: "💎" },
          { l: "DA VİNCİ PROQNOZ", v: "₼142K", sub: "Bu rüb", sc: "text-blue-500", icon: "🤖" },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
            <div className="text-[5px] font-semibold text-[#001E3C]/40 tracking-wider">{k.l}</div>
            <div className="text-[10px] font-bold text-[#001E3C] mt-0.5">{k.v}</div>
            <div className={cn("text-[5px] font-medium mt-0.5", k.sc)}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {/* Pipeline Kanban */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">{t("pipelineKanbanLabel")}</div>
            <div className="text-[6px] text-[#001E3C]/40">{t("dealsCount")}</div>
          </div>
          <div className="flex items-center gap-0.5 mb-1 text-[5px]">
            {[{ l: "Lid", c: "#3b82f6" }, { l: "Kvalifika...", c: "#8b5cf6" }, { l: "Təklif", c: "#f59e0b" }, { l: "Danışıqlar", c: "#ef4444" }, { l: "Qazanıldı", c: "#10b981" }].map(s => (
              <div key={s.l} className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.c }} /><span className="text-[#001E3C]/60">{s.l}</span></div>
            ))}
          </div>
          <div className="flex gap-0.5 mb-1.5">
            {[
              { v: "₼24.5K", h: 28, c: "#3b82f6", n: "8 sövdə" },
              { v: "₼42.3K", h: 38, c: "#8b5cf6", n: "6 sövdə" },
              { v: "₼68.2K", h: 52, c: "#f59e0b", n: "5 sövdə" },
              { v: "₼52.0K", h: 44, c: "#ef4444", n: "3 sövdə" },
              { v: "₼98.7K", h: 60, c: "#10b981", n: "4 sövdə" },
            ].map(b => (
              <div key={b.v} className="flex-1 text-center">
                <div className="text-[5px] font-bold text-[#001E3C]/60 mb-0.5">{b.v}</div>
                <div className="rounded-sm mx-auto" style={{ backgroundColor: b.c, height: b.h, opacity: 0.8 }} />
                <div className="text-[5px] text-[#001E3C]/40 mt-0.5">{b.n}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gəlir Proqnozu */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Gəlir Proqnozu</div>
            <div className="text-[6px] text-emerald-500 font-medium">↑ 32%</div>
          </div>
          <svg viewBox="0 0 160 50" className="w-full h-10 mb-1">
            <polyline points="0,40 15,38 30,35 45,32 60,30 75,25 90,22 105,18 120,15 135,12 150,8 160,5" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            <polyline points="0,40 15,38 30,35 45,32 60,30 75,25 90,22 105,18 120,15 135,12 150,8 160,5" fill="url(#areaGrad)" stroke="none" />
            <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>
          </svg>
          <div className="flex items-center justify-between text-[5px] text-[#001E3C]/40">
            <span>Y F M A M İ İ A S O N D</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[6px] text-[#001E3C]/60">Çatdırılacaq (proqnoz)</span>
            <span className="text-[8px] font-bold text-emerald-600">₼420K</span>
          </div>
        </div>

        {/* Qazanma / İtirmə */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Qazanma / İtirmə</div>
            <div className="text-[6px] text-blue-500">Bu rüb</div>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="relative w-10 h-10 shrink-0">
              <svg viewBox="0 0 36 36" className="w-10 h-10">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#d1d5db" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="57 88" strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-emerald-600">65%</div>
            </div>
            <div className="space-y-0.5 text-[6px] flex-1">
              <div className="flex items-center justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Qazanıldı</span><span className="font-semibold">12 <span className="text-emerald-500">65%</span></span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />İtirildi</span><span className="font-semibold">4 <span className="text-red-500">20%</span></span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Davam edir</span><span className="font-semibold">10 <span className="text-[#001E3C]/40">—</span></span></div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[6px] border-t border-[#001E3C]/5 pt-1">
            <span className="text-[#001E3C]/40">İtirmə səbəbi #1</span>
            <span className="text-amber-600 font-medium">Qiymət (45%)</span>
          </div>
        </div>
      </div>

      {/* Bottom 3-column grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {/* Kontakt Məşğulluğu */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Kontakt Məşğulluğu</div>
            <span className="text-[6px]">💬</span>
          </div>
          <div className="grid grid-cols-3 gap-1 mb-1.5">
            {[{ l: "Zənglər", v: "47", c: "#3b82f6", ic: "📞" }, { l: "E-poçt", v: "124", c: "#8b5cf6", ic: "📧" }, { l: "Görüşlər", v: "18", c: "#f59e0b", ic: "📋" }].map(k => (
              <div key={k.l} className="text-center bg-[#F3F4F7] rounded p-1">
                <div className="text-[6px]">{k.ic}</div>
                <div className="text-[9px] font-bold" style={{ color: k.c }}>{k.v}</div>
                <div className="text-[5px] text-[#001E3C]/40">{k.l}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-[6px]">
            {[{ n: "Kamran Əliyev", a: "Zəng — 15 dəq", t: "2 saat əvvəl" }, { n: "Nigar Həsənova", a: "Email açıldı", t: "4 saat əvvəl" }, { n: "Rəşad Məmmədov", a: "Görüş planlandı", t: "Dünən" }].map(c => (
              <div key={c.n} className="flex items-center justify-between">
                <div><div className="font-medium text-[#001E3C]/80">{c.n}</div><div className="text-[#001E3C]/40">{c.a}</div></div>
                <span className="text-[#001E3C]/40 text-[5px]">{c.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Da Vinci Proqnoz */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1"><span className="text-[6px]">🤖</span><span className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci Proqnoz</span></div>
            <span className="text-[5px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-medium">Da Vinci</span>
          </div>
          <div className="space-y-1.5">
            {[
              { n: "NeftGaz ERP", p: "85%", pc: "text-emerald-600", sub: "Güclü champion, büdcə təsdiqi alınıb" },
              { n: "DevPort Kiber", p: "30%", pc: "text-red-500", sub: "Rəqib aktiv, qərar verici cavab vermir" },
              { n: "FinServ Data", p: "68%", pc: "text-blue-500", sub: "Demo uğurlu, texniki qiymətləndirmə başlayıb" },
            ].map(d => (
              <div key={d.n} className="flex items-center gap-1.5 text-[6px]">
                <span className="text-[7px]">📊</span>
                <div className="flex-1">
                  <div className="font-medium text-[#001E3C]/80">{d.n}</div>
                  <div className="text-[#001E3C]/40">{d.sub}</div>
                </div>
                <span className={cn("text-[8px] font-bold", d.pc)}>{d.p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rəqib Analizi */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Rəqib Analizi</div>
            <span className="text-[6px]">🎯</span>
          </div>
          <div className="space-y-1 mb-2">
            {[
              { n: "Bitrix24", v: "3 sövdə", s: "Yüksək", sc: "bg-red-100 text-red-600" },
              { n: "AmoCRM", v: "2 sövdə", s: "Orta", sc: "bg-amber-100 text-amber-600" },
              { n: "HubSpot", v: "1 sövdə", s: "Aşağı", sc: "bg-emerald-100 text-emerald-600" },
            ].map(r => (
              <div key={r.n} className="flex items-center justify-between text-[6px]">
                <span className="font-medium text-[#001E3C]/80">{r.n}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[#001E3C]/40">{r.v}</span>
                  <span className={cn("px-1 py-0.5 rounded text-[5px] font-medium", r.sc)}>{r.s}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-[7px] font-semibold text-[#001E3C]/60 mb-1">Kontakt Rolları</div>
          <div className="space-y-0.5 text-[6px]">
            {[{ n: "Kamran Əliyev", r: "Qərar verici", p: "92%", c: "#10b981" }, { n: "Nigar Həsənova", r: "Champion", p: "88%", c: "#3b82f6" }, { n: "Rəşad Məmmədov", r: "Təsiredici", p: "65%", c: "#f59e0b" }].map(c => (
              <div key={c.n} className="flex items-center justify-between">
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full" style={{ backgroundColor: c.c }} /><span className="text-[#001E3C]/60">{c.n}</span></span>
                <span className="text-[#001E3C]/40">{c.r} <span className="font-semibold" style={{ color: c.c }}>{c.p}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Sövdələşmə Sürəti */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Sövdələşmə Sürəti</div>
            <div className="text-[6px] text-emerald-500 font-medium">↑ 15%</div>
          </div>
          <svg viewBox="0 0 120 30" className="w-full h-6 mb-1">
            <polyline points="0,25 20,22 40,18 60,20 80,14 100,10 120,6" fill="none" stroke="#10b981" strokeWidth="1.5" />
          </svg>
          <div className="grid grid-cols-3 gap-1 text-center text-[6px]">
            <div><div className="text-[8px] font-bold text-blue-600">24 gün</div><div className="text-[#001E3C]/40">Ort. dövrü</div></div>
            <div><div className="text-[8px] font-bold text-emerald-600">12 gün</div><div className="text-[#001E3C]/40">Ən sürətli</div></div>
            <div><div className="text-[8px] font-bold text-red-500">45 gün</div><div className="text-[#001E3C]/40">Ən yavaş</div></div>
          </div>
        </div>

        {/* Növbəti Addımlar */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Növbəti Addımlar</div>
            <span className="text-[6px]">📋</span>
          </div>
          <div className="space-y-1 text-[6px]">
            {[
              { t: "NeftGaz — Demo təqdimat", p: "Yüksək", d: "Sabah" },
              { t: "BankTech — Təklif göndər", p: "Orta", d: "30 Mar" },
              { t: "FinServ — Texniki qiy.", p: "Yüksək", d: "2 Apr" },
              { t: "DevPort — Follow-up zəng", p: "Aşağı", d: "3 Apr" },
            ].map(a => (
              <div key={a.t} className="flex items-center justify-between">
                <div><div className="font-medium text-[#001E3C]/80">{a.t}</div><div className="text-[#001E3C]/40">{a.p}</div></div>
                <span className="text-[#001E3C]/40 text-[5px]">{a.d}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-[#001E3C]/5 text-[6px]">
            <span className="text-[#001E3C]/40">Gecikmiş tapşırıqlar</span>
            <span className="font-bold text-red-500">2</span>
          </div>
        </div>

        {/* Next Best Offers */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[6px]">⚡</span>
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Next Best Offers</div>
          </div>
          <div className="space-y-1">
            {[
              { n: "Cloud Migration", cl: "NeftGaz", v: "₼8,000", p: "96%", c: "#ef4444" },
              { n: "Cybersecurity Suite", cl: "BankTech", v: "₼3,600", p: "88%", c: "#f59e0b" },
              { n: "Data Analytics Pro", cl: "FinServ", v: "₼15,000", p: "72%", c: "#3b82f6" },
            ].map(o => (
              <div key={o.n} className="flex items-center gap-1.5 text-[6px] bg-[#F3F4F7] rounded px-1.5 py-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${o.c}15` }}>
                  <span className="text-[5px]" style={{ color: o.c }}>●</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-[#001E3C]/80">{o.n}</div>
                  <div className="text-[#001E3C]/40">{o.cl} • {o.v}</div>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[5px] font-bold text-white" style={{ backgroundColor: o.c }}>{o.p}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function InvoicePreview() {
  return (
    <AppShell activeItem="Hesabatlar">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-bold text-[#001E3C]">Hesab-fakturalar</div>
          <div className="text-[6px] text-[#001E3C]/40">Fakturalar, ödənişlər və maliyyə analitikası</div>
        </div>
        <div className="flex gap-1">
          <span className="text-[5px] bg-white border border-[#001E3C]/10 text-[#001E3C]/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">↻ Təkrarlanan</span>
          <span className="text-[5px] bg-[#001E3C]/60 text-white px-1.5 py-0.5 rounded font-medium">+ Yeni faktura</span>
        </div>
      </div>

      {/* 6 KPI cards with colored left borders */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {[
          { l: "Ümumi gəlir", v: "$148.5K", icon: "💰", border: "#3b82f6" },
          { l: "Ödənilib", v: "$112.3K", icon: "✅", border: "#10b981" },
          { l: "Gözləyir", v: "$24.8K", icon: "⏳", border: "#f59e0b" },
          { l: "Gecikmiş", v: "$11.4K", icon: "⚠️", border: "#ef4444" },
          { l: "Təkrarlanan", v: "$8.2K/ay", icon: "🔄", border: "#8b5cf6" },
          { l: "Ort. ödəniş", v: "14 gün", icon: "⏱️", border: "#06b6d4" },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5" style={{ borderLeft: `2px solid ${k.border}` }}>
            <div className="text-[5px] text-[#001E3C]/40 flex items-center gap-0.5"><span className="text-[6px]">{k.icon}</span>{k.l}</div>
            <div className="text-[9px] font-bold text-[#001E3C] mt-0.5">{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-2 border-b border-[#001E3C]/8">
        <span className="text-[7px] font-semibold text-blue-600 border-b-2 border-blue-600 pb-0.5 px-1 flex items-center gap-0.5"><BarChart3 className="w-2 h-2" /> Analitika</span>
        <span className="text-[7px] text-[#001E3C]/40 pb-0.5 px-1">Siyahı</span>
      </div>

      {/* 6 detail stat cards */}
      <div className="grid grid-cols-6 gap-1 mb-2">
        {[
          { icon: "📅", l: "Bu ay", v: "12", sub: "$18,400" },
          { icon: "📈", l: "Bu il", v: "87", sub: "$148,500" },
          { icon: "✉️", l: "Göndərildi", v: "24", sub: "87 ümumi" },
          { icon: "📝", l: "Qaralama", v: "5", sub: "göndərilməyib" },
          { icon: "📊", l: "Ort. faktura", v: "$1,707", sub: "USD" },
          { icon: "⚡", l: "Qismən/Ləğv", v: "3 / 2", sub: "qismən+ləğv" },
        ].map(s => (
          <div key={s.l} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
            <div className="text-[5px] text-[#001E3C]/40 flex items-center gap-0.5"><span className="text-[6px]">{s.icon}</span>{s.l}</div>
            <div className="text-[9px] font-bold text-[#001E3C]">{s.v} <span className="text-[5px] font-normal text-[#001E3C]/40">fkt</span></div>
            <div className="text-[5px] text-[#001E3C]/40">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Payment progress bar */}
      <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5 mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[7px] font-semibold text-[#001E3C]/80">Ödəniş proqresi</span>
          <span className="text-[6px] text-[#001E3C]/40">$112,300 / $148,500 · <span className="text-emerald-600 font-semibold">76%</span></span>
        </div>
        <div className="w-full h-1.5 bg-[#F3F4F7] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "76%" }} />
        </div>
        <div className="flex gap-2 mt-0.5 text-[5px] text-[#001E3C]/40">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Ödənildi: 52</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0176D3] inline-block" />Gözləyir: 24</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Gecikmiş: 8</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />Qismən: 3</span>
        </div>
      </div>

      {/* Row 1: Gəlir Trendi (area) + Ödəniş Statusu (donut) */}
      <div className="grid grid-cols-3 gap-1 mb-1.5">
        <div className="col-span-2 bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5 text-emerald-500" /><span className="text-[7px] font-semibold text-[#001E3C]/80">Gəlir Trendi</span></div>
            <span className="text-[6px] font-semibold text-emerald-600">↑ 23%</span>
          </div>
          <MiniLineChart data={[8, 12, 10, 15, 14, 18, 16, 22, 20, 28, 25, 32]} color="#10b981" width={220} height={40} />
          <div className="flex justify-between mt-0.5 text-[5px] text-[#001E3C]/25">
            <span>Yan</span><span>Fev</span><span>Mar</span><span>Apr</span><span>May</span><span>İyn</span><span>İyl</span><span>Avq</span><span>Sen</span><span>Okt</span><span>Noy</span><span>Dek</span>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
          <div className="flex items-center gap-1 mb-1"><span className="text-[7px] font-semibold text-[#001E3C]/80">Ödəniş Statusu</span></div>
          <div className="flex justify-center">
            <MiniDonut segments={[{ pct: 60, color: "#10b981" }, { pct: 15, color: "#3b82f6" }, { pct: 10, color: "#ef4444" }, { pct: 8, color: "#f59e0b" }, { pct: 4, color: "#94a3b8" }, { pct: 3, color: "#6b7280" }]} size={50} />
          </div>
          <div className="text-center text-[9px] font-bold text-[#001E3C] mt-0.5">87<span className="text-[5px] font-normal text-[#001E3C]/40 ml-0.5">fkt</span></div>
          <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 mt-0.5">
            {[
              { l: "Ödənildi", c: "#10b981", n: 52 },
              { l: "Göndərildi", c: "#3b82f6", n: 13 },
              { l: "Gecikmiş", c: "#ef4444", n: 8 },
              { l: "Qismən", c: "#f59e0b", n: 7 },
              { l: "Qaralama", c: "#94a3b8", n: 5 },
              { l: "Ləğv", c: "#6b7280", n: 2 },
            ].map(s => (
              <span key={s.l} className="flex items-center gap-0.5 text-[5px] text-[#001E3C]/40">
                <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: s.c }} />{s.l} {s.n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Debitor Borcu (aging) + Həftəlik Yığım */}
      <div className="grid grid-cols-2 gap-1 mb-1.5">
        {/* Aging */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-[#0176D3]" /><span className="text-[7px] font-semibold text-[#001E3C]/80">Debitor Borcu</span></div>
            <span className="text-[6px] text-[#001E3C]/40">Ümumi: $36,200</span>
          </div>
          <div className="space-y-0.5">
            {[
              { l: "0-30 gün", v: 45, c: "#10b981", amt: "$16,300" },
              { l: "31-60 gün", v: 28, c: "#3b82f6", amt: "$10,100" },
              { l: "61-90 gün", v: 15, c: "#f59e0b", amt: "$5,400" },
              { l: "91-120 gün", v: 8, c: "#f97316", amt: "$2,900" },
              { l: "120+ gün", v: 4, c: "#ef4444", amt: "$1,500" },
            ].map(b => (
              <div key={b.l} className="flex items-center gap-1">
                <span className="text-[5px] text-[#001E3C]/40 w-12">{b.l}</span>
                <div className="flex-1 bg-[#F3F4F7] rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${b.v}%`, backgroundColor: b.c }} /></div>
                <span className="text-[5px] font-medium text-[#001E3C]/60 w-8 text-right">{b.amt}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {[
              { l: "0-30", c: "#10b981" },{ l: "31-60", c: "#3b82f6" },{ l: "61-90", c: "#f59e0b" },{ l: "91-120", c: "#f97316" },{ l: "120+", c: "#ef4444" },
            ].map(b => (
              <span key={b.l} className="flex items-center gap-0.5 text-[5px] text-[#001E3C]/40"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: b.c }} />{b.l}</span>
            ))}
          </div>
        </div>
        {/* Həftəlik Yığım */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
          <div className="flex items-center gap-1 mb-1"><BarChart3 className="w-2.5 h-2.5 text-blue-500" /><span className="text-[7px] font-semibold text-[#001E3C]/80">Həftəlik Yığım</span></div>
          <MiniBarChart data={[5, 8, 12, 6, 14, 9, 11, 15]} color="bg-blue-500" height="h-8" />
          <div className="flex justify-between mt-0.5 text-[5px] text-[#001E3C]/25">
            <span>H1</span><span>H2</span><span>H3</span><span>H4</span><span>H5</span><span>H6</span><span>H7</span><span>H8</span>
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1 pt-1 border-t border-[#001E3C]/5">
            <div className="text-center"><div className="text-[8px] font-bold text-[#001E3C]">92%</div><div className="text-[4px] text-[#001E3C]/40">Yığım faizi</div></div>
            <div className="text-center"><div className="text-[8px] font-bold text-[#001E3C]">14</div><div className="text-[4px] text-[#001E3C]/40">Ort. ödəniş günü</div></div>
            <div className="text-center"><div className="text-[8px] font-bold text-[#001E3C]">$8.2K</div><div className="text-[4px] text-[#001E3C]/40">Aylıq təkrar</div></div>
          </div>
        </div>
      </div>

      {/* Row 3: Avto-fakturalar + Valyuta üzrə */}
      <div className="grid grid-cols-2 gap-1">
        {/* Recurring invoices */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1"><span className="text-[7px]">🔄</span><span className="text-[7px] font-semibold text-[#001E3C]/80">Avto-fakturalar</span></div>
            <span className="text-[5px] text-[#001E3C]/40">5 aktiv</span>
          </div>
          <div className="space-y-0.5">
            {[
              { co: "Nexus Group", freq: "Aylıq", next: "1 Apr", amt: "$3,200" },
              { co: "CloudBridge Inc", freq: "Aylıq", next: "5 Apr", amt: "$2,100" },
              { co: "DataFlow Corp", freq: "Rüblük", next: "1 May", amt: "$8,500" },
              { co: "TechStar LLC", freq: "Aylıq", next: "15 Apr", amt: "$1,400" },
              { co: "InnoSoft Ltd", freq: "İllik", next: "1 Yan", amt: "$18,000" },
            ].map(r => (
              <div key={r.co} className="flex items-center justify-between py-0.5 border-b border-[#001E3C]/5 last:border-0">
                <div>
                  <div className="text-[6px] font-medium text-[#001E3C]/80">{r.co}</div>
                  <div className="text-[5px] text-[#001E3C]/40">{r.freq} · Növbəti: {r.next}</div>
                </div>
                <div className="text-[7px] font-semibold text-[#001E3C]">{r.amt}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Currency totals */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
          <div className="flex items-center gap-1 mb-1"><Globe className="w-2.5 h-2.5 text-indigo-500" /><span className="text-[7px] font-semibold text-[#001E3C]/80">Valyuta üzrə</span></div>
          <div className="space-y-1">
            {[
              { cur: "USD", total: "$98,400", pct: 82, paid: "$80,700", rem: "$17,700" },
              { cur: "EUR", total: "€32,100", pct: 71, paid: "€22,800", rem: "€9,300" },
              { cur: "AZN", total: "₼18,000", pct: 56, paid: "₼10,100", rem: "₼7,900" },
            ].map(c => (
              <div key={c.cur} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1"><span className="text-[7px] font-bold text-[#001E3C]">{c.cur}</span><span className="text-[6px] font-semibold text-[#001E3C]/60">{c.total}</span></div>
                  <span className="text-[5px] text-emerald-600 font-medium">{c.pct}% ödənildi</span>
                </div>
                <div className="w-full h-1 bg-[#F3F4F7] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.pct}%` }} /></div>
                <div className="flex justify-between text-[4px] text-[#001E3C]/40">
                  <span>Ödənildi: {c.paid}</span><span>Qalıq: {c.rem}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function ErpPreview() {
  return (
    <AppShell activeItem="Sövdələşmələr">
      {/* Project KPIs */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[{ l: "Aktiv layihələr", v: "8", c: "#3b82f6" }, { l: "Tamamlanma", v: "62%", c: "#10b981" }, { l: "Büdcə istifadəsi", v: "₼124K", c: "#f59e0b" }, { l: "Gecikmiş", v: "2", c: "#ef4444" }].map(k => (
          <div key={k.l} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5">
            <div className="text-[6px] text-[#001E3C]/40">{k.l}</div>
            <div className="text-[10px] font-bold" style={{ color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>
      {/* Projects list */}
      <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2 mb-2">
        <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">Layihələr</div>
        <div className="space-y-1">
          {[
            { name: "NeftGaz ERP Tətbiqi", client: "NeftGaz MMC", progress: 78, budget: "₼45K / ₼52K", team: 5, status: "Aktiv", sc: "bg-blue-100 text-blue-700" },
            { name: "BankTech CRM Miqrasiya", client: "BankTech", progress: 35, budget: "₼18K / ₼30K", team: 3, status: "Aktiv", sc: "bg-blue-100 text-blue-700" },
            { name: "FinServ Data Analitika", client: "FinServ Data", progress: 92, budget: "₼28K / ₼25K", team: 4, status: "Gecikmiş", sc: "bg-red-100 text-red-700" },
            { name: "DevPort Kibertəhlükəsizlik", client: "DevPort", progress: 15, budget: "₼5K / ₼40K", team: 2, status: "Yeni", sc: "bg-emerald-100 text-emerald-700" },
          ].map(p => (
            <div key={p.name} className="bg-[#F3F4F7] rounded-lg p-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-medium text-[#001E3C]/80">{p.name}</span>
                <span className={cn("text-[5px] px-1 py-0.5 rounded font-medium", p.sc)}>{p.status}</span>
              </div>
              <div className="flex items-center gap-2 text-[6px] text-[#001E3C]/40 mb-1">
                <span>{p.client}</span><span>👥 {p.team}</span><span>{p.budget}</span>
              </div>
              <div className="w-full bg-[#001E3C]/10 rounded-full h-1">
                <div className="h-1 rounded-full bg-blue-500" style={{ width: `${p.progress}%` }} />
              </div>
              <div className="text-right text-[5px] text-[#001E3C]/40 mt-0.5">{p.progress}%</div>
            </div>
          ))}
        </div>
      </div>
      {/* Team & Tasks */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">👥 Komanda yükü</div>
          <div className="space-y-0.5 text-[6px]">
            {[{ n: "Kamran Ə.", tasks: 8, load: 90, c: "#ef4444" }, { n: "Nigar H.", tasks: 5, load: 60, c: "#f59e0b" }, { n: "Rəşad M.", tasks: 3, load: 35, c: "#10b981" }, { n: "Fərid H.", tasks: 6, load: 72, c: "#f59e0b" }].map(m => (
              <div key={m.n} className="flex items-center gap-1">
                <span className="text-[#001E3C]/80 w-14 truncate">{m.n}</span>
                <div className="flex-1 bg-[#F3F4F7] rounded-full h-1"><div className="h-1 rounded-full" style={{ width: `${m.load}%`, backgroundColor: m.c }} /></div>
                <span className="text-[#001E3C]/40 w-8 text-right">{m.tasks} iş</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">📋 Tapşırıq xülasəsi</div>
          <div className="grid grid-cols-2 gap-1 text-center">
            {[{ l: "Açıq", v: "24", c: "#3b82f6" }, { l: "Gözləmədə", v: "8", c: "#f59e0b" }, { l: "Tamamlanmış", v: "67", c: "#10b981" }, { l: "Gecikmiş", v: "3", c: "#ef4444" }].map(t => (
              <div key={t.l} className="bg-[#F3F4F7] rounded p-1">
                <div className="text-[9px] font-bold" style={{ color: t.c }}>{t.v}</div>
                <div className="text-[5px] text-[#001E3C]/40">{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function PlatformPreview() {
  return (
    <AppShell activeItem="Parametrlər">
      {/* Settings grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {[
          { title: "Rollar & İcazələr", desc: "Admin, Manager, Agent, Viewer", icon: "🔐", count: "4 rol" },
          { title: "İş axınları", desc: "Trigger → Şərt → Əməliyyat", icon: "⚡", count: "12 aktiv" },
          { title: "Xüsusi sahələr", desc: "Mətn, tarix, seçim, rəqəm", icon: "📝", count: "28 sahə" },
        ].map(s => (
          <div key={s.title} className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px]">{s.icon}</span>
              <span className="text-[7px] font-semibold text-[#001E3C]/80">{s.title}</span>
            </div>
            <div className="text-[6px] text-[#001E3C]/40 mb-1">{s.desc}</div>
            <div className="text-[7px] font-bold text-blue-600">{s.count}</div>
          </div>
        ))}
      </div>
      {/* Workflow example */}
      <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2 mb-2">
        <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">⚡ İş axını nümunəsi</div>
        <div className="flex items-center gap-1 text-[6px]">
          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Yeni lid yaranır</span>
          <span className="text-[#001E3C]/25">→</span>
          <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Skor ≥ 70?</span>
          <span className="text-[#001E3C]/25">→</span>
          <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Satış menecerə təyin et</span>
          <span className="text-[#001E3C]/25">→</span>
          <span className="bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">E-poçt göndər</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {/* Audit log */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">📋 Audit Jurnalı</div>
          <div className="space-y-0.5 text-[6px]">
            {[
              { user: "Kamran", action: "Sövdələşmə yaratdı", time: "2 dəq əvvəl" },
              { user: "Nigar", action: "Kontakt redaktə etdi", time: "15 dəq əvvəl" },
              { user: "Admin", action: "Rol dəyişdirdi", time: "1 saat əvvəl" },
              { user: "Da Vinci Bot", action: "Tiket cavabladı", time: "2 saat əvvəl" },
            ].map((l, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[#001E3C]/60"><span className="font-medium">{l.user}</span> — {l.action}</span>
                <span className="text-[#001E3C]/40 text-[5px]">{l.time}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Multi-lang & API */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1">🌐 Platforma</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[6px]">
              <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-medium">AZ</span>
              <span className="bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded font-medium">RU</span>
              <span className="bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded font-medium">EN</span>
              <span className="text-[#001E3C]/40 ml-1">Çox dilli</span>
            </div>
            <div className="bg-[#F3F4F7] rounded p-1.5">
              <div className="text-[6px] font-medium text-[#001E3C]/80 mb-0.5">REST API</div>
              <div className="text-[5px] font-mono text-emerald-600 bg-[#001E3C] rounded px-1 py-0.5">GET /api/v1/leads?score=A</div>
            </div>
            <div className="bg-[#F3F4F7] rounded p-1.5">
              <div className="text-[6px] font-medium text-[#001E3C]/80 mb-0.5">Web-to-Lead</div>
              <div className="text-[5px] text-[#001E3C]/60">Saytdan formalar → avtomatik lid</div>
            </div>
          </div>
        </div>
      </div>
      {/* Multi-tenant */}
      <div className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5 text-center">
        <div className="text-[7px] font-semibold text-[#001E3C]/80">🏢 Multi-tenant izolyasiya — hər təşkilat tam izolə edilmiş mühitdə</div>
      </div>
    </AppShell>
  )
}

function AiPreview() {
  return (
    <AppShell activeItem="Da Vinci Mərkəzi">
      {/* Top KPI row — Da Vinci performance at a glance */}
      <div className="grid grid-cols-5 gap-1 mb-2">
        {[
          { label: "Müştəri qiymətləndirmə", value: "A — 87", icon: Target, color: "#10b981" },
          { label: "Məktub hazır", value: "3 san", icon: Mail, color: "#3b82f6" },
          { label: "Əhval təhlili", value: "Pozitiv", icon: MessageSquare, color: "#8b5cf6" },
          { label: "Nəticə təxmini", value: "72%", icon: TrendingUp, color: "#ef4444" },
          { label: "Avtomatik cavab", value: "42%", icon: Zap, color: "#f59e0b" },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="bg-white rounded-lg border border-[#001E3C]/8 p-1.5 flex items-center gap-1">
              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${k.color}15` }}><Icon className="w-2.5 h-2.5" style={{ color: k.color }} /></div>
              <div><div className="text-[5px] text-[#001E3C]/40">{k.label}</div><div className="text-[8px] font-bold" style={{ color: k.color }}>{k.value}</div></div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {/* 1. Da Vinci Chat — müştəri qiymətlendirmə + tövsiyə */}
        <div className="col-span-2 bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-[#001E3C]/8">
            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-[#0176D3] to-[#0176D3] flex items-center justify-center"><Bot className="w-2.5 h-2.5 text-white" /></div>
            <div className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci</div>
            <div className="text-[6px] text-emerald-500 flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-emerald-400" />Aktiv</div>
            <span className="ml-auto text-[5px] bg-[#0176D3]/10 text-[#0176D3] px-1 py-0.5 rounded font-medium">DV</span>
          </div>
          <div className="space-y-1 text-[7px]">
            <div className="bg-[#001E3C] text-white rounded-lg rounded-br-sm px-2 py-1 max-w-[70%] ml-auto">Bu müştəri haqqında nə deyə bilərsən?</div>
            <div className="flex gap-1">
              <div className="w-3.5 h-3.5 rounded-sm bg-[#0176D3]/10 flex items-center justify-center shrink-0 mt-0.5"><Zap className="w-2 h-2 text-[#0176D3]" /></div>
              <div className="bg-[#F3F4F7] rounded-lg rounded-bl-sm px-2 py-1 text-[#001E3C]/80">
                <strong>TechVision MMC</strong> — ən perspektivli müştəri:<br />
                <span className="inline-flex items-center gap-0.5 mt-0.5"><span className="bg-emerald-100 text-emerald-700 px-1 rounded text-[6px] font-semibold">A — 87/100</span> <span className="text-[#001E3C]/40">·</span> <span className="text-[#001E3C]/60">$45K dəyər</span> <span className="text-[#001E3C]/40">·</span> <span className="text-[#001E3C]/60">4 əlaqə</span></span>
                <div className="text-[#0176D3] font-medium mt-0.5">💡 Tövsiyə: Bu həftə görüş təyin edin — 72% uğur ehtimalı.</div>
              </div>
            </div>
            <div className="flex gap-1 pl-4">
              <span className="text-[6px] font-medium text-[#0176D3] bg-[#0176D3]/5 border border-[#0176D3]/20 rounded px-1.5 py-0.5">✉️ Məktub yaz</span>
              <span className="text-[6px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">📊 Təxmin</span>
              <span className="text-[6px] font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">📋 Tapşırıq yarat</span>
            </div>
          </div>
        </div>

        {/* 2. Əhval təhlili — müştəri hisslərini real-time təhlil edir */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">😊 Əhval Təhlili</div>
          <div className="space-y-1">
            {[
              { name: "Kamran Ə.", msg: "Çox razıyam, davam edək", mood: "Pozitiv", mc: "bg-emerald-100 text-emerald-700", bar: 92, bc: "#10b981" },
              { name: "Nigar H.", msg: "Fikirləşməliyəm, bahadır", mood: "Tərəddüd", mc: "bg-amber-100 text-amber-700", bar: 45, bc: "#f59e0b" },
              { name: "Fərid M.", msg: "Rəqib daha yaxşı təklif verdi", mood: "Neqativ", mc: "bg-red-100 text-red-700", bar: 18, bc: "#ef4444" },
            ].map(s => (
              <div key={s.name} className="bg-[#F3F4F7] rounded-lg p-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[7px] font-medium text-[#001E3C]/80">{s.name}</span>
                  <span className={cn("text-[5px] px-1 py-0.5 rounded font-medium", s.mc)}>{s.mood}</span>
                </div>
                <div className="text-[6px] text-[#001E3C]/60 italic mb-1">&ldquo;{s.msg}&rdquo;</div>
                <div className="w-full bg-[#001E3C]/10 rounded-full h-1">
                  <div className="h-1 rounded-full" style={{ width: `${s.bar}%`, backgroundColor: s.bc }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-center text-[6px] text-[#001E3C]/40">Da Vinci hər mesajı analiz edir</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {/* 3. Şəxsi məktub — 3 saniyədə hazırlayır */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Mail className="w-3 h-3 text-blue-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci Məktub</span>
            <span className="ml-auto text-[5px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-medium flex items-center gap-0.5"><Zap className="w-2 h-2" />3 san</span>
          </div>
          <div className="text-[6px] text-[#001E3C]/60 space-y-0.5 border-t border-[#001E3C]/8 pt-1">
            <div><span className="text-[#001E3C]/40">Kimə:</span> <span className="text-[#001E3C]/80">info@techvision.az</span></div>
            <div><span className="text-[#001E3C]/40">Mövzu:</span> <span className="text-[#001E3C]/80">Şəxsi təklif — TechVision</span></div>
          </div>
          <div className="mt-1 bg-blue-50 rounded p-1.5 text-[6px] text-[#001E3C]/60 leading-relaxed border border-blue-100">
            Hörmətli Kamran bəy,<br />
            TechVision MMC-nin ERP ehtiyaclarını nəzərə alaraq, Professional plan hazırladıq. Əlavə 15% endirim...<br />
            <span className="text-[#0176D3] italic">✨ Da Vinci tərəfindən yaradıldı</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[5px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-2 h-2" />Ton: Peşəkar</span>
            <span className="text-[5px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-2 h-2" />Uzunluq: Optimal</span>
          </div>
        </div>

        {/* 4. Avtomatik müraciət cavabı */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Headphones className="w-3 h-3 text-violet-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci Dəstək</span>
          </div>
          <div className="space-y-1">
            <div className="bg-[#F3F4F7] rounded-lg p-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[6px] font-medium text-[#001E3C]/80">Müştəri müraciəti:</span>
                <span className="text-[5px] bg-amber-100 text-amber-700 px-1 rounded">WhatsApp</span>
              </div>
              <div className="text-[6px] text-[#001E3C]/60 italic">&ldquo;Hesabıma daxil ola bilmirəm&rdquo;</div>
            </div>
            <div className="bg-violet-50 rounded-lg p-1.5 border border-violet-100">
              <div className="flex items-center gap-0.5 mb-0.5">
                <Bot className="w-2.5 h-2.5 text-violet-500" />
                <span className="text-[6px] font-semibold text-violet-700">Da Vinci cavab hazırladı:</span>
              </div>
              <div className="text-[6px] text-[#001E3C]/60">&ldquo;Salam! Şifrənizi sıfırlamaq üçün bu linkə keçin: [link]. 5 dəq ərzində yeni şifrə yaradın.&rdquo;</div>
              <div className="text-[5px] text-violet-500 mt-0.5">⚡ 2 saniyədə cavab · Bilik bazasından</div>
            </div>
            <div className="flex gap-1">
              <span className="text-[5px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded font-medium">✅ Göndər</span>
              <span className="text-[5px] bg-[#F3F4F7] text-[#001E3C]/60 px-1 py-0.5 rounded font-medium">✏️ Redaktə</span>
              <span className="text-[5px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-medium">⬆ Eskalasiya</span>
            </div>
          </div>
        </div>

        {/* 5. Sövdələşmə təxmini — 72% dəqiqlik */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingUp className="w-3 h-3 text-red-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci Təxmin</span>
            <span className="ml-auto text-[5px] text-[#001E3C]/40">72% dəqiqlik</span>
          </div>
          <div className="space-y-1">
            {[
              { name: "NeftGaz ERP", p: 85, c: "#10b981", s: "Yüksək" },
              { name: "DevPort Kiber", p: 30, c: "#ef4444", s: "Aşağı" },
              { name: "FinServ Data", p: 68, c: "#3b82f6", s: "Orta" },
              { name: "BankTech CRM", p: 52, c: "#f59e0b", s: "Orta" },
            ].map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[6px]">
                <div className="flex-1">
                  <div className="font-medium text-[#001E3C]/80">{d.name}</div>
                  <div className="w-full bg-[#F3F4F7] rounded-full h-1 mt-0.5">
                    <div className="h-1 rounded-full" style={{ width: `${d.p}%`, backgroundColor: d.c }} />
                  </div>
                </div>
                <span className="text-[7px] font-bold shrink-0" style={{ color: d.c }}>{d.p}%</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 bg-emerald-50 rounded p-1 text-[6px] text-emerald-700 border border-emerald-100">
            💰 Bu rüb təxmini gəlir: <strong>₼142K</strong>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* 6. Tapşırıq yaratma — heç nə unudulmur */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3 text-amber-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci Tapşırıqlar</span>
          </div>
          <div className="text-[6px] text-[#001E3C]/40 mb-1">Da Vinci söhbətlərdən avtomatik yaradır:</div>
          <div className="space-y-0.5">
            {[
              { t: "NeftGaz-a demo təqdimat hazırla", d: "Sabah 14:00", pr: "bg-red-100 text-red-700" },
              { t: "FinServ texniki sənəd göndər", d: "30 Mar", pr: "bg-amber-100 text-amber-700" },
              { t: "BankTech-ə endirmli təklif yaz", d: "1 Apr", pr: "bg-blue-100 text-blue-700" },
              { t: "DevPort follow-up zəng et", d: "2 Apr", pr: "bg-[#F3F4F7] text-[#001E3C]/60" },
            ].map(t => (
              <div key={t.t} className="flex items-center gap-1 text-[6px] bg-[#F3F4F7] rounded px-1.5 py-0.5">
                <span className={cn("px-1 py-0.5 rounded text-[5px] font-medium shrink-0", t.pr)}>●</span>
                <span className="flex-1 text-[#001E3C]/80 truncate">{t.t}</span>
                <span className="text-[#001E3C]/40 shrink-0">{t.d}</span>
              </div>
            ))}
          </div>
          <div className="text-[5px] text-amber-600 mt-1">🤖 4 tapşırıq avtomatik yaradıldı</div>
        </div>

        {/* 7. Bilik bazası — 3x sürətli cavab */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="flex items-center gap-1 mb-1">
            <FileText className="w-3 h-3 text-cyan-500" />
            <span className="text-[8px] font-semibold text-[#001E3C]/80">Da Vinci Bilik Bazası</span>
          </div>
          <div className="text-[6px] text-[#001E3C]/40 mb-1">Agent sual verir → Da Vinci cavab tapır:</div>
          <div className="bg-cyan-50 rounded-lg p-1.5 border border-cyan-100 mb-1">
            <div className="text-[6px] text-[#001E3C]/60 mb-0.5">🔍 <span className="italic">&ldquo;Faktura düzəlişi necə edilir?&rdquo;</span></div>
            <div className="text-[6px] text-cyan-700 font-medium">📄 Tapıldı: &ldquo;Faktura redaktəsi&rdquo; (98% uyğunluq)</div>
            <div className="text-[5px] text-[#001E3C]/60 mt-0.5">3 əlaqəli məqalə · 0.8 san axtarış</div>
          </div>
          <div className="space-y-0.5">
            {[
              { title: "Hesab yaratma qaydaları", views: 234, helpful: "94%" },
              { title: "API inteqrasiya sənədi", views: 189, helpful: "91%" },
              { title: "Ödəniş qaydaları", views: 156, helpful: "88%" },
            ].map(a => (
              <div key={a.title} className="flex items-center justify-between text-[6px]">
                <span className="text-[#001E3C]/60">📘 {a.title}</span>
                <span className="text-[#001E3C]/40">{a.helpful}</span>
              </div>
            ))}
          </div>
          <div className="text-[5px] text-cyan-600 mt-1">⚡ Əməkdaşlar 3x sürətli cavab verir</div>
        </div>

        {/* Da Vinci ümumi performans */}
        <div className="bg-white rounded-lg border border-[#001E3C]/8 p-2">
          <div className="text-[8px] font-semibold text-[#001E3C]/80 mb-1.5">📊 Da Vinci Performans</div>
          <div className="space-y-1">
            {[
              { l: "Müraciətlərə avtomatik cavab", v: "42%", c: "#8b5cf6", bar: 42 },
              { l: "Məktub yazma sürəti", v: "3 san", c: "#3b82f6", bar: 95 },
              { l: "Təxmin dəqiqliyi", v: "72%", c: "#10b981", bar: 72 },
              { l: "Əhval təhlili dəqiqliyi", v: "89%", c: "#f59e0b", bar: 89 },
              { l: "Bilik bazası uyğunluq", v: "94%", c: "#06b6d4", bar: 94 },
            ].map(m => (
              <div key={m.l}>
                <div className="flex items-center justify-between text-[6px] mb-0.5">
                  <span className="text-[#001E3C]/60">{m.l}</span>
                  <span className="font-bold" style={{ color: m.c }}>{m.v}</span>
                </div>
                <div className="w-full bg-[#F3F4F7] rounded-full h-1">
                  <div className="h-1 rounded-full" style={{ width: `${m.bar}%`, backgroundColor: m.c }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-center bg-[#0176D3]/5 rounded p-1 text-[6px] text-[#0176D3] border border-[#0176D3]/10 font-medium">
            🧠 16 Da Vinci imkanı aktiv
          </div>
        </div>
      </div>
    </AppShell>
  )
}

/* ══════════════════════════════════════════════════════
   MODULE DATA
   ══════════════════════════════════════════════════════ */

const modulesDef = [
  { id: "davinci", key: "davinci", color: "#f97316", icon: Bot, featureCount: 7, Preview: AiPreview },
  { id: "sales-pipeline", key: "salesPipeline", color: "#ef4444", icon: TrendingUp, featureCount: 6, Preview: SalesPipelinePreview },
  { id: "marketing", key: "marketing", color: "#f97316", icon: Megaphone, featureCount: 6, Preview: MarketingPreview },
  { id: "crm", key: "crm", color: "#3b82f6", icon: Users, featureCount: 6, Preview: CrmPreview },
  { id: "support", key: "support", color: "#8b5cf6", icon: Headphones, featureCount: 7, Preview: SupportPreview, fullWidth: true },
  { id: "finance", key: "finance", color: "#10b981", icon: LineChart, featureCount: 6, Preview: FinancePreview },
  { id: "invoices", key: "invoices", color: "#ef4444", icon: Receipt, featureCount: 6, Preview: InvoicePreview },
  { id: "erp", key: "erp", color: "#f59e0b", icon: Layers, featureCount: 6, Preview: ErpPreview },
  { id: "inbox", key: "inbox", color: "#06b6d4", icon: MessageSquare, featureCount: 6, Preview: InboxPreview },
  { id: "events", key: "events", color: "#8b5cf6", icon: CalendarDays, featureCount: 6, Preview: EventsPreview },
  { id: "platform", key: "platform", color: "#64748b", icon: Settings, featureCount: 6, Preview: PlatformPreview },
]

/* ══════════════════════════════════════════════════════
   MAIN — alternating screen + features
   ══════════════════════════════════════════════════════ */

export function ModuleShowcase() {
  const t = useTranslations("marketing.statsBar")
  const tMod = useTranslations("marketing.modules")
  const tData = useTranslations("marketing.moduleData")

  const modules = modulesDef.map(def => ({
    ...def,
    title: tData(`${def.key}.title`),
    description: tData(`${def.key}.description`),
    features: Array.from({ length: def.featureCount }, (_, i) => tData(`${def.key}.f${i + 1}`)),
  }))

  return (
    <section id="modules" className="relative bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn className="text-center mb-16 lg:mb-20">
          <p className="text-sm font-medium text-[#001E3C]/40 uppercase tracking-widest mb-3">{t("featuresCount")}</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#001E3C]">{t("title")}</h2>
          <p className="mt-4 text-lg text-[#001E3C]/60 max-w-2xl mx-auto">{t("description")}</p>
        </AnimateIn>

        <div className="space-y-20 lg:space-y-28">
          {modules.map((mod, i) => {
            const Icon = mod.icon
            const Preview = mod.Preview
            const isReversed = i % 2 === 1

            /* Full-width layout: 3 sliding panels + description below */
            if (mod.fullWidth) {
              return (
                <AnimateIn key={mod.id} delay={80}>
                  <SupportSlidingPanels />
                  {/* Description centered below */}
                  <div className="text-center max-w-2xl mx-auto mt-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: `${mod.color}12` }}>
                        <Icon className="w-5 h-5" style={{ color: mod.color }} />
                      </div>
                      <h3 className="text-xl lg:text-2xl font-bold text-[#001E3C]">{mod.title}</h3>
                    </div>
                    <p className="text-[#001E3C]/60 leading-relaxed mb-6">{mod.description}</p>
                    <ul className="inline-grid grid-cols-2 gap-x-8 gap-y-2.5 text-left">
                      {mod.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: mod.color }} />
                          <span className="text-sm text-[#001E3C]/60">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimateIn>
              )
            }

            return (
              <AnimateIn key={mod.id} delay={80}>
                <div className={`flex flex-col ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 lg:gap-12 items-center`}>
                  {/* Screen */}
                  <div className="w-full lg:w-[58%] shrink-0">
                    <Preview />
                  </div>
                  {/* Features */}
                  <div className="w-full lg:w-[42%]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0" style={{ backgroundColor: `${mod.color}12` }}>
                        <Icon className="w-5 h-5" style={{ color: mod.color }} />
                      </div>
                      <h3 className="text-xl lg:text-2xl font-bold text-[#001E3C]">{mod.title}</h3>
                    </div>
                    <p className="text-[#001E3C]/60 leading-relaxed mb-6">{mod.description}</p>
                    <ul className="space-y-2.5">
                      {mod.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: mod.color }} />
                          <span className="text-sm text-[#001E3C]/60">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AnimateIn>
            )
          })}
        </div>

        <AnimateIn delay={200} className="text-center mt-16">
          <Link href="/modules" className="group inline-flex items-center gap-2 rounded-full border border-[#001E3C]/10 px-6 py-3 text-sm font-medium text-[#001E3C]/60 hover:bg-[#F3F4F7] hover:border-[#001E3C]/20 transition-all">
            {tMod("sectionLabel")} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </AnimateIn>
      </div>
    </section>
  )
}
