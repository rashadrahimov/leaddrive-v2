"use client"

import { useState, useEffect } from "react"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"
import {
  Target, Megaphone, Inbox, Headphones, TrendingUp,
  Brain, BarChart3, FolderKanban, Mail, ShieldCheck,
  Users, Gauge, FileText, MessageSquare, Bot,
  Sparkles, Zap, PieChart, Briefcase, Settings,
  CalendarDays, Route, Globe, BookOpen, Receipt,
} from "lucide-react"

const modules = [
  {
    id: "crm",
    label: "CRM & Satış",
    icon: Target,
    screenshot: "/marketing/deals-pipeline.png",
    url: "deals",
    description: "Liddən sövdələşmənin bağlanmasına qədər tam satış dövrü.",
    features: [
      { icon: FolderKanban, text: "Pipeline — sürükle-burax Kanban lövhəsi" },
      { icon: Users, text: "Şirkət və kontakt idarəsi" },
      { icon: Gauge, text: "Lid skorinqi A–F (AI ilə)" },
      { icon: FileText, text: "Təkliflər, müqavilələr, məhsullar" },
      { icon: Zap, text: "Avtomatik tapşırıq və iş axınları" },
    ],
  },
  {
    id: "marketing",
    label: "Marketinq",
    icon: Megaphone,
    screenshot: "/marketing/marketing-campaigns.png",
    url: "campaigns",
    description: "Kampaniya yaradın, seqmentləyin, ROI-ni izləyin.",
    features: [
      { icon: Mail, text: "E-poçt kampaniya meneceri" },
      { icon: Users, text: "Müştəri seqmentasiyası" },
      { icon: Route, text: "Marşrut qurucusu (journey builder)" },
      { icon: BarChart3, text: "Kampaniya ROI hesabatları" },
      { icon: FileText, text: "E-poçt şablonları kitabxanası" },
    ],
  },
  {
    id: "inbox",
    label: "7 Kanal Inbox",
    icon: Inbox,
    screenshot: "/marketing/inbox-channels.png",
    url: "inbox",
    description: "WhatsApp, Telegram, E-poçt, SMS — vahid gələn qutusu.",
    features: [
      { icon: MessageSquare, text: "7 kanal — bir qutu" },
      { icon: Bot, text: "AI avtomatik cavablar" },
      { icon: Users, text: "Agent masaüstü — real vaxt" },
      { icon: Zap, text: "Tiketə avtomatik çevirmə" },
      { icon: ShieldCheck, text: "SMTP / WhatsApp Cloud API" },
    ],
  },
  {
    id: "support",
    label: "Dəstək",
    icon: Headphones,
    screenshot: "/marketing/support-tickets.png",
    url: "tickets",
    description: "SLA, tiketlər, bilik bazası, müştəri portalı.",
    features: [
      { icon: FileText, text: "Tiket idarəsi və SLA siyasətləri" },
      { icon: Bot, text: "AI dəstək agenti — avtomatik həll" },
      { icon: Sparkles, text: "Müştəri portalı + AI söhbət" },
      { icon: BarChart3, text: "Cavab vaxtı analitikası" },
      { icon: BookOpen, text: "Bilik bazası (Knowledge Base)" },
    ],
  },
  {
    id: "finance",
    label: "Maliyyə",
    icon: TrendingUp,
    screenshot: "/marketing/analytics-profitability.png",
    url: "profitability",
    description: "Xərc modeli, büdcə, P&L, gəlirlilik — real marjalar.",
    features: [
      { icon: PieChart, text: "Xərc modeli mühərriki" },
      { icon: BarChart3, text: "Büdcələşdirmə & P&L" },
      { icon: Receipt, text: "Faktura və ödəniş izləməsi" },
      { icon: TrendingUp, text: "Dinamik qiymətləndirmə" },
      { icon: Gauge, text: "Layihə gəlirlilik analizi" },
    ],
  },
  {
    id: "erp",
    label: "ERP & Layihələr",
    icon: Briefcase,
    screenshot: "/marketing/erp-projects.png",
    url: "projects",
    description: "Layihələr, komandalar, büdcə bölgüsü və tamamlanma.",
    features: [
      { icon: FolderKanban, text: "Layihə mərhələləri" },
      { icon: Users, text: "Komanda üzvləri bölgüsü" },
      { icon: CalendarDays, text: "Təqvim və vaxt izləməsi" },
      { icon: BarChart3, text: "Büdcə vs aktual izləmə" },
      { icon: Gauge, text: "Tamamlanma % göstəricisi" },
    ],
  },
  {
    id: "platform",
    label: "Platforma",
    icon: Settings,
    screenshot: "/marketing/platform-settings.png",
    url: "settings",
    description: "Rollar, iş axınları, xüsusi sahələr, audit jurnalı.",
    features: [
      { icon: ShieldCheck, text: "Rollar və icazə sistemi" },
      { icon: Zap, text: "İş axını avtomatlaşdırması" },
      { icon: Globe, text: "Çox dilli platforma (AZ/RU/EN)" },
      { icon: FileText, text: "Audit jurnalı" },
      { icon: Settings, text: "Xüsusi sahələr və Web-to-Lead" },
    ],
  },
  {
    id: "ai",
    label: "Maestro AI",
    icon: Brain,
    screenshot: "/marketing/ai-command-center.png",
    url: "ai",
    description: "16 AI inteqrasiyası. CRM-in beyni.",
    features: [
      { icon: Gauge, text: "Lid skorinqi — avtomatik A–F" },
      { icon: Mail, text: "AI e-poçt generasiyası" },
      { icon: Bot, text: "AI müştəri xidməti agenti" },
      { icon: Sparkles, text: "Hiss təhlili (sentiment)" },
      { icon: BarChart3, text: "AI gəlirlilik proqnozu" },
    ],
  },
]

