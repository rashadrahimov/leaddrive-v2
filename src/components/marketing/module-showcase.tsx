"use client"

import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Target, Megaphone, Inbox, Headphones, TrendingUp,
  Brain, Briefcase, Settings, FolderKanban, Mail,
  ShieldCheck, Users, Gauge, FileText, MessageSquare,
  Bot, Sparkles, Zap, PieChart, BarChart3,
  CalendarDays, Route, Globe, BookOpen, Receipt,
  ArrowRight, ChevronRight,
} from "lucide-react"

/* ─── Module data ─── */
const modules = [
  {
    id: "crm",
    tag: "CRM & SATIŞ",
    tagColor: "text-violet-400",
    headline: "Liddən sövdələşməyə — tam satış dövrü",
    description: "Sürükle-burax Kanban pipeline, AI lid skorinqi, şirkət və kontakt profili, təkliflər və müqavilələr — satış komandanız üçün lazım olan hər şey bir platformada.",
    features: [
      "Pipeline vizuallaşdırması — sürükle-burax Kanban lövhəsi",
      "AI lid skorinqi — avtomatik A–F dərəcələndirmə",
      "360° şirkət və kontakt profili",
      "Təkliflər, müqavilələr və məhsul kataloqu",
      "AI Next Best Action tövsiyələri",
      "Avtomatik tapşırıq və iş axınları",
    ],
    screenshots: [
      { src: "/marketing/deals-pipeline.png", alt: "Satış Pipeline" },
      { src: "/marketing/ai-lead-scoring.png", alt: "AI Lid Skorinqi" },
    ],
  },
  {
    id: "marketing",
    tag: "MARKETİNQ",
    tagColor: "text-pink-400",
    headline: "Kampaniyalar, seqmentlər, ROI — hər şey ölçülür",
    description: "E-poçt kampaniyaları, vizual marşrut qurucusu, dinamik seqmentasiya, tədbirlər idarəsi — marketinqi avtomatlaşdırın və hər kampaniyanın ROI-nu izləyin.",
    features: [
      "E-poçt kampaniya meneceri — göndərmə, açılma, klik izləmə",
      "Marşrut qurucusu — vizual çoxaddımlı avtomatlaşdırma",
      "Müştəri seqmentasiyası — davranış əsaslı",
      "Kampaniya ROI hesabatları — real vaxtda",
      "Tədbirlər idarəsi — planlaşdırma, qeydiyyat, iştirak",
      "E-poçt şablonları kitabxanası",
    ],
    screenshots: [
      { src: "/marketing/marketing-campaigns.png", alt: "Kampaniyalar" },
      { src: "/marketing/events-management.png", alt: "Tədbirlər" },
    ],
  },
  {
    id: "inbox",
    tag: "7 KANALLI GƏLƏN QUTUSU",
    tagColor: "text-cyan-400",
    headline: "7 kanal — bir qutu. Heç bir mesaj itirilmir",
    description: "E-poçt, SMS, Telegram, WhatsApp, Facebook, Instagram, VK — bütün söhbətlər hər kontakt üzrə bir vahid gələn qutusunda birləşir. AI real vaxtda cavab təklif edir.",
    features: [
      "7 kanal — bir vahid gələn qutusu",
      "AI avtomatik cavab təklifləri",
      "Agent masaüstü — real vaxt KPI-lər",
      "Mesajdan tiketə bir kliklə çevirmə",
      "Kontakt tarixçəsi — bütün kanallar bir yerdə",
      "SMTP, WhatsApp Cloud API, Telegram Bot inteqrasiyası",
    ],
    screenshots: [
      { src: "/marketing/inbox-channels.png", alt: "Vahid Gələn Qutusu" },
      { src: "/marketing/agent-desktop.png", alt: "Agent Desktop" },
    ],
  },
  {
    id: "support",
    tag: "DƏSTƏK & TİKETLƏR",
    tagColor: "text-emerald-400",
    headline: "SLA, AI cavab, bilik bazası — tam helpdesk",
    description: "Tiket idarəsi, SLA siyasətləri, AI avtomatik cavablar, bilik bazası və müştəri özünə-xidmət portalı. Maestro AI tiketi oxuyur, bilik bazasından cavab tapır.",
    features: [
      "Tiket idarəsi — prioritet, status, kateqoriya",
      "SLA siyasətləri — avtomatik eskalasiya",
      "AI dəstək agenti — bilik bazasından avtomatik cavab",
      "Agent KPI-ləri və CSAT reytinqi",
      "Müştəri portalı — özünə-xidmət + AI söhbət",
      "Bilik bazası (Knowledge Base)",
    ],
    screenshots: [
      { src: "/marketing/support-tickets.png", alt: "Tiketlər" },
      { src: "/marketing/ai-ticket-detail.png", alt: "AI Tiket Cavabı" },
    ],
  },
  {
    id: "finance",
    tag: "MALİYYƏ & ANALİTİKA",
    tagColor: "text-amber-400",
    headline: "Gəlirliliyi görün — hər müştəri, hər xidmət üzrə",
    description: "Daxili xərc modeli mühərriki 18 kateqoriyada xərcləri izləyir. Büdcələşdirmə, P&L, dinamik qiymətləndirmə — daxili CFO kimi işləyir. Rəqiblərin heç birində yoxdur.",
    features: [
      "Xərc modeli mühərriki — 18 kateqoriyada bölgü",
      "Büdcələşdirmə & P&L — plan vs fakt, icra faizi",
      "Fakturalar və ödəniş izləməsi",
      "Dinamik qiymətləndirmə mühərriki",
      "Müştəri gəlirlilik analizi",
      "AI maliyyə narrativi və proqnoz",
    ],
    screenshots: [
      { src: "/marketing/analytics-profitability.png", alt: "Gəlirlilik Analizi" },
      { src: "/marketing/budgeting-pnl.png", alt: "Büdcələşdirmə & P&L" },
    ],
  },
  {
    id: "erp",
    tag: "ERP & LAYİHƏLƏR",
    tagColor: "text-blue-400",
    headline: "Layihələr, komandalar, büdcə — tam nəzarət",
    description: "Layihə mərhələləri, komanda üzvləri bölgüsü, büdcə izləməsi, tamamlanma analitikası. Hər layihə müştəri sövdələşməsinə bağlıdır — CRM gəlirlilik mühərriki ilə inteqrasiya.",
    features: [
      "Layihə mərhələləri — vizual progress izləmə",
      "Komanda üzvləri bölgüsü və rol idarəsi",
      "Büdcə vs aktual izləmə — real vaxtda",
      "Tapşırıq idarəsi — prioritet, deadline, icraçı",
      "Tamamlanma % göstəricisi",
      "CRM sövdələşmə inteqrasiyası",
    ],
    screenshots: [
      { src: "/marketing/erp-projects.png", alt: "Layihələr" },
      { src: "/marketing/tasks-management.png", alt: "Tapşırıqlar" },
    ],
  },
  {
    id: "platform",
    tag: "PLATFORMA",
    tagColor: "text-slate-300",
    headline: "Korporativ konfiqurasiya — hər şey uyğunlaşdırılır",
    description: "Rollar, iş axınları, xüsusi sahələr, audit jurnalı, çox dilli, Web-to-Lead, API — Enterprise SaaS arxitekturası. Multi-tenant izolyasiya — hər təşkilat tam izolə edilmiş mühitdə işləyir.",
    features: [
      "Rollar və icazə sistemi — dəqiq hüquq nəzarəti",
      "İş axını avtomatlaşdırması — trigger → action",
      "Xüsusi sahələr — istənilən modulda əlavə edin",
      "Audit jurnalı — hər dəyişiklik qeydə alınır",
      "Çox dilli platforma (AZ/RU/EN)",
      "Web-to-Lead forma inteqrasiyası və API",
    ],
    screenshots: [
      { src: "/marketing/platform-settings.png", alt: "Parametrlər" },
      { src: "/marketing/companies-list.png", alt: "Şirkətlər" },
    ],
  },
  {
    id: "ai",
    tag: "MAESTRO AI",
    tagColor: "text-violet-300",
    headline: "16 AI inteqrasiya. CRM-in beyni",
    description: "Daxili Claude inteqrasiyası — lid skorinqi, e-poçt yaratma, tiket cavabı, gəlirlilik proqnozu, sentiment analizi. AI hər modulun içindədir — əlavə deyil, əsasdır.",
    features: [
      "Lid skorinqi — avtomatik A–F dərəcələndirmə",
      "AI e-poçt generasiyası — bir kliklə peşəkar mesaj",
      "AI müştəri xidməti agenti — avtomatik cavab",
      "Hiss təhlili (sentiment analysis)",
      "AI gəlirlilik proqnozu və narrativ",
      "AI bilik bazası axtarışı — semantik",
    ],
    screenshots: [
      { src: "/marketing/ai-assistant-panel.png", alt: "AI Köməkçi" },
      { src: "/marketing/ai-lead-detail.png", alt: "AI Lid Analizi" },
    ],
  },
]

