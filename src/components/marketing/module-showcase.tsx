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
  ArrowRight, ChevronRight, Phone, Clock, Bell,
  Send, CheckCircle2, AlertTriangle, Smartphone,
} from "lucide-react"

/* ─── Module data ─── */
const modules = [
  {
    id: "crm",
    tag: "CRM & SATIŞ",
    tagColor: "text-orange-600",
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
      { src: "/marketing/deals-pipeline.png", alt: "Satış Pipeline — Kanban görünüşü" },
      { src: "/marketing/ai-deal-detail.png", alt: "Sövdələşmə kartı — detallı baxış" },
    ],
  },
  {
    id: "marketing",
    tag: "MARKETİNQ",
    tagColor: "text-red-500",
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
      { src: "/marketing/marketing-campaigns.png", alt: "Kampaniyalar — göndərmə və izləmə" },
      { src: "/marketing/ai-lead-scoring.png", alt: "Kampaniya nəticəsi — lid konversiyası" },
    ],
  },
  {
    id: "inbox",
    tag: "7 KANALLI GƏLƏN QUTUSU",
    tagColor: "text-orange-500",
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
    screenshots: [],
    customVisual: "inbox",
  },
  {
    id: "support",
    tag: "TEXNİKİ DƏSTƏK",
    tagColor: "text-red-600",
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
      { src: "/marketing/ai-ticket-detail.png", alt: "Tiket — AI cavab və SLA izləmə" },
    ],
    customVisual: "support",
  },
  {
    id: "finance",
    tag: "MALİYYƏ & ANALİTİKA",
    tagColor: "text-orange-600",
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
    id: "invoices",
    tag: "HESAB-FAKTURALAR",
    tagColor: "text-red-500",
    headline: "Faktura yaradın, göndərin, avtomatik xatırladın",
    description: "Hesab-fakturaları yaradın, müştəriyə göndərin və ödəniş izləyin. Gecikmiş fakturalar üçün WhatsApp, Telegram, SMS və E-poçt ilə avtomatik xatırlatma göndərilir — heç bir ödəniş unudulmur.",
    features: [
      "Faktura yaratma — bir kliklə PDF generasiyası",
      "Ödəniş izləmə — status, tarix, qismən ödəniş",
      "Avtomatik xatırlatma — 4 kanal üzrə",
      "Təkrarlanan fakturalar — aylıq/rüblük",
      "Sövdələşmədən fakturaya — bir kliklə çevirmə",
      "Gecikmiş faktura hesabatı və analitika",
    ],
    screenshots: [
      { src: "/marketing/invoices-billing.png", alt: "Hesab-fakturalar — siyahı və izləmə" },
    ],
    customVisual: "invoices",
  },
  {
    id: "erp",
    tag: "ERP & LAYİHƏLƏR",
    tagColor: "text-orange-500",
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
    tagColor: "text-red-500",
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
      { src: "/marketing/platform-settings.png", alt: "İdarə paneli — ümumi baxış" },
      { src: "/marketing/companies-list.png", alt: "Şirkətlər grid — data idarəsi" },
    ],
  },
  {
    id: "ai",
    tag: "MAESTRO AI",
    tagColor: "text-orange-600",
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

/* ─── Channel icons as inline SVGs ─── */
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
)
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
)
const EmailIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
)
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
)
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
)

/* ─── Unified Inbox Visual ─── */
const inboxConversations = [
  { name: "Aynur Həsənova", channel: "whatsapp", channelColor: "text-green-500", bgColor: "bg-green-50", msg: "Salam, qiymət siyahısını göndərə bilərsiniz?", time: "13:42", unread: 2 },
  { name: "Орхан Мамедов", channel: "telegram", channelColor: "text-blue-500", bgColor: "bg-blue-50", msg: "Демо версия нужна для нашей команды из 15 человек", time: "13:38", unread: 1 },
  { name: "Leyla Aliyeva", channel: "email", channelColor: "text-orange-500", bgColor: "bg-orange-50", msg: "Re: Partnership proposal — LeadDrive CRM", time: "13:25", unread: 0 },
  { name: "Kamran Əlizadə", channel: "instagram", channelColor: "text-pink-500", bgColor: "bg-pink-50", msg: "Bu CRM sistemi haqqında daha ətraflı məlumat...", time: "12:58", unread: 3 },
  { name: "Nigar Mahmudova", channel: "whatsapp", channelColor: "text-green-500", bgColor: "bg-green-50", msg: "Təşəkkürlər, hesab-faktura aldım ✓✓", time: "12:44", unread: 0 },
  { name: "Рашад Гусейнов", channel: "facebook", channelColor: "text-blue-600", bgColor: "bg-blue-50", msg: "Интеграция с 1С возможна?", time: "12:31", unread: 1 },
]

