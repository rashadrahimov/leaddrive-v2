"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import {
  ArrowRight, LayoutDashboard, Handshake, Building2,
  Calculator, Inbox, Megaphone, Headphones, Briefcase, Settings,
  ChevronLeft, ChevronRight,
  Brain, Mail, BarChart3, TrendingUp, Users, Wallet,
  FileText, CalendarDays, ClipboardList, Monitor, Sparkles,
} from "lucide-react"

const screenshots = [
  // === AI (первые 9) ===
  {
    id: "ai-scoring",
    title: "AI Lid Reytinqi",
    description: "Süni intellekt hər lidi A-dan F-ə qədər qiymətləndirir. Davranış, büdcə və uyğunluq əsasında avtomatik bal hesablayır.",
    icon: Brain,
    src: "/marketing/ai-lead-scoring.png",
  },
  {
    id: "ai-email",
    title: "AI Mətn Generasiyası",
    description: "Claude ilə peşəkar e-poçt və mesaj yaradın — ton, mətn növü seçin, bir kliklə göndərin. WhatsApp, Telegram və e-poçt dəstəyi.",
    icon: Mail,
    src: "/marketing/ai-email-generation.png",
  },
  {
    id: "ai-deal",
    title: "AI Sövdələşmə Təhlili",
    description: "Hər sövdələşmə üçün Next Best Offers — süni intellekt ən uyğun məhsul və xidmətləri tövsiyə edir.",
    icon: Sparkles,
    src: "/marketing/ai-deal-detail.png",
  },
  {
    id: "ai-ticket",
    title: "AI Tiket Cavabı",
    description: "Dəstək tiketlərinə avtomatik cavab, xülasə və həll addımları — süni intellekt agentin işini 3x sürətləndirir.",
    icon: Headphones,
    src: "/marketing/ai-ticket-detail.png",
  },
  {
    id: "ai-lead",
    title: "AI Lid Detalları",
    description: "Lidlər haqqında dərin təhlil: AI sentiment, tapşırıqlar, skorinq və şəxsiyyətləşdirilmiş e-poçt generasiyası bir ekranda.",
    icon: Users,
    src: "/marketing/ai-lead-detail.png",
  },
  {
    id: "ai-contact",
    title: "AI Kontakt Profili",
    description: "Hər kontakt üçün AI analiz — əlaqə tarixçəsi, şirkət məlumatları, sövdələşmə tarixçəsi və növbəti addım tövsiyəsi.",
    icon: Users,
    src: "/marketing/ai-contact-detail.png",
  },
  {
    id: "ai-profitability",
    title: "AI Gəlirlilik Təhlili",
    description: "Süni intellekt gəlirlilik göstəricilərini təhlil edir, trendləri müəyyən edir və optimallaşdırma təklifləri verir.",
    icon: TrendingUp,
    src: "/marketing/ai-profitability.png",
  },
  {
    id: "ai-budgeting",
    title: "AI Büdcə Narrativi",
    description: "CFO səviyyəsində büdcə şərhləri — plan vs fakt, sapma analizi və proqnoz avtomatik yaradılır.",
    icon: Calculator,
    src: "/marketing/ai-budgeting.png",
  },
  {
    id: "ai-assistant",
    title: "AI Köməkçi Panel",
    description: "İstənilən səhifədə üzən AI köməkçi — suallarınıza cavab verir, məlumat axtarır, hərəkətlər təklif edir.",
    icon: Sparkles,
    src: "/marketing/ai-assistant-panel.png",
  },
  // === CRM (11 modul) ===
  {
    id: "dashboard",
    title: "İdarə Paneli",
    description: "Real vaxt KPI-lər, gəlir qrafikləri, pipeline funnel, ən son sövdələşmələr və tapşırıqlar — hamısı bir ekranda.",
    icon: LayoutDashboard,
    src: "/marketing/crm-dashboard.png",
  },
  {
    id: "deals",
    title: "Sövdələşmələr və Pipeline",
    description: "Kanban lövhəsi ilə vizual pipeline idarəsi. Sövdələşmələri sürükləyin, mərhələləri izləyin, KPI kartları ilə performansı ölçün.",
    icon: Handshake,
    src: "/marketing/deals-pipeline.png",
  },
  {
    id: "inbox",
    title: "7 Kanallı Gələn Qutusu",
    description: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — bütün mesajlar bir vahid gələn qutusunda. AI avtomatik cavab.",
    icon: Inbox,
    src: "/marketing/inbox-channels.png",
  },
  {
    id: "companies",
    title: "Şirkətlər",
    description: "360° müştəri görüntüsü: kontaktlar, sövdələşmələr, fakturalar, fəaliyyət xətti və gəlirlilik — hər şey bir kartda.",
    icon: Building2,
    src: "/marketing/companies-list.png",
  },
  {
    id: "finance",
    title: "Maliyyə və Xəzinə",
    description: "Nağd pul axını, hesab balansları, tranzaksiya tarixçəsi və maliyyə proqnozu — tam xəzinə idarəsi.",
    icon: Wallet,
    src: "/marketing/finance-treasury.png",
  },
  {
    id: "reports",
    title: "Hesabatlar və Analitika",
    description: "Satış performansı, kampaniya ROI, müştəri davranışı — interaktiv qrafiklər və cədvəllər ilə dərin analitika.",
    icon: BarChart3,
    src: "/marketing/reports-analytics.png",
  },
  {
    id: "invoices",
    title: "Hesab-fakturalar",
    description: "Faktura yaratma, göndərmə, ödəniş izləmə, PDF ixrac və valyuta dəstəyi ilə tam billing sistemi.",
    icon: FileText,
    src: "/marketing/invoices-billing.png",
  },
  {
    id: "campaigns",
    title: "Kampaniyalar",
    description: "Vizual marşrut qurucusu, e-poçt ardıcıllıqları, seqmentlər və kampaniya ROI izləməsi.",
    icon: Megaphone,
    src: "/marketing/marketing-campaigns.png",
  },
  {
    id: "support",
    title: "Service Desk (SLA)",
    description: "SLA siyasətləri, prioritet idarəsi, agent iş masası, bilik bazası və AI dəstəkli tiket həlli.",
    icon: Headphones,
    src: "/marketing/support-tickets.png",
  },
  {
    id: "agent-desktop",
    title: "Agent Masaüstü",
    description: "Dəstək agentləri üçün birləşdirilmiş iş masası — tiketlər, müştəri tarixçəsi və AI tövsiyələr bir yerdə.",
    icon: Monitor,
    src: "/marketing/agent-desktop.png",
  },
  {
    id: "events",
    title: "Tədbirlər",
    description: "Biznes tədbirlərini planlaşdırın, dəvətnamələr göndərin, iştirakçıları izləyin və təqvimi idarə edin.",
    icon: CalendarDays,
    src: "/marketing/events-management.png",
  },
]