/* ─── Single module section (Creatio-style) ─── */
function ModuleSection({ mod, index }: { mod: typeof modules[0]; index: number }) {
  const isReversed = index % 2 !== 0

  return (
    <AnimateIn>
      <div className={cn(
        "grid lg:grid-cols-2 gap-10 lg:gap-16 items-center",
        index > 0 && "mt-24 lg:mt-32 pt-24 lg:pt-32 border-t border-slate-800/40"
      )}>
        {/* TEXT SIDE */}
        <div className={cn(isReversed && "lg:order-2")}>
          {/* Tag */}
          <span className={cn("text-xs font-bold tracking-[0.2em] uppercase", mod.tagColor)}>
            {mod.tag}
          </span>

          {/* Headline */}
          <h3 className="mt-4 text-3xl lg:text-4xl font-bold text-white leading-tight">
            {mod.headline}
          </h3>

          {/* Description */}
          <p className="mt-4 text-base text-slate-400 leading-relaxed">
            {mod.description}
          </p>

          {/* Features list — arrow style like Creatio */}
          <ul className="mt-6 space-y-3">
            {mod.features.map((feat) => (
              <li key={feat} className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed">
                <ChevronRight className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/demo"
            className="mt-8 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Demo istəyin
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* SCREENSHOTS SIDE — 2 large screenshots stacked */}
        <div className={cn("space-y-4", isReversed && "lg:order-1")}>
          {mod.screenshots.map((ss) => (
            <div key={ss.src} className="rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/30">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border-b border-slate-700/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 mx-6">
                  <div className="bg-slate-700/60 rounded-md px-3 py-1 text-[10px] text-slate-400 max-w-[240px] mx-auto text-center">
                    app.leaddrivecrm.org/{mod.id}
                  </div>
                </div>
              </div>
              {/* Screenshot */}
              <img
                src={ss.src}
                alt={ss.alt}
                className="w-full block"
                loading={index < 2 ? "eager" : "lazy"}
              />
              {/* Caption */}
              <div className="px-4 py-2 bg-slate-800/80 border-t border-slate-700/50">
                <span className="text-xs text-slate-400">{ss.alt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimateIn>
  )
}

/* ─── Main export ─── */
export function ModuleShowcase() {
  return (
    <SectionWrapper id="modules" variant="dark">
      <AnimateIn className="text-center mb-16 lg:mb-24">
        <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
          <span className="text-white">128 funksiya. </span>
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Bir platforma.</span>
        </h2>
        <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto">
          Satış, marketinq, dəstək, maliyyə və AI — hamısı eyni ekosistemda. Aşağı sürüşdürün və kəşf edin.
        </p>
      </AnimateIn>

      {modules.map((mod, i) => (
        <ModuleSection key={mod.id} mod={mod} index={i} />
      ))}
    </SectionWrapper>
  )
}
