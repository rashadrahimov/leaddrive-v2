"use client"

import { AnimateIn } from "./animate-in"
import { SectionWrapper } from "./section-wrapper"
import {
  Target, Megaphone, Inbox, Headphones, TrendingUp,
  Brain, Briefcase, Settings, FolderKanban, Mail,
  ShieldCheck, Users, Gauge, FileText, MessageSquare,
  Bot, Sparkles, Zap, PieChart, BarChart3,
  CalendarDays, Route, Globe, BookOpen, Receipt,
  Star, Clock, UserCheck, Phone, ArrowRight,
  CheckCircle2, AlertTriangle, Flame, Hash,
  Send, Paperclip, SmilePlus, Search, Filter,
  ChevronRight, Circle, MoreHorizontal, Play,
  ArrowUpRight, Percent, Wallet, Building2,
  Lock, Key, Eye, Database, Webhook,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { MiniBarChart, MiniLineChart, MiniDonut } from "@/components/charts/mini-charts"

/* ─── Annotation bubble ─── */
function Callout({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn(
      "absolute z-10 w-5 h-5 rounded-full bg-violet-500 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-violet-500/40 ring-2 ring-white",
      className
    )}>
      {n}
    </span>
  )
}

/* ─── Shared browser frame wrapper ─── */
function PreviewFrame({ children, url = "app.leaddrivecrm.org" }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-700/50 bg-slate-800/80">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
          <div className="w-2 h-2 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-slate-700/50 rounded px-2 py-0.5 text-[9px] text-slate-500 border border-slate-600/50 max-w-[200px] mx-auto text-center truncate">
            {url}
          </div>
        </div>
      </div>
      <div className="bg-white text-slate-900 relative">
        {children}
      </div>
    </div>
  )
}