export default function DemoPage() {
  const [active, setActive] = useState(0)
  const [filter, setFilter] = useState<"all" | "ai" | "crm">("all")
  const current = screenshots[active]
  const Icon = current.icon

  const filteredScreenshots = filter === "all"
    ? screenshots
    : filter === "ai"
    ? screenshots.slice(0, 9)
    : screenshots.slice(9)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white via-[hsl(210,30%,97%)] to-white pt-20 pb-12">
        <div className="mx-auto max-w-5xl px-4 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl lg:text-5xl font-bold text-slate-800"
          >
            LeadDrive-ı <span className="text-orange-500">kəşf edin</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto"
          >
            20+ modulu interaktiv şəkildə araşdırın. 9 AI-əsaslı funksiya + 11 əsas CRM modulu — hər ekran real məhsuldan.
          </motion.p>
        </div>
      </section>

      {/* Gallery */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {/* Category filter */}
          <div className="flex justify-center gap-3 mb-6">
            {[
              { key: "all" as const, label: "Hamısı (20)" },
              { key: "ai" as const, label: "🤖 AI Funksiyalar (9)" },
              { key: "crm" as const, label: "📊 CRM Modulları (11)" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setActive(f.key === "crm" ? 9 : 0) }}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  filter === f.key
                    ? "bg-slate-800 text-white shadow-lg"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tab navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {filteredScreenshots.map((s) => {
              const TabIcon = s.icon
              const globalIdx = screenshots.indexOf(s)
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(globalIdx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    globalIdx === active
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{s.title}</span>
                </button>
              )
            })}
          </div>

          {/* Screenshot viewer */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {/* Info bar */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{current.title}</h2>
                  <p className="text-sm text-gray-600 mt-0.5">{current.description}</p>
                </div>
              </div>

              {/* Browser frame */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/60 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-8">
                    <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-xs mx-auto text-center">
                      app.leaddrivecrm.org
                    </div>
                  </div>
                </div>
                <img
                  src={current.src}
                  alt={current.title}
                  className="w-full"
                  loading="lazy"
                />
              </div>

              {/* Prev/Next */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => {
                    const idxInFiltered = filteredScreenshots.indexOf(current)
                    const prev = (idxInFiltered - 1 + filteredScreenshots.length) % filteredScreenshots.length
                    setActive(screenshots.indexOf(filteredScreenshots[prev]))
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-slate-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Əvvəlki
                </button>
                <span className="text-sm text-gray-400">
                  {filteredScreenshots.indexOf(current) + 1} / {filteredScreenshots.length}
                </span>
                <button
                  onClick={() => {
                    const idxInFiltered = filteredScreenshots.indexOf(current)
                    const next = (idxInFiltered + 1) % filteredScreenshots.length
                    setActive(screenshots.indexOf(filteredScreenshots[next]))
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-slate-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Növbəti
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#F97316] to-[#FACC15] py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Hazırsınız?</h2>
          <p className="mt-3 text-white/80">14 günlük pulsuz sınaq. Kredit kartı tələb olunmur.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <ShimmerButton
                background="rgba(255,255,255,0.15)"
                shimmerColor="rgba(255,255,255,0.4)"
                borderRadius="10px"
                className="text-base font-semibold px-8 py-3.5 border-white/30"
              >
                Pulsuz sınaq başlat
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-[10px] hover:bg-white/10 transition-all"
            >
              Qiymətlərə bax
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
