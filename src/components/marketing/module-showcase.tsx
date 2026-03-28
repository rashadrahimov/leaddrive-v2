"use client"

import { useState } from "react"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"
import {
  Target, Megaphone, Inbox, Headphones, TrendingUp,
  Brain, BarChart3, FolderKanban, Mail, ShieldCheck,
  Users, Gauge, FileText, MessageSquare, Bot,
  Sparkles, Zap, PieChart
} from "lucide-react"

const modules = [
  {
    id: "crm",
    label: "CRM & Satış",
    icon: Target,
    screenshot: "/marketing/deals-pipeline.png",
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
    description: "Kampaniya yaradın, seqmentləyin, ROI-ni izləyin.",
    features: [
      { icon: Mail, text: "E-poçt kampaniya meneceri" },
      { icon: Users, text: "Müştəri seqmentasiyası" },
      { icon: Zap, text: "Marşrut qurucusu (journey builder)" },
      { icon: BarChart3, text: "Kampaniya ROI hesabatları" },
      { icon: FileText, text: "E-poçt şablonları kitabxanası" },
    ],
  },
  {
    id: "inbox",
    label: "7 Kanal Inbox",
    icon: Inbox,
    screenshot: "/marketing/inbox-channels.png",
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
    description: "SLA, tiketlər, bilik bazası, müştəri portalı.",
    features: [
      { icon: FileText, text: "Tiket idarəsi və SLA siyasətləri" },
      { icon: Bot, text: "AI dəstək agenti — avtomatik həll" },
      { icon: Sparkles, text: "Müştəri portalı + AI söhbət" },
      { icon: BarChart3, text: "Cavab vaxtı analitikası" },
      { icon: Users, text: "Bilik bazası (Knowledge Base)" },
    ],
  },
  {
    id: "finance",
    label: "Maliyyə",
    icon: TrendingUp,
    screenshot: "/marketing/analytics-profitability.png",
    description: "Xərc modeli, büdcə, P&L, gəlirlilik — real marjalar.",
    features: [
      { icon: PieChart, text: "Xərc modeli mühərriki" },
      { icon: BarChart3, text: "Büdcələşdirmə & P&L" },
      { icon: FileText, text: "Faktura və ödəniş izləməsi" },
      { icon: TrendingUp, text: "Dinamik qiymətləndirmə" },
      { icon: Gauge, text: "Layihə gəlirlilik analizi" },
    ],
  },
  {
    id: "ai",
    label: "Maestro AI",
    icon: Brain,
    screenshot: "/marketing/ai-command-center.png",
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
  const active = modules[activeModule]
  const ActiveIcon = active.icon

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
                onClick={() => setActiveModule(i)}
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
            <div className="relative rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl shadow-violet-500/5 overflow-hidden">
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
                    app.leaddrivecrm.org/{active.id}
                  </div>
                </div>
              </div>

              <img
                src={active.screenshot}
                alt={`LeadDrive ${active.label}`}
                className="w-full"
                loading="lazy"
              />
            </div>

            {/* Feature pills */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {active.features.map((feat) => {
                const FeatIcon = feat.icon
                return (
                  <div
                    key={feat.text}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm"
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