/* ─── Feature annotation legend ─── */
function FeatureLegend({ items }: { items: { n: number; text: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
      {items.map((item) => (
        <div key={item.n} className="flex items-start gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400 flex items-center justify-center border border-violet-500/30">
            {item.n}
          </span>
          <span className="text-xs text-slate-400 leading-tight">{item.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 1: CRM & SALES — Kanban Pipeline + AI Scoring
   ═══════════════════════════════════════════════════════════════ */
function CrmPreview() {
  const stages = [
    { name: "Yeni", color: "bg-blue-500", deals: [
      { name: "DataFlow LLC", value: "₼24,500", hot: true, score: "A" },
      { name: "TechVision", value: "₼12,000", hot: false, score: "B" },
    ]},
    { name: "Kvalifikasiya", color: "bg-cyan-500", deals: [
      { name: "CloudSync", value: "₼38,000", hot: true, score: "A" },
    ]},
    { name: "Təklif", color: "bg-violet-500", deals: [
      { name: "NexGen Corp", value: "₼52,000", hot: false, score: "B" },
      { name: "AzərSoft", value: "₼18,500", hot: true, score: "A" },
    ]},
    { name: "Danışıq", color: "bg-amber-500", deals: [
      { name: "ProMedia", value: "₼67,000", hot: true, score: "A" },
    ]},
    { name: "Qazanıldı", color: "bg-emerald-500", deals: [
      { name: "DigiTrade", value: "₼45,000", hot: false, score: "A" },
    ]},
  ]

  return (
    <PreviewFrame url="app.leaddrivecrm.org/deals">
      <div className="p-2.5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-700">Satış Pipeline</span>
            <span className="text-[9px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-medium">8 sövdələşmə • ₼257K</span>
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <Search className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Kanban columns */}
        <Callout n={1} className="-top-1 left-16" />
        <div className="flex gap-1.5 overflow-hidden">
          {stages.map((stage) => (
            <div key={stage.name} className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", stage.color)} />
                <span className="text-[8px] font-semibold text-slate-600 truncate">{stage.name}</span>
                <span className="text-[7px] text-slate-400">{stage.deals.length}</span>
              </div>
              <div className="space-y-1">
                {stage.deals.map((deal) => (
                  <div key={deal.name} className="bg-slate-50 rounded-md p-1.5 border border-slate-100 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-medium text-slate-700 truncate">{deal.name}</span>
                      {deal.hot && <Flame className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[8px] font-bold text-slate-900">{deal.value}</span>
                      <span className={cn(
                        "text-[7px] font-bold px-1 py-0.5 rounded",
                        deal.score === "A" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>{deal.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* AI scoring indicator */}
        <Callout n={2} className="top-8 -right-1" />
        <Callout n={3} className="bottom-1 left-24" />

        {/* Bottom bar */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-slate-400">Konversiya:</span>
            <span className="text-[9px] font-bold text-emerald-600">32.4%</span>
            <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-slate-400">AI tövsiyə:</span>
            <span className="text-[8px] bg-violet-50 text-violet-600 px-1 py-0.5 rounded font-medium flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> 3 Next Best Action
            </span>
          </div>
        </div>
        <Callout n={4} className="bottom-1 -right-1" />
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 2: MARKETING — Campaigns + Journey Builder
   ═══════════════════════════════════════════════════════════════ */
function MarketingPreview() {
  return (
    <PreviewFrame url="app.leaddrivecrm.org/campaigns">
      <div className="p-2.5 relative">
        {/* Campaign cards */}
        <Callout n={1} className="-top-1 left-8" />
        <div className="space-y-1.5 mb-2">
          {[
            { name: "Yeni il kampaniyası", status: "Aktiv", sent: "2,450", open: "68%", click: "24%", color: "bg-emerald-500" },
            { name: "Məhsul yeniləmə", status: "Planlaşdırılmış", sent: "—", open: "—", click: "—", color: "bg-amber-500" },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-2 bg-slate-50 rounded-md p-1.5 border border-slate-100">
              <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-semibold text-slate-700 truncate">{c.name}</span>
                  <span className={cn("text-[7px] px-1 py-0.5 rounded-full font-medium",
                    c.status === "Aktiv" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>{c.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[7px] text-slate-400">Göndərildi: <b className="text-slate-600">{c.sent}</b></span>
                  <span className="text-[7px] text-slate-400">Açılma: <b className="text-emerald-600">{c.open}</b></span>
                  <span className="text-[7px] text-slate-400">Klik: <b className="text-blue-600">{c.click}</b></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Callout n={2} className="top-12 -right-1" />

        {/* Mini Journey Builder */}
        <div className="border border-dashed border-slate-200 rounded-lg p-2 bg-slate-50/50">
          <div className="flex items-center gap-1 mb-1.5">
            <Route className="w-3 h-3 text-violet-500" />
            <span className="text-[8px] font-semibold text-slate-600">Marşrut Qurucusu</span>
          </div>
          <Callout n={3} className="-top-2 right-2" />
          <div className="flex items-center gap-1 relative">
            {[
              { label: "Trigger", sub: "Form dolduran", color: "bg-blue-100 border-blue-200 text-blue-700" },
              { label: "Gözlə", sub: "2 gün", color: "bg-slate-100 border-slate-200 text-slate-600" },
              { label: "E-poçt", sub: "Xoş gəldiniz", color: "bg-violet-100 border-violet-200 text-violet-700" },
              { label: "Şərt", sub: "Açdı?", color: "bg-amber-100 border-amber-200 text-amber-700" },
              { label: "E-poçt", sub: "Təklif", color: "bg-emerald-100 border-emerald-200 text-emerald-700" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={cn("rounded px-1 py-0.5 border text-center", step.color)}>
                  <div className="text-[7px] font-semibold">{step.label}</div>
                  <div className="text-[6px] opacity-70">{step.sub}</div>
                </div>
                {i < 4 && <ChevronRight className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* ROI metrics */}
        <Callout n={4} className="bottom-0 left-20" />
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[7px] text-slate-400">ROI</span>
              <span className="text-[9px] font-bold text-emerald-600 ml-1">340%</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-400">Seqmentlər</span>
              <span className="text-[9px] font-bold text-slate-700 ml-1">12</span>
            </div>
            <div>
              <span className="text-[7px] text-slate-400">Tədbirlər</span>
              <span className="text-[9px] font-bold text-slate-700 ml-1">3</span>
            </div>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 3: 7-CHANNEL INBOX — Unified messaging
   ═══════════════════════════════════════════════════════════════ */
function InboxPreview() {
  const channels = [
    { icon: "📧", name: "E-poçt", count: 12, color: "text-blue-500" },
    { icon: "💬", name: "WhatsApp", count: 8, color: "text-emerald-500" },
    { icon: "✈️", name: "Telegram", count: 5, color: "text-cyan-500" },
    { icon: "📘", name: "Facebook", count: 3, color: "text-blue-600" },
    { icon: "📷", name: "Instagram", count: 2, color: "text-pink-500" },
  ]

  return (
    <PreviewFrame url="app.leaddrivecrm.org/inbox">
      <div className="flex relative">
        {/* Sidebar — conversation list */}
        <div className="w-[42%] border-r border-slate-100 p-1.5">
          <Callout n={1} className="-top-1 left-4" />
          {/* Channel tabs */}
          <div className="flex items-center gap-0.5 mb-1.5 pb-1 border-b border-slate-100">
            {channels.map((ch) => (
              <div key={ch.name} className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px]">
                <span>{ch.icon}</span>
                <span className="text-[7px] font-medium text-slate-500">{ch.count}</span>
              </div>
            ))}
          </div>

          {/* Conversations */}
          {[
            { name: "Elvin M.", ch: "💬", msg: "Qiymət siyahısını göndərə...", time: "2d", unread: true },
            { name: "Aysəl H.", ch: "📧", msg: "RE: Təklif hazırdır", time: "3s", unread: false },
            { name: "Rüstəm Ə.", ch: "✈️", msg: "Demo vaxtını təsdiqləyirəm", time: "5s", unread: true },
            { name: "Nigar K.", ch: "📘", msg: "Minnətdaram, yarın danışaq", time: "1g", unread: false },
          ].map((conv) => (
            <div key={conv.name} className={cn(
              "flex items-start gap-1 p-1 rounded-md mb-0.5",
              conv.unread ? "bg-violet-50/50" : ""
            )}>
              <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] flex-shrink-0 mt-0.5">
                {conv.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn("text-[8px] truncate", conv.unread ? "font-semibold text-slate-800" : "text-slate-600")}>{conv.name}</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-[6px]">{conv.ch}</span>
                    <span className="text-[6px] text-slate-400">{conv.time}</span>
                  </div>
                </div>
                <span className="text-[7px] text-slate-400 truncate block">{conv.msg}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div className="flex-1 p-1.5 flex flex-col">
          <Callout n={2} className="-top-1 right-8" />
          {/* Chat header */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[7px]">E</div>
              <div>
                <span className="text-[8px] font-semibold text-slate-700">Elvin Məmmədov</span>
                <span className="text-[6px] text-slate-400 ml-1">💬 WhatsApp</span>
              </div>
            </div>
            <span className="text-[7px] bg-violet-50 text-violet-600 px-1 py-0.5 rounded font-medium">Tiketə çevir</span>
          </div>

          {/* Messages */}
          <div className="space-y-1 flex-1">
            <div className="bg-slate-50 rounded-md px-1.5 py-1 max-w-[85%]">
              <p className="text-[7px] text-slate-600">Salam, Enterprise planın qiyməti nə qədərdir?</p>
              <span className="text-[6px] text-slate-400">14:23</span>
            </div>
            <Callout n={3} className="top-[52%] right-0" />
            <div className="bg-violet-50 border border-violet-100 rounded-md px-1.5 py-1 max-w-[85%] ml-auto">
              <div className="flex items-center gap-0.5 mb-0.5">
                <Sparkles className="w-2 h-2 text-violet-500" />
                <span className="text-[6px] font-semibold text-violet-600">AI cavab təklifi</span>
              </div>
              <p className="text-[7px] text-violet-700">Salam Elvin bəy! Enterprise plan haqqında...</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[6px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded cursor-pointer">Göndər</span>
                <span className="text-[6px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded cursor-pointer">Redaktə et</span>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="flex items-center gap-1 pt-1 border-t border-slate-100 mt-1">
            <Paperclip className="w-2.5 h-2.5 text-slate-400" />
            <div className="flex-1 bg-slate-50 rounded px-1.5 py-0.5 text-[7px] text-slate-400">Mesaj yazın...</div>
            <Send className="w-2.5 h-2.5 text-violet-500" />
          </div>
          <Callout n={4} className="bottom-0 left-2" />
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 4: SUPPORT & TICKETS — SLA + AI Auto-response
   ═══════════════════════════════════════════════════════════════ */
function SupportPreview() {
  const tickets = [
    { id: "T-1042", subject: "API inteqrasiya xətası", priority: "Yüksək", sla: "1s 23d", slaColor: "text-red-500", agent: "AH", status: "Açıq", ai: true },
    { id: "T-1041", subject: "Hesab fakturası düzəliş", priority: "Orta", sla: "3s 45d", slaColor: "text-amber-500", agent: "NK", status: "Gözləyir", ai: false },
    { id: "T-1040", subject: "Yeni istifadəçi əlavəsi", priority: "Aşağı", sla: "7s 12d", slaColor: "text-emerald-500", agent: "RE", status: "Həll olunub", ai: true },
  ]

  return (
    <PreviewFrame url="app.leaddrivecrm.org/tickets">
      <div className="p-2.5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-700">Tiketlər</span>
            <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">5 açıq</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded font-medium">SLA: 94%</span>
            <span className="text-[8px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-medium">CSAT: 4.7</span>
          </div>
        </div>

        {/* Ticket list */}
        <Callout n={1} className="-top-1 left-12" />
        <div className="space-y-1">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-2 bg-slate-50 rounded-md p-1.5 border border-slate-100">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[7px] font-mono text-slate-400">{t.id}</span>
                  <span className="text-[8px] font-medium text-slate-700 truncate">{t.subject}</span>
                  {t.ai && (
                    <span className="text-[6px] bg-violet-50 text-violet-600 px-1 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                      <Sparkles className="w-2 h-2" /> AI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn("text-[7px] font-medium",
                    t.priority === "Yüksək" ? "text-red-500" : t.priority === "Orta" ? "text-amber-500" : "text-slate-400"
                  )}>{t.priority}</span>
                  <span className="text-[7px] text-slate-300">•</span>
                  <span className={cn("text-[7px] font-medium flex items-center gap-0.5", t.slaColor)}>
                    <Clock className="w-2 h-2" /> {t.sla}
                  </span>
                  <span className="text-[7px] text-slate-300">•</span>
                  <span className="text-[7px] text-slate-500">{t.status}</span>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[6px] font-bold text-slate-600 flex-shrink-0">
                {t.agent}
              </div>
            </div>
          ))}
        </div>

        <Callout n={2} className="top-10 -right-1" />

        {/* AI Auto-response section */}
        <div className="mt-2 border border-violet-200 rounded-lg p-1.5 bg-violet-50/50">
          <Callout n={3} className="-top-2 left-16" />
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-violet-500" />
            <span className="text-[8px] font-semibold text-violet-700">AI Avtomatik Cavab</span>
            <span className="text-[7px] text-violet-500">— T-1042</span>
          </div>
          <div className="bg-white rounded p-1.5 border border-violet-100">
            <p className="text-[7px] text-slate-600 leading-relaxed">
              Hörmətli müştərimiz, API inteqrasiya xətası haqqında bilik bazamızda həll tapılıb.
              Token yeniləmə prosedurunu izləyin: Parametrlər → API → Token yenilə...
            </p>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              <span className="text-[6px] text-emerald-600 font-medium">Bilik bazasından cavab tapıldı</span>
            </div>
          </div>
        </div>

        {/* SLA bar */}
        <Callout n={4} className="bottom-0 right-12" />
        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
          <div>
            <span className="text-[7px] text-slate-400">SLA uyğunluq</span>
            <div className="w-20 h-1 rounded-full bg-slate-200 mt-0.5">
              <div className="w-[94%] h-full rounded-full bg-emerald-500" />
            </div>
          </div>
          <div>
            <span className="text-[7px] text-slate-400">Ort. cavab</span>
            <span className="text-[9px] font-bold text-slate-700 ml-1">1.8s</span>
          </div>
          <div>
            <span className="text-[7px] text-slate-400">AI həll</span>
            <span className="text-[9px] font-bold text-violet-600 ml-1">42%</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 5: FINANCE & ANALYTICS — Cost Model + P&L
   ═══════════════════════════════════════════════════════════════ */
function FinancePreview() {
  return (
    <PreviewFrame url="app.leaddrivecrm.org/profitability">
      <div className="p-2.5 relative">
        {/* KPIs */}
        <Callout n={1} className="-top-1 left-8" />
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {[
            { label: "Gəlir", value: "₼847K", trend: "+18%", up: true },
            { label: "Xərc", value: "₼523K", trend: "+8%", up: false },
            { label: "Marja", value: "38.3%", trend: "+3.2%", up: true },
            { label: "ROI", value: "162%", trend: "+22%", up: true },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-slate-50 rounded-md p-1.5 border border-slate-100 text-center">
              <span className="text-[7px] text-slate-400">{kpi.label}</span>
              <div className="text-[10px] font-bold text-slate-800">{kpi.value}</div>
              <span className={cn("text-[7px] font-medium", kpi.up ? "text-emerald-600" : "text-red-500")}>
                {kpi.trend}
              </span>
            </div>
          ))}
        </div>

        {/* Cost breakdown + Revenue chart */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Cost Model */}
          <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
            <Callout n={2} className="-top-2 left-12" />
            <span className="text-[8px] font-semibold text-slate-600 flex items-center gap-1">
              <PieChart className="w-2.5 h-2.5" /> Xərc Modeli
            </span>
            <div className="flex items-center gap-2 mt-1">
              <MiniDonut segments={[
                { pct: 35, color: "#8b5cf6" },
                { pct: 25, color: "#06b6d4" },
                { pct: 20, color: "#f59e0b" },
                { pct: 12, color: "#10b981" },
                { pct: 8, color: "#ef4444" },
              ]} size={44} />
              <div className="space-y-0.5">
                {[
                  { name: "Əmək haqqı", pct: "35%", color: "bg-violet-500" },
                  { name: "İnfrastruktur", pct: "25%", color: "bg-cyan-500" },
                  { name: "Marketinq", pct: "20%", color: "bg-amber-500" },
                  { name: "Ofis", pct: "12%", color: "bg-emerald-500" },
                  { name: "Digər", pct: "8%", color: "bg-red-500" },
                ].map((c) => (
                  <div key={c.name} className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-sm", c.color)} />
                    <span className="text-[6px] text-slate-500">{c.name}</span>
                    <span className="text-[6px] font-bold text-slate-700">{c.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* P&L */}
          <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
            <Callout n={3} className="-top-2 right-2" />
            <span className="text-[8px] font-semibold text-slate-600 flex items-center gap-1">
              <BarChart3 className="w-2.5 h-2.5" /> P&L Hesabat
            </span>
            <div className="mt-1">
              <MiniBarChart data={[65, 72, 68, 85, 92, 78, 95, 88, 102, 96, 108, 115]} color="bg-violet-400" height="h-10" />
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[6px] text-slate-400">Yan</span>
                <span className="text-[6px] text-slate-400">Dek</span>
              </div>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[7px] text-slate-500">Plan icra:</span>
                <span className="text-[8px] font-bold text-emerald-600">94.2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic pricing */}
        <Callout n={4} className="bottom-0 left-28" />
        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <Receipt className="w-2.5 h-2.5 text-amber-500" />
            <span className="text-[7px] text-slate-400">Dinamik qiymət:</span>
            <span className="text-[8px] font-bold text-slate-700">₼85/saat</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-violet-500" />
            <span className="text-[7px] text-slate-400">AI proqnoz:</span>
            <span className="text-[8px] font-bold text-emerald-600">+12% Q2</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 6: ERP & PROJECTS — Timeline + Budget tracking
   ═══════════════════════════════════════════════════════════════ */
function ErpPreview() {
  return (
    <PreviewFrame url="app.leaddrivecrm.org/projects">
      <div className="p-2.5 relative">
        <Callout n={1} className="-top-1 left-12" />
        {/* Project card */}
        <div className="bg-slate-50 rounded-md p-2 border border-slate-100 mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-blue-500" />
              <span className="text-[9px] font-semibold text-slate-700">AzərBank ERP Miqrasiya</span>
              <span className="text-[7px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-medium">Aktiv</span>
            </div>
            <span className="text-[8px] font-bold text-slate-700">₼125,000</span>
          </div>

          {/* Progress phases */}
          <Callout n={2} className="top-6 -right-2" />
          <div className="flex items-center gap-0.5 mb-1.5">
            {[
              { name: "Analiz", pct: 100, color: "bg-emerald-500" },
              { name: "Dizayn", pct: 100, color: "bg-emerald-500" },
              { name: "İnkişaf", pct: 65, color: "bg-blue-500" },
              { name: "Test", pct: 0, color: "bg-slate-200" },
              { name: "Dəployment", pct: 0, color: "bg-slate-200" },
            ].map((phase) => (
              <div key={phase.name} className="flex-1">
                <div className="text-[6px] text-slate-500 text-center mb-0.5">{phase.name}</div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div className={cn("h-full rounded-full", phase.color)} style={{ width: `${phase.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Team */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-slate-400">Komanda:</span>
              <div className="flex -space-x-1">
                {["RM", "AH", "NK", "FH"].map((init) => (
                  <div key={init} className="w-3.5 h-3.5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[5px] font-bold text-slate-600">
                    {init}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-slate-400">Tamamlanma:</span>
              <span className="text-[9px] font-bold text-blue-600">53%</span>
            </div>
          </div>
        </div>

        {/* Budget tracking */}
        <Callout n={3} className="top-[60%] -left-1" />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
            <span className="text-[7px] text-slate-400">Büdcə vs Aktual</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1">
                <div className="flex justify-between text-[6px] mb-0.5">
                  <span className="text-slate-500">Plan: ₼125K</span>
                  <span className="text-blue-600">Aktual: ₼66K</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "53%" }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
            <span className="text-[7px] text-slate-400">Vaxt izləməsi</span>
            <div className="mt-0.5">
              <MiniBarChart data={[6, 8, 7, 5, 8, 4, 0]} color="bg-blue-400" height="h-6" />
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[6px] text-slate-400">Bu həftə: 38s</span>
                <span className="text-[6px] text-emerald-600 font-medium">Norma daxilində</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <Callout n={4} className="bottom-0 right-4" />
        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            <span className="text-[7px] text-slate-500">24 tapşırıq tamamlandı</span>
          </div>
          <div className="flex items-center gap-1">
            <Circle className="w-2.5 h-2.5 text-amber-500" />
            <span className="text-[7px] text-slate-500">12 davam edir</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
            <span className="text-[7px] text-slate-500">2 gecikmiş</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 7: PLATFORM — Settings, Roles, Custom Fields
   ═══════════════════════════════════════════════════════════════ */
function PlatformPreview() {
  return (
    <PreviewFrame url="app.leaddrivecrm.org/settings">
      <div className="p-2.5 relative">
        {/* Settings grid */}
        <Callout n={1} className="-top-1 left-8" />
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[
            { icon: Users, name: "Rollar", count: "5 rol", color: "text-violet-500 bg-violet-50" },
            { icon: Zap, name: "İş axınları", count: "12 aktiv", color: "text-amber-500 bg-amber-50" },
            { icon: Settings, name: "Xüsusi sahələr", count: "28 sahə", color: "text-blue-500 bg-blue-50" },
            { icon: Globe, name: "Dillər", count: "AZ/RU/EN", color: "text-emerald-500 bg-emerald-50" },
            { icon: ShieldCheck, name: "Audit", count: "2.4K qeyd", color: "text-red-500 bg-red-50" },
            { icon: Webhook, name: "API", count: "REST + WH", color: "text-cyan-500 bg-cyan-50" },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.name} className="bg-slate-50 rounded-md p-1.5 border border-slate-100 text-center">
                <div className={cn("w-5 h-5 rounded-lg mx-auto flex items-center justify-center mb-0.5", item.color.split(" ")[1])}>
                  <Icon className={cn("w-2.5 h-2.5", item.color.split(" ")[0])} />
                </div>
                <span className="text-[7px] font-medium text-slate-700 block">{item.name}</span>
                <span className="text-[6px] text-slate-400">{item.count}</span>
              </div>
            )
          })}
        </div>

        {/* Role permission matrix */}
        <Callout n={2} className="top-[40%] -right-1" />
        <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100 mb-1.5">
          <span className="text-[8px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
            <Lock className="w-2.5 h-2.5" /> Rol İcazə Matrisi
          </span>
          <div className="space-y-0.5">
            <div className="grid grid-cols-6 gap-0.5 text-[6px] text-slate-400 font-medium">
              <span></span><span className="text-center">Bax</span><span className="text-center">Yarat</span><span className="text-center">Redaktə</span><span className="text-center">Sil</span><span className="text-center">Admin</span>
            </div>
            {[
              { role: "Admin", perms: [true, true, true, true, true] },
              { role: "Menecer", perms: [true, true, true, false, false] },
              { role: "Agent", perms: [true, true, false, false, false] },
            ].map((r) => (
              <div key={r.role} className="grid grid-cols-6 gap-0.5 items-center">
                <span className="text-[6px] font-medium text-slate-600">{r.role}</span>
                {r.perms.map((p, i) => (
                  <div key={i} className="flex justify-center">
                    {p ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> : <Circle className="w-2.5 h-2.5 text-slate-300" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Workflow rule example */}
        <Callout n={3} className="bottom-[30%] left-2" />
        <div className="bg-amber-50 rounded-md p-1.5 border border-amber-100">
          <span className="text-[7px] font-semibold text-amber-700 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> İş axını nümunəsi
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[6px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Lid yaradıldı</span>
            <ChevronRight className="w-2 h-2 text-slate-400" />
            <span className="text-[6px] bg-violet-100 text-violet-700 px-1 py-0.5 rounded">AI skorlayır</span>
            <ChevronRight className="w-2 h-2 text-slate-400" />
            <span className="text-[6px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">A/B → Satışa təyin</span>
          </div>
        </div>

        {/* Multi-tenant */}
        <Callout n={4} className="bottom-0 right-8" />
        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <Database className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[7px] text-slate-500">Multi-tenant izolyasiya</span>
          </div>
          <div className="flex items-center gap-1">
            <Key className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[7px] text-slate-500">2FA + SSO</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-2.5 h-2.5 text-slate-400" />
            <span className="text-[7px] text-slate-500">Audit trail</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE 8: MAESTRO AI — Central AI Hub
   ═══════════════════════════════════════════════════════════════ */
function AiPreview() {
  const integrations = [
    { name: "Lid Skorinq", desc: "A–F avtomatik", icon: Gauge, color: "text-emerald-500 bg-emerald-50 border-emerald-200", active: true },
    { name: "E-poçt Gen.", desc: "Bir klik mesaj", icon: Mail, color: "text-blue-500 bg-blue-50 border-blue-200", active: true },
    { name: "Tiket Cavab", desc: "KB əsasında", icon: MessageSquare, color: "text-violet-500 bg-violet-50 border-violet-200", active: true },
    { name: "Hiss Analizi", desc: "Müsbət/mənfi", icon: SmilePlus, color: "text-pink-500 bg-pink-50 border-pink-200", active: true },
    { name: "Proqnoz", desc: "Gəlir AI", icon: TrendingUp, color: "text-amber-500 bg-amber-50 border-amber-200", active: true },
    { name: "KB Axtarış", desc: "Semantik", icon: BookOpen, color: "text-cyan-500 bg-cyan-50 border-cyan-200", active: true },
  ]

  return (
    <PreviewFrame url="app.leaddrivecrm.org/ai-center">
      <div className="p-2.5 relative">
        {/* AI Hub Header */}
        <Callout n={1} className="-top-1 left-8" />
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-800">Maestro AI</span>
              <span className="text-[7px] text-emerald-500 ml-1.5 font-medium">● Aktiv</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full font-medium">16 inteqrasiya</span>
            <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">4,200 sorğu/ay</span>
          </div>
        </div>

        {/* Integration grid */}
        <Callout n={2} className="top-8 -right-1" />
        <div className="grid grid-cols-3 gap-1 mb-2">
          {integrations.map((int) => {
            const Icon = int.icon
            return (
              <div key={int.name} className={cn("rounded-md p-1.5 border flex items-center gap-1.5", int.color)}>
                <Icon className={cn("w-3 h-3 flex-shrink-0", int.color.split(" ")[0])} />
                <div>
                  <span className="text-[7px] font-semibold text-slate-700 block">{int.name}</span>
                  <span className="text-[6px] text-slate-500">{int.desc}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* AI in action demo */}
        <Callout n={3} className="top-[58%] left-4" />
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg p-2 border border-violet-200">
          <div className="flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-violet-500" />
            <span className="text-[8px] font-semibold text-violet-700">AI iş başında</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[7px] text-slate-600">Lid &quot;CloudSync&quot; skorlandı: <b className="text-emerald-600">A</b> — yüksək konversiya ehtimalı</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[7px] text-slate-600">E-poçt yaradıldı: <b className="text-blue-600">&quot;Follow-up: ProMedia təklif&quot;</b></span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[7px] text-slate-600">Tiket T-1042 cavablandı: <b className="text-violet-600">KB məqalə #27 əsasında</b></span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <Callout n={4} className="bottom-0 left-20" />
        <div className="flex items-center gap-3 mt-2 pt-1.5 border-t border-slate-100">
          <div>
            <span className="text-[7px] text-slate-400">Vaxt qənaəti</span>
            <span className="text-[9px] font-bold text-emerald-600 ml-1">~32 saat/ay</span>
          </div>
          <div>
            <span className="text-[7px] text-slate-400">Dəqiqlik</span>
            <span className="text-[9px] font-bold text-violet-600 ml-1">94.7%</span>
          </div>
          <div>
            <span className="text-[7px] text-slate-400">Avtomatik həll</span>
            <span className="text-[9px] font-bold text-blue-600 ml-1">42%</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MODULE CONFIG — metadata for each section
   ═══════════════════════════════════════════════════════════════ */
type ModuleConfig = {
  id: string
  label: string
  icon: typeof Target
  color: string
  accentBg: string
  headline: string
  description: string
  uniqueness: string
  annotations: { n: number; text: string }[]
  Preview: () => React.JSX.Element
}

const modules: ModuleConfig[] = [
  {
    id: "crm",
    label: "CRM & Satış",
    icon: Target,
    color: "text-violet-500",
    accentBg: "bg-violet-500",
    headline: "Liddən sövdələşməyə — tam satış dövrü",
    description: "Sürükle-burax Kanban pipeline, AI lid skorinqi (A-F), şirkət və kontakt idarəsi, təkliflər, müqavilələr — hər şey bir yerdə.",
    uniqueness: "AI avtomatik olaraq hər lidi A-dan F-ə qədər skorlayır və ən yaxşı növbəti addımı tövsiyə edir.",
    annotations: [
      { n: 1, text: "Sürükle-burax Kanban — sövdələşmələri mərhələlər arası daşıyın" },
      { n: 2, text: "AI Lid Skorinq — hər lid avtomatik A–F dərəcə alır" },
      { n: 3, text: "Hot/Warm/Cold — prioritet deal izləməsi" },
      { n: 4, text: "AI Next Best Action — növbəti addım tövsiyəsi" },
    ],
    Preview: CrmPreview,
  },
  {
    id: "marketing",
    label: "Marketinq",
    icon: Megaphone,
    color: "text-pink-500",
    accentBg: "bg-pink-500",
    headline: "Kampaniyalar, seqmentlər, ROI — hər şey ölçülür",
    description: "E-poçt kampaniyaları, marşrut qurucusu (journey builder), seqmentasiya və tədbirlər — marketinqi avtomatlaşdırın.",
    uniqueness: "Daxili marşrut qurucusu ilə çoxaddımlı müştəri yolçuluqları yaradın — açılma, klik, cavab əsasında avtomatik hərəkətlər.",
    annotations: [
      { n: 1, text: "Kampaniya metriklər — göndərilmə, açılma, klik real vaxtda" },
      { n: 2, text: "ROI izləmə — hər kampaniyanın gəlirə təsiri" },
      { n: 3, text: "Marşrut qurucusu — vizual çoxaddımlı avtomatlaşdırma" },
      { n: 4, text: "Seqmentasiya + tədbirlər idarəsi" },
    ],
    Preview: MarketingPreview,
  },
  {
    id: "inbox",
    label: "7 Kanallı Gələn Qutusu",
    icon: Inbox,
    color: "text-cyan-500",
    accentBg: "bg-cyan-500",
    headline: "7 kanal — bir qutu. Heç bir mesaj itirilmir",
    description: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — bütün söhbətlər hər kontakt üzrə bir vahid gələn qutusunda.",
    uniqueness: "Hər kanaldan gələn mesaj avtomatik kontakta bağlanır. AI real vaxtda cavab təklif edir. Bir kliklə tiketə çevirin.",
    annotations: [
      { n: 1, text: "7 kanal bir yerdə — e-poçt, WhatsApp, Telegram, FB, IG, SMS, VK" },
      { n: 2, text: "Kontakt tarixçəsi — bütün kanallardan söhbət" },
      { n: 3, text: "AI cavab təklifi — bir kliklə peşəkar cavab" },
      { n: 4, text: "Bir kliklə tiketə çevirmə" },
    ],
    Preview: InboxPreview,
  },
  {
    id: "support",
    label: "Dəstək & Tiketlər",
    icon: Headphones,
    color: "text-emerald-500",
    accentBg: "bg-emerald-500",
    headline: "SLA, AI cavab, bilik bazası — tam helpdesk",
    description: "Tiket idarəsi, SLA siyasətləri, AI avtomatik cavablar, bilik bazası, agent KPI-ləri və müştəri özünə-xidmət portalı.",
    uniqueness: "Maestro AI tiketi oxuyur, bilik bazasından cavab tapır və agentə təsdiq üçün göndərir. SLA taymeri avtomatik eskalasiya edir.",
    annotations: [
      { n: 1, text: "Tiketlər + prioritet + SLA taymer — real vaxtda izləmə" },
      { n: 2, text: "SLA uyğunluq 94% + CSAT reytinq göstəricisi" },
      { n: 3, text: "AI bilik bazasından avtomatik cavab tapır və təklif edir" },
      { n: 4, text: "Agent KPI — ortalama cavab vaxtı, AI həll faizi" },
    ],
    Preview: SupportPreview,
  },
  {
    id: "finance",
    label: "Maliyyə & Analitika",
    icon: TrendingUp,
    color: "text-amber-500",
    accentBg: "bg-amber-500",
    headline: "Gəlirliliyi görün — hər müştəri, hər xidmət üzrə",
    description: "Xərc modeli mühərriki, büdcələşdirmə, P&L, dinamik qiymətləndirmə — daxili CFO kimi işləyir.",
    uniqueness: "Daxili xərc modeli mühərriki 18 kateqoriyada xərcləri izləyir və hər xidmət üzrə real marjanı göstərir. Rəqiblərin heç birində yoxdur.",
    annotations: [
      { n: 1, text: "KPI paneli — gəlir, xərc, marja, ROI real vaxtda" },
      { n: 2, text: "Xərc modeli — 18 kateqoriyada bölgü (əmək haqqı, infra, marketinq...)" },
      { n: 3, text: "P&L hesabat — plan vs fakt, aylıq icra faizi" },
      { n: 4, text: "Dinamik qiymətləndirmə + AI gəlir proqnozu" },
    ],
    Preview: FinancePreview,
  },
  {
    id: "erp",
    label: "ERP & Layihələr",
    icon: Briefcase,
    color: "text-blue-500",
    accentBg: "bg-blue-500",
    headline: "Layihələr, komandalar, büdcə — tam nəzarət",
    description: "Layihə mərhələləri, komanda üzvləri bölgüsü, büdcə izləməsi, tamamlanma analitikası.",
    uniqueness: "Hər layihə müştəri sövdələşməsinə bağlıdır. Büdcə vs aktual izləmə CRM gəlirlilik mühərriki ilə inteqrasiya olunub.",
    annotations: [
      { n: 1, text: "Layihə kartı — mərhələ, status, büdcə bir baxışda" },
      { n: 2, text: "Mərhələ proqresi — vizual phase tracking" },
      { n: 3, text: "Büdcə vs aktual — real vaxtda xərc izləməsi" },
      { n: 4, text: "Tapşırıq idarəsi — tamamlanmış, davam edən, gecikmiş" },
    ],
    Preview: ErpPreview,
  },
  {
    id: "platform",
    label: "Platforma",
    icon: Settings,
    color: "text-slate-400",
    accentBg: "bg-slate-500",
    headline: "Korporativ konfiqurasiya — hər şey uyğunlaşdırılır",
    description: "Rollar, iş axınları, xüsusi sahələr, audit jurnalı, çox dilli, Web-to-Lead, API — Enterprise SaaS arxitekturası.",
    uniqueness: "Multi-tenant SaaS — hər təşkilat tam izolə edilmiş məlumat mühitində işləyir. Xüsusi sahələr istənilən modulda əlavə edilə bilər.",
    annotations: [
      { n: 1, text: "6 konfiqurasiya sahəsi — rollar, iş axınları, sahələr, dillər, audit, API" },
      { n: 2, text: "Rol icazə matrisi — dəqiq hüquq nəzarəti" },
      { n: 3, text: "İş axını avtomatlaşdırması — trigger → action zəncirləri" },
      { n: 4, text: "Multi-tenant izolyasiya + 2FA + audit trail" },
    ],
    Preview: PlatformPreview,
  },
  {
    id: "ai",
    label: "Maestro AI",
    icon: Brain,
    color: "text-violet-400",
    accentBg: "bg-violet-500",
    headline: "16 AI inteqrasiya. CRM-in beyni",
    description: "Daxili Claude inteqrasiyası — lid skorinqi, e-poçt yaratma, tiket cavabı, gəlirlilik proqnozu, sentiment analizi. Əlavə deyil — əsasdır.",
    uniqueness: "AI hər modulun içindədir: sövdələşmədə Next Best Offer, tiketdə avtomatik cavab, maliyyədə narrativ, liddə skorinq. Hamısı bir platformada.",
    annotations: [
      { n: 1, text: "Maestro AI hub — 16 inteqrasiya, 4,200+ aylıq sorğu" },
      { n: 2, text: "6 əsas AI modulu — skorinq, e-poçt, tiket, hiss, proqnoz, KB" },
      { n: 3, text: "AI real vaxt fəaliyyəti — nə edir, nəticəsi nədir" },
      { n: 4, text: "Ölçülə bilən nəticə — vaxt qənaəti, dəqiqlik, avtomatik həll" },
    ],
    Preview: AiPreview,
  },
]

/* ═══════════════════════════════════════════════════════════════
   MODULE BLOCK — Each section
   ═══════════════════════════════════════════════════════════════ */
function ModuleBlock({ mod, index }: { mod: ModuleConfig; index: number }) {
  const isEven = index % 2 === 0
  const ModIcon = mod.icon
  const Preview = mod.Preview

  return (
    <AnimateIn>
      <div className={cn(
        "grid lg:grid-cols-2 gap-8 lg:gap-10 items-center py-14 lg:py-18",
        index > 0 && "border-t border-slate-800/50"
      )}>
        {/* Text side */}
        <div className={cn("space-y-4", !isEven && "lg:order-2")}>
          {/* Module badge */}
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `${mod.accentBg}/10`)}>
              <ModIcon className={cn("w-4 h-4", mod.color)} />
            </div>
            <span className={cn("text-xs font-semibold uppercase tracking-wider", mod.color)}>{mod.label}</span>
          </div>

          {/* Headline */}
          <h3 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
            {mod.headline}
          </h3>

          {/* Description */}
          <p className="text-sm text-slate-400 leading-relaxed">
            {mod.description}
          </p>

          {/* Uniqueness callout */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-violet-300 leading-relaxed">{mod.uniqueness}</p>
            </div>
          </div>

          {/* Feature annotations legend */}
          <FeatureLegend items={mod.annotations} />

          {/* CTA */}
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            Demo-da bax
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Preview side — code-based interactive preview */}
        <div className={cn(!isEven && "lg:order-1")}>
          <Preview />
        </div>
      </div>
    </AnimateIn>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════════ */
export function ModuleShowcase() {
  return (
    <SectionWrapper id="modules" variant="dark">
      <AnimateIn className="text-center mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
          <span className="text-white">128 funksiya. </span>
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Bir platforma.</span>
        </h2>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Satış, marketinq, dəstək, maliyyə və AI — hamısı eyni ekosistemda. Aşağı sürüşdürün və kəşf edin.
        </p>
      </AnimateIn>

      <div className="divide-y divide-slate-800/50">
        {modules.map((mod, i) => (
          <ModuleBlock key={mod.id} mod={mod} index={i} />
        ))}
      </div>
    </SectionWrapper>
  )
}
