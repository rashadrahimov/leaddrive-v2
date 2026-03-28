"use client"

import { useState } from "react"
import Link from "next/link"
import { AnimateIn } from "@/components/marketing/animate-in"
import { Particles } from "@/components/ui/particles"
import {
  ArrowRight, Send, Building2, User, Mail, Phone, MessageSquare,
  Brain, Headphones, Sparkles, Users, TrendingUp, Calculator,
  LayoutDashboard, Handshake, Inbox, Megaphone, Briefcase,
  BarChart3, FileText, CalendarDays, Monitor, Wallet,
  ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Demo request form ── */
function DemoRequestForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <Send className="h-5 w-5 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">Sorğunuz qəbul edildi!</h3>
        <p className="mt-2 text-sm text-slate-400">24 saat ərzində sizinlə əlaqə saxlayacağıq.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setLoading(true)
        const form = e.target as HTMLFormElement
        const data = Object.fromEntries(new FormData(form))
        try {
          await fetch("/api/v1/demo-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          })
        } catch {}
        setSubmitted(true)
      }}
      className="space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Ad, Soyad *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              required
              name="name"
              type="text"
              placeholder="Adınız"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Şirkət *</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              required
              name="company"
              type="text"
              placeholder="Şirkət adı"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">E-poçt *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              required
              name="email"
              type="email"
              placeholder="email@company.com"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Telefon</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input
              name="phone"
              type="tel"
              placeholder="+994 XX XXX XX XX"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Mesajınız</label>
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-600" />
          <textarea
            name="message"
            rows={3}
            placeholder="Bizə nə barədə danışmaq istərdiniz?"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30 transition-colors resize-none"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Göndərilir..." : "Demo tələb et"}
        {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
      </button>
    </form>
  )
}

/* ── Product gallery screenshots ── */
const screenshots = [
  // AI (9)
  { id: "ai-scoring", title: "AI Lid Reytinqi", description: "Hər lidi A-dan F-ə qədər avtomatik qiymətləndirir.", icon: Brain, src: "/marketing/ai-lead-scoring.png", category: "ai" },
  { id: "ai-email", title: "AI Mətn Generasiyası", description: "Peşəkar e-poçt və mesaj yaradın — bir kliklə.", icon: Mail, src: "/marketing/ai-email-generation.png", category: "ai" },
  { id: "ai-deal", title: "AI Sövdələşmə Təhlili", description: "Next Best Offers — ən uyğun məhsul tövsiyələri.", icon: Sparkles, src: "/marketing/ai-deal-detail.png", category: "ai" },
  { id: "ai-ticket", title: "AI Tiket Cavabı", description: "Tiketlərə avtomatik cavab və həll addımları.", icon: Headphones, src: "/marketing/ai-ticket-detail.png", category: "ai" },
  { id: "ai-lead", title: "AI Lid Detalları", description: "Dərin AI təhlil — sentiment, skorinq, tapşırıqlar.", icon: Users, src: "/marketing/ai-lead-detail.png", category: "ai" },
  { id: "ai-contact", title: "AI Kontakt Profili", description: "AI analiz — əlaqə tarixçəsi və növbəti addımlar.", icon: Users, src: "/marketing/ai-contact-detail.png", category: "ai" },
  { id: "ai-profitability", title: "AI Gəlirlilik", description: "Trendlər, optimallaşdırma təklifləri və proqnozlar.", icon: TrendingUp, src: "/marketing/ai-profitability.png", category: "ai" },
  { id: "ai-budgeting", title: "AI Büdcə Narrativi", description: "CFO səviyyəsində büdcə şərhləri və proqnoz.", icon: Calculator, src: "/marketing/ai-budgeting.png", category: "ai" },
  { id: "ai-assistant", title: "AI Köməkçi Panel", description: "Üzən AI köməkçi — suallar, axtarış, hərəkətlər.", icon: Sparkles, src: "/marketing/ai-assistant-panel.png", category: "ai" },
  // CRM (11)
  { id: "dashboard", title: "İdarə Paneli", description: "Real vaxt KPI-lər və pipeline funnel.", icon: LayoutDashboard, src: "/marketing/crm-dashboard.png", category: "crm" },
  { id: "deals", title: "Sövdələşmələr", description: "Kanban lövhəsi ilə vizual pipeline idarəsi.", icon: Handshake, src: "/marketing/deals-pipeline.png", category: "crm" },
  { id: "inbox", title: "7 Kanallı Inbox", description: "Bütün mesajlar bir vahid gələn qutusunda.", icon: Inbox, src: "/marketing/inbox-channels.png", category: "crm" },
  { id: "companies", title: "Şirkətlər", description: "360° müştəri görüntüsü — kontaktlar, sövdələşmələr.", icon: Building2, src: "/marketing/companies-list.png", category: "crm" },
  { id: "finance", title: "Maliyyə", description: "Nağd pul axını, balanslar, tranzaksiyalar.", icon: Wallet, src: "/marketing/finance-treasury.png", category: "crm" },
  { id: "reports", title: "Hesabatlar", description: "İnteraktiv qrafiklər və dərin analitika.", icon: BarChart3, src: "/marketing/reports-analytics.png", category: "crm" },
  { id: "invoices", title: "Fakturalar", description: "Yaratma, göndərmə, ödəniş izləmə, PDF.", icon: FileText, src: "/marketing/invoices-billing.png", category: "crm" },
  { id: "campaigns", title: "Kampaniyalar", description: "Marşrut qurucusu və kampaniya ROI.", icon: Megaphone, src: "/marketing/marketing-campaigns.png", category: "crm" },
  { id: "support", title: "Service Desk", description: "SLA, prioritet idarəsi, bilik bazası.", icon: Headphones, src: "/marketing/support-tickets.png", category: "crm" },
  { id: "agent-desktop", title: "Agent Masaüstü", description: "Tiketlər, tarixçə, AI tövsiyələr bir yerdə.", icon: Monitor, src: "/marketing/agent-desktop.png", category: "crm" },
  { id: "events", title: "Tədbirlər", description: "Planlaşdırma, dəvətnamə, iştirakçı izləmə.", icon: CalendarDays, src: "/marketing/events-management.png", category: "crm" },
]

