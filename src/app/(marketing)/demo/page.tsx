"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import {
  ArrowRight, LayoutDashboard, Handshake, Building2, LineChart,
  Calculator, Inbox, Megaphone, Headphones, Briefcase, Settings,
  ChevronLeft, ChevronRight,
} from "lucide-react"

const screenshots = [
  {
    id: "dashboard",
    title: "İdarə paneli",
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
    id: "companies",
    title: "Şirkətlər",
    description: "360° müştəri görüntüsü: kontaktlar, sövdələşmələr, fakturalar, fəaliyyət xətti və gəlirlilik — hər şey bir kartda.",
    icon: Building2,
    src: "/marketing/companies-list.png",
  },
  {
    id: "profitability",
    title: "Gəlirlilik təhlili",
    description: "Xərc modeli mühərriki hər müştəri və xidmət üzrə real marjanı göstərir. 18 xərc kateqoriyası, süni intellekt təhlilləri.",
    icon: LineChart,
    src: "/marketing/analytics-profitability.png",
  },
  {
    id: "budgeting",
    title: "Büdcələşdirmə və P&L",
    description: "Plan vs Fakt matriksi, kassa proqnozu, waterfall təhlili, versiya müqayisəsi və CFO səviyyəsində süni intellekt şərhləri.",
    icon: Calculator,
    src: "/marketing/budgeting-pnl.png",
  },
  {
    id: "inbox",
    title: "7 kanallı gələn qutusu",
    description: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — bütün mesajlar bir vahid gələn qutusunda.",
    icon: Inbox,
    src: "/marketing/inbox-channels.png",
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
    title: "Dəstək və Tiketlər",
    description: "SLA siyasətləri, prioritet idarəsi, agent iş masası, bilik bazası və müştəri portalı.",
    icon: Headphones,
    src: "/marketing/support-tickets.png",
  },
  {
    id: "projects",
    title: "Layihələr (ERP)",
    description: "Mərhələlər, komanda üzvləri, büdcə izləməsi və tamamlanma faizi ilə layihə idarəsi.",
    icon: Briefcase,
    src: "/marketing/erp-projects.png",
  },
  {
    id: "settings",
    title: "Platforma parametrləri",
    description: "Rollar, iş axınları, xüsusi sahələr, valyutalar, audit jurnalı, API, webhooklar — tam konfiqurasiya.",
    icon: Settings,
    src: "/marketing/platform-settings.png",
  },
]

export default function DemoPage() {
  const [active, setActive] = useState(0)
  const current = screenshots[active]
  const Icon = current.icon

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
            10 əsas modulu interaktiv şəkildə araşdırın. Hər ekran real məhsuldan götürülüb.
          </motion.p>
        </div>
      </section>

      {/* Gallery */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {/* Tab navigation */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {screenshots.map((s, i) => {
              const TabIcon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    i === active
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
                  onClick={() => setActive((active - 1 + screenshots.length) % screenshots.length)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-slate-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Əvvəlki
                </button>
                <span className="text-sm text-gray-400">{active + 1} / {screenshots.length}</span>
                <button
                  onClick={() => setActive((active + 1) % screenshots.length)}
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
              href="/pricing"
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