export function ModuleShowcase() {
  const [activeModule, setActiveModule] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(true)
  const active = modules[activeModule]
  const ActiveIcon = active.icon

  // Preload adjacent module screenshots
  useEffect(() => {
    const preloadIndexes = [
      (activeModule + 1) % modules.length,
      (activeModule - 1 + modules.length) % modules.length,
    ]
    preloadIndexes.forEach((idx) => {
      const img = new Image()
      img.src = modules[idx].screenshot
    })
  }, [activeModule])

  const handleModuleChange = (i: number) => {
    if (i === activeModule) return
    setImageLoaded(false)
    setActiveModule(i)
  }

  return (
    <SectionWrapper id="modules" variant="dark">
      <AnimateIn className="text-center mb-14">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
          <span className="text-white">128 funksiya. </span>
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Bir platforma.</span>
        </h2>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Satış, marketinq, dəstək, maliyyə və AI — hamısı eyni ekosistemda.
        </p>
      </AnimateIn>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6 lg:gap-8">
        {/* Left: Module tabs */}
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-thin">
          {modules.map((mod, i) => {
            const Icon = mod.icon
            const isActive = activeModule === i
            const isAi = mod.id === "ai"

            return (
              <button
                key={mod.id}
                onClick={() => handleModuleChange(i)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all whitespace-nowrap lg:whitespace-normal min-w-fit",
                  isActive
                    ? isAi
                      ? "bg-gradient-to-r from-violet-600/20 to-cyan-600/10 border border-violet-500/40 text-white shadow-lg shadow-violet-500/10"
                      : "bg-slate-800/80 border border-slate-700 text-white"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 border border-transparent"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive
                    ? isAi ? "text-violet-400" : "text-cyan-400"
                    : "text-slate-600"
                )} />
                {mod.label}
              </button>
            )
          })}
        </div>

        {/* Right: Screenshot + features */}
        <div className="relative">
          <div key={active.id} className="space-y-6 animate-fade-in-up">
            {/* Module description */}
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                active.id === "ai" ? "bg-violet-500/20" : "bg-slate-800"
              )}>
                <ActiveIcon className={cn(
                  "h-5 w-5",
                  active.id === "ai" ? "text-violet-400" : "text-cyan-400"
                )} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{active.label}</h3>
                <p className="text-sm text-slate-400">{active.description}</p>
              </div>
            </div>

            {/* Screenshot */}
            <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-violet-500/5 overflow-hidden group">
              {active.id === "ai" && <BorderBeam size={400} duration={10} colorFrom="#8b5cf6" colorTo="#06b6d4" />}

              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/80">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 mx-6">
                  <div className="bg-slate-800 rounded-md px-3 py-0.5 text-[11px] text-slate-500 border border-slate-700 max-w-xs mx-auto text-center">
                    app.leaddrivecrm.org/{active.url}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden relative">
                {/* Loading skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 animate-pulse" />
                      <div className="w-32 h-3 rounded bg-slate-700 animate-pulse" />
                    </div>
                  </div>
                )}
                <img
                  src={active.screenshot}
                  alt={`LeadDrive ${active.label}`}
                  className={cn(
                    "w-full transition-all duration-500 group-hover:scale-[1.02]",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                />
              </div>
            </div>

            {/* Feature pills */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {active.features.map((feat) => {
                const FeatIcon = feat.icon
                return (
                  <div
                    key={feat.text}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm hover:border-slate-700 card-hover"
                  >
                    <FeatIcon className="h-4 w-4 text-violet-400 flex-shrink-0" />
                    <span className="text-slate-300">{feat.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