export default function DemoPage() {
  const [active, setActive] = useState(0)
  const [filter, setFilter] = useState<"all" | "ai" | "crm">("all")

  const filtered = filter === "all"
    ? screenshots
    : screenshots.filter((s) => s.category === filter)

  const currentFiltered = filtered[active] || filtered[0]
  const Icon = currentFiltered.icon

  return (
    <div>
      {/* Hero with form */}
      <section className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-20 overflow-hidden">
        <Particles className="absolute inset-0" quantity={50} color="#8b5cf6" size={0.4} staticity={40} ease={80} />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px]" />

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="stagger-children">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Canlı demo
                </span>
              </div>
              <h1 className="mt-6 text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                LeadDrive CRM-i{" "}
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  kəşf edin
                </span>
              </h1>
              <p className="mt-4 text-lg text-slate-400 leading-relaxed">
                20+ modulu interaktiv şəkildə araşdırın. 9 AI funksiya + 11 CRM modulu — hər ekran real məhsuldan.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "30 dəqiqəlik canlı demo sessiyası",
                  "Sizin sektora uyğunlaşdırılmış ssenari",
                  "Texniki suallar üçün mühəndis iştirakı",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 lg:p-8">
                <h2 className="text-lg font-semibold text-white mb-1">Demo tələb et</h2>
                <p className="text-sm text-slate-500 mb-6">Formu doldurun, 24 saat ərzində əlaqə saxlayacağıq.</p>
                <DemoRequestForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Gallery */}
      <section className="bg-slate-950 py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-white">
              Məhsul qalereyası
            </h2>
            <p className="mt-3 text-slate-400">Real ekranlar — real funksionallıq.</p>
          </AnimateIn>

          {/* Category filter */}
          <div className="flex justify-center gap-2 mb-6">
            {[
              { key: "all" as const, label: "Hamısı (20)" },
              { key: "ai" as const, label: "AI Funksiyalar (9)" },
              { key: "crm" as const, label: "CRM Modulları (11)" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setActive(0) }}
                className={cn(
                  "px-5 py-2.5 rounded-full text-sm font-medium transition-all",
                  filter === f.key
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                    : "text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tab navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {filtered.map((s, i) => {
              const TabIcon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all",
                    i === active
                      ? "bg-violet-600/20 text-violet-300 border border-violet-500/40"
                      : "text-slate-600 hover:text-slate-400 border border-transparent hover:bg-slate-800/30"
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              )
            })}
          </div>

          {/* Screenshot viewer */}
          <div key={currentFiltered.id} className="animate-fade-in-up">
            {/* Info bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Icon className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{currentFiltered.title}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{currentFiltered.description}</p>
              </div>
            </div>

            {/* Browser frame */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-violet-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/80">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-6">
                  <div className="bg-slate-800 rounded-md px-3 py-0.5 text-[11px] text-slate-500 border border-slate-700 max-w-xs mx-auto text-center">
                    app.leaddrivecrm.org
                  </div>
                </div>
              </div>
              <img
                src={currentFiltered.src}
                alt={currentFiltered.title}
                className="w-full"
                loading="lazy"
              />
            </div>

            {/* Prev/Next */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setActive((active - 1 + filtered.length) % filtered.length)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white border border-slate-800 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Əvvəlki
              </button>
              <span className="text-sm text-slate-600">
                {active + 1} / {filtered.length}
              </span>
              <button
                onClick={() => setActive((active + 1) % filtered.length)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white border border-slate-800 rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                Növbəti
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 py-16 overflow-hidden">
        <Particles className="absolute inset-0" quantity={30} color="#8b5cf6" size={0.3} staticity={50} ease={80} />
        <div className="relative mx-auto max-w-4xl px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Hazırsınız?{" "}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Başlayaq.</span>
          </h2>
          <p className="mt-3 text-slate-400">14 günlük pulsuz sınaq. Kredit kartı tələb olunmur.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all"
            >
              Pulsuz sınaq başlat
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-6 py-3.5 text-base font-semibold text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all"
            >
              Qiymətlərə bax
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