const channelIcons: Record<string, React.FC<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  email: EmailIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
}

const channelLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "E-poçt",
  instagram: "Instagram",
  facebook: "Facebook",
}

function InboxUnifiedVisual() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 bg-white">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
            app.leaddrivecrm.org/inbox
          </div>
        </div>
      </div>

      {/* Inbox header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Gələn qutusu</h4>
            <p className="text-[10px] text-slate-400">Bütün kanallar — bir yerdə</p>
          </div>
          <div className="flex gap-1">
            {["whatsapp", "telegram", "email", "instagram", "facebook"].map(ch => {
              const Icon = channelIcons[ch]
              return <div key={ch} className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center">
                <Icon className="w-3 h-3 text-slate-400" />
              </div>
            })}
          </div>
        </div>
      </div>

      {/* Conversations list */}
      <div className="divide-y divide-slate-50">
        {inboxConversations.map((conv, i) => {
          const Icon = channelIcons[conv.channel]
          return (
            <div key={i} className={cn("flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors", i === 0 && "bg-orange-50/40")}>
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[11px] font-bold text-slate-600">
                  {conv.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white", conv.bgColor)}>
                  <Icon className={cn("w-2 h-2", conv.channelColor)} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-medium", conv.unread ? "text-slate-900" : "text-slate-600")}>{conv.name}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{conv.time}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("text-[10px] px-1 py-0.5 rounded font-medium", conv.bgColor, conv.channelColor)}>{channelLabels[conv.channel]}</span>
                  <p className={cn("text-[11px] truncate", conv.unread ? "text-slate-700 font-medium" : "text-slate-400")}>{conv.msg}</p>
                </div>
              </div>

              {/* Unread badge */}
              {conv.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">{conv.unread}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Caption */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <span className="text-xs text-slate-500">Vahid gələn qutusu — 7 kanaldan mesajlar</span>
      </div>
    </div>
  )
}

/* ─── Channel Sources Visual ─── */
const channelSources = [
  { channel: "whatsapp", color: "bg-green-500", name: "WhatsApp", msg: "Salam, qiymət göndərin 📋", sender: "Aynur H.", time: "13:42" },
  { channel: "telegram", color: "bg-blue-500", name: "Telegram", msg: "Демо нужна для 15 человек", sender: "Орхан М.", time: "13:38" },
  { channel: "email", color: "bg-orange-500", name: "E-poçt", msg: "Re: Partnership proposal", sender: "Leyla A.", time: "13:25" },
  { channel: "instagram", color: "bg-gradient-to-br from-purple-500 to-pink-500", name: "Instagram", msg: "Bu CRM haqqında ətraflı...", sender: "Kamran Ə.", time: "12:58" },
  { channel: "facebook", color: "bg-blue-600", name: "Facebook", msg: "Интеграция с 1С возможна?", sender: "Рашад Г.", time: "12:31" },
]

function ChannelSourcesVisual() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 bg-white">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
            Bütün kanallar → LeadDrive
          </div>
        </div>
      </div>

      {/* Channel cards flowing into center */}
      <div className="p-4 space-y-2.5">
        {channelSources.map((src, i) => {
          const Icon = channelIcons[src.channel]
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Channel badge */}
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", src.color)}>
                <Icon className="w-4 h-4 text-white" />
              </div>

              {/* Message bubble */}
              <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-700">{src.sender}</span>
                    <span className="text-[9px] text-slate-400">via {src.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-400">{src.time}</span>
                </div>
                <p className="text-[11px] text-slate-600">{src.msg}</p>
              </div>

              {/* Arrow into inbox */}
              <div className="flex-shrink-0">
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </div>

              {/* Inbox badge */}
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Inbox className="w-4 h-4 text-white" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Caption */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <span className="text-xs text-slate-500">Hər kanaldan mesaj → bir vahid gələn qutusu</span>
      </div>
    </div>
  )
}

/* ─── AI Ticket Features Visual ─── */
const aiTicketFeatures = [
  {
    icon: Bot,
    title: "Avtomatik cavab generasiyası",
    description: "Maestro AI tiketi oxuyur, bilik bazasından ən uyğun məqaləni tapır və peşəkar cavab hazırlayır. Agent yalnız təsdiq edir.",
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    example: "\"Hörmətli müştəri, VPN probleminiz üçün aşağıdakı addımları tövsiyə edirik: 1) Bağlantı parametrlərini yoxlayın...\"",
  },
  {
    icon: Gauge,
    title: "Hiss təhlili (Sentiment)",
    description: "Hər mesajın tonunu real vaxtda analiz edir. Əsəbi müştəriləri avtomatik prioritetə keçirir.",
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    meter: { label: "Əsəbi", value: 85, color: "bg-red-500" },
  },
  {
    icon: ShieldCheck,
    title: "SLA avtomatik izləmə",
    description: "Hər tiket üçün SLA taymeri işləyir. Vaxt bitməzdən əvvəl eskalasiya və bildiriş göndərilir.",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    sla: { remaining: "1 saat 23 dəq", status: "warning" },
  },
  {
    icon: Route,
    title: "Ağıllı yönləndirmə",
    description: "Tiketi kateqoriyaya, dilə və mürəkkəbliyə görə avtomatik ən uyğun agentə yönləndirir.",
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    routing: { from: "Yeni tiket", to: "Texniki komanda → Əli M." },
  },
]

function SupportAiVisual() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 bg-white">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
            Maestro AI — Texniki dəstək
          </div>
        </div>
      </div>

      {/* AI Features */}
      <div className="p-4 space-y-3">
        {aiTicketFeatures.map((feat, i) => {
          const Icon = feat.icon
          return (
            <div key={i} className={cn("rounded-lg border p-3.5", feat.borderColor, feat.bgColor)}>
              <div className="flex items-start gap-3">
                <div className={cn("w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm border", feat.borderColor)}>
                  <Icon className={cn("w-4 h-4", feat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-slate-900">{feat.title}</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{feat.description}</p>

                  {/* Example AI response */}
                  {feat.example && (
                    <div className="mt-2 rounded-md bg-white border border-slate-200 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3 text-orange-500" />
                        <span className="text-[9px] font-semibold text-orange-600">AI CAVAB</span>
                      </div>
                      <p className="text-[10px] text-slate-600 italic leading-relaxed">{feat.example}</p>
                    </div>
                  )}

                  {/* Sentiment meter */}
                  {feat.meter && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden border border-slate-200">
                        <div className={cn("h-full rounded-full", feat.meter.color)} style={{ width: `${feat.meter.value}%` }} />
                      </div>
                      <span className={cn("text-[10px] font-semibold", feat.color)}>{feat.meter.label} — {feat.meter.value}%</span>
                    </div>
                  )}

                  {/* SLA timer */}
                  {feat.sla && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-white border border-orange-200 px-2.5 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-[10px] font-semibold text-orange-600">SLA: {feat.sla.remaining} qalıb</span>
                    </div>
                  )}

                  {/* Routing */}
                  {feat.routing && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                      <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-slate-600">{feat.routing.from}</span>
                      <ArrowRight className="w-3 h-3 text-red-400" />
                      <span className="rounded bg-white border border-red-200 px-2 py-0.5 font-medium text-red-600">{feat.routing.to}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Caption */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <span className="text-xs text-slate-500">Maestro AI — 4 texniki dəstək funksiyası</span>
      </div>
    </div>
  )
}

/* ─── Invoice Auto-Reminder Visual ─── */
const reminderSteps = [
  { day: "Gün 0", action: "Faktura göndərildi", icon: Send, color: "text-green-500", bgColor: "bg-green-50", borderColor: "border-green-200", status: "Göndərildi ✓" },
  { day: "Gün 7", action: "İlk xatırlatma", icon: Bell, color: "text-orange-500", bgColor: "bg-orange-50", borderColor: "border-orange-200", status: "E-poçt + WhatsApp" },
  { day: "Gün 14", action: "İkinci xatırlatma", icon: AlertTriangle, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-300", status: "Telegram + SMS" },
  { day: "Gün 21", action: "Son xəbərdarlıq", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-50", borderColor: "border-red-200", status: "Bütün kanallar" },
  { day: "Gün 25", action: "Ödəniş alındı!", icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-300", status: "8,145.50 AZN ✓" },
]

function InvoiceReminderVisual() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 bg-white">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
            Avtomatik xatırlatma sistemi
          </div>
        </div>
      </div>

      {/* Invoice info */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-900">INV-2026-00059</span>
            <span className="text-[10px] text-slate-400 ml-2">AGHDAM GARDEN HOTEL</span>
          </div>
          <span className="text-xs font-bold text-orange-600">8,145.50 AZN</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200" />

          <div className="space-y-3">
            {reminderSteps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} className="flex items-center gap-3 relative">
                  {/* Icon dot */}
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border", step.bgColor, step.borderColor)}>
                    <Icon className={cn("w-3.5 h-3.5", step.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{step.day}</span>
                      <p className="text-xs font-medium text-slate-800">{step.action}</p>
                    </div>
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", step.bgColor, step.color)}>{step.status}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <span className="text-xs text-slate-500">Avtomatik xatırlatma — ödəniş alınana qədər</span>
      </div>
    </div>
  )
}

/* ─── Phone Notification Mockups Visual ─── */
const phoneNotifications = [
  {
    channel: "WhatsApp",
    icon: WhatsAppIcon,
    color: "bg-green-500",
    headerBg: "bg-[#075e54]",
    msgs: [
      { from: "LeadDrive CRM", text: "Hörmətli müştəri, INV-2026-00059 nömrəli fakturanızın ödəniş müddəti 3 gün sonra bitir. Məbləğ: 8,145.50 AZN", time: "14:32", incoming: true },
      { from: "", text: "Təşəkkürlər, bu gün ödəyəcəm ✓", time: "14:35", incoming: false },
    ],
  },
  {
    channel: "Telegram",
    icon: TelegramIcon,
    color: "bg-blue-500",
    headerBg: "bg-[#2AABEE]",
    msgs: [
      { from: "LeadDrive Bot", text: "📋 Faktura xatırlatması\n\nŞirkət: AGHDAM GARDEN\nMəbləğ: 8,145.50 AZN\nSon tarix: 25.03.2026\n\n💳 Ödəmək üçün klikləyin", time: "14:32", incoming: true },
    ],
  },
  {
    channel: "SMS",
    icon: Phone,
    color: "bg-slate-700",
    headerBg: "bg-slate-800",
    msgs: [
      { from: "+994105313065", text: "LeadDrive: INV-00059 üçün 8,145.50 AZN ödəniş xatırlatması. Son tarix: 25.03.2026", time: "14:32", incoming: true },
    ],
  },
  {
    channel: "E-poçt",
    icon: EmailIcon,
    color: "bg-orange-500",
    headerBg: "bg-orange-600",
    msgs: [
      { from: "billing@leaddrivecrm.org", text: "Mövzu: Ödəniş xatırlatması — INV-2026-00059\n\nHörmətli AGHDAM GARDEN, fakturanızın ödəniş müddəti yaxınlaşır...", time: "14:30", incoming: true },
    ],
  },
]

function PhoneNotificationsVisual() {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50 bg-white">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-6">
          <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
            Müştəri nə görür — hər kanalda
          </div>
        </div>
      </div>

      {/* 4 phone mockups in a grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {phoneNotifications.map((phone, i) => {
          const Icon = phone.icon
          return (
            <div key={i} className="rounded-xl border-2 border-slate-800 bg-slate-900 overflow-hidden shadow-md">
              {/* Phone status bar */}
              <div className="flex items-center justify-between px-2 py-0.5 bg-slate-900">
                <span className="text-[7px] text-slate-400">14:32</span>
                <div className="flex gap-0.5">
                  <div className="w-2 h-1.5 rounded-sm bg-slate-500" />
                  <div className="w-1 h-1.5 rounded-sm bg-slate-600" />
                </div>
              </div>

              {/* App header */}
              <div className={cn("flex items-center gap-1.5 px-2 py-1.5", phone.headerBg)}>
                <Icon className="w-3 h-3 text-white" />
                <span className="text-[9px] font-semibold text-white">{phone.channel}</span>
              </div>

              {/* Messages */}
              <div className="bg-[#e5ddd5] p-1.5 min-h-[80px] space-y-1">
                {phone.msgs.map((msg, j) => (
                  <div key={j} className={cn("max-w-[95%] rounded-lg px-2 py-1.5 shadow-sm", msg.incoming ? "bg-white" : "bg-[#dcf8c6] ml-auto")}>
                    {msg.from && <p className="text-[7px] font-semibold text-slate-500 mb-0.5">{msg.from}</p>}
                    <p className="text-[8px] text-slate-800 leading-relaxed whitespace-pre-line">{msg.text}</p>
                    <p className="text-[6px] text-slate-400 text-right mt-0.5">{msg.time}</p>
                  </div>
                ))}
              </div>

              {/* Bottom bar */}
              <div className="bg-slate-100 px-2 py-1 flex items-center gap-1">
                <div className="flex-1 bg-white rounded-full px-2 py-0.5 text-[7px] text-slate-300">Mesaj yazın...</div>
                <Send className="w-2.5 h-2.5 text-slate-400" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Caption */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <span className="text-xs text-slate-500">4 kanalda eyni anda xatırlatma — müştəri heç vaxt unudmur</span>
      </div>
    </div>
  )
}

/* ─── Single module section (Creatio-style, light theme) ─── */
function ModuleSection({ mod, index }: { mod: typeof modules[0]; index: number }) {
  const isReversed = index % 2 !== 0

  return (
    <AnimateIn>
      <div className={cn(
        "grid lg:grid-cols-2 gap-10 lg:gap-16 items-center",
        index > 0 && "mt-24 lg:mt-32 pt-24 lg:pt-32 border-t border-slate-200"
      )}>
        {/* TEXT SIDE */}
        <div className={cn(isReversed && "lg:order-2")}>
          {/* Tag */}
          <span className={cn("text-xs font-bold tracking-[0.2em] uppercase", mod.tagColor)}>
            {mod.tag}
          </span>

          {/* Headline */}
          <h3 className="mt-4 text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
            {mod.headline}
          </h3>

          {/* Description */}
          <p className="mt-4 text-base text-slate-500 leading-relaxed">
            {mod.description}
          </p>

          {/* Features list */}
          <ul className="mt-6 space-y-3">
            {mod.features.map((feat) => (
              <li key={feat} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                <ChevronRight className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/demo"
            className="mt-8 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Demo istəyin
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* VISUALS SIDE */}
        <div className={cn("space-y-4", isReversed && "lg:order-1")}>
          {/* Custom visuals */}
          {(mod as any).customVisual === "inbox" ? (
            <>
              <InboxUnifiedVisual />
              <ChannelSourcesVisual />
            </>
          ) : (mod as any).customVisual === "invoices" ? (
            <>
              {/* Screenshot */}
              {mod.screenshots.map((ss) => (
                <div key={ss.src} className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-6">
                      <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
                        app.leaddrivecrm.org/invoices
                      </div>
                    </div>
                  </div>
                  <img src={ss.src} alt={ss.alt} className="w-full block" loading="lazy" />
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                    <span className="text-xs text-slate-500">{ss.alt}</span>
                  </div>
                </div>
              ))}
              {/* Auto-reminder timeline */}
              <InvoiceReminderVisual />
              {/* Phone mockups */}
              <PhoneNotificationsVisual />
            </>
          ) : (mod as any).customVisual === "support" ? (
            <>
              {/* First: screenshot */}
              {mod.screenshots.map((ss) => (
                <div key={ss.src} className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50">
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-6">
                      <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
                        app.leaddrivecrm.org/tickets
                      </div>
                    </div>
                  </div>
                  <img src={ss.src} alt={ss.alt} className="w-full block" loading="lazy" />
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                    <span className="text-xs text-slate-500">{ss.alt}</span>
                  </div>
                </div>
              ))}
              {/* Second: AI features visual */}
              <SupportAiVisual />
            </>
          ) : (
            mod.screenshots.map((ss) => (
              <div key={ss.src} className="rounded-xl overflow-hidden border border-slate-200 shadow-lg shadow-slate-200/50">
                {/* Browser chrome — light */}
                <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-6">
                    <div className="bg-white rounded-md px-3 py-1 text-[10px] text-slate-400 border border-slate-200 max-w-[240px] mx-auto text-center">
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
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                  <span className="text-xs text-slate-500">{ss.alt}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AnimateIn>
  )
}

/* ─── Main export ─── */
export function ModuleShowcase() {
  return (
    <SectionWrapper id="modules" variant="gray">
      <AnimateIn className="text-center mb-16 lg:mb-24">
        <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">
          <span className="text-slate-900">128 funksiya. </span>
          <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">Bir platforma.</span>
        </h2>
        <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
          Satış, marketinq, dəstək, maliyyə və AI — hamısı eyni ekosistemda. Aşağı sürüşdürün və kəşf edin.
        </p>
      </AnimateIn>

      {modules.map((mod, i) => (
        <ModuleSection key={mod.id} mod={mod} index={i} />
      ))}
    </SectionWrapper>
  )
}
