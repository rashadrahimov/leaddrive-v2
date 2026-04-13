"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, Headphones, Bot,
  DollarSign, CheckCircle2,
  Search, Bell, Settings, ArrowLeft,
  Shield, Zap, Megaphone,
  Mail, Send, Eye, MousePointer, Users,
  AlertTriangle,
  Workflow, ListChecks, ClipboardList,
  ChevronRight, Sparkles, Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ================================================================
   SHARED: Sidebar + Top bar used by all preview components
   ================================================================ */

type SidebarItem = { icon: React.ElementType; label: string; active?: boolean; section?: string }

const defaultSidebar: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Idarə paneli", section: "CRM" },
  { icon: Building2, label: "Şirkətlər" },
  { icon: UserCheck, label: "Kontaktlar" },
  { icon: Briefcase, label: "Sövdələşmələr" },
  { icon: Target, label: "Lidlər" },
  { icon: FileText, label: "Tapşırıqlar" },
  { icon: Receipt, label: "Hesab-fakturalar" },
  { icon: DollarSign, label: "Maliyyə" },
  { icon: Megaphone, label: "Kampaniyalar", section: "MARKETİNQ" },
  { icon: Headphones, label: "Tiketlər", section: "DƏSTƏK" },
  { icon: Bot, label: "Da Vinci Mərkəzi", section: "DA VINCI" },
  { icon: Settings, label: "Parametrlər" },
]

function Sidebar({ items, activeLabel }: { items?: SidebarItem[]; activeLabel?: string }) {
  const list = items || defaultSidebar
  return (
    <div className="w-[100px] flex-shrink-0 bg-[#001E3C] border-r border-[#001E3C]/20 py-2 px-1 hidden sm:block">
      <div className="flex items-center gap-1 px-1.5 mb-2">
        <div className="w-3 h-3 bg-gradient-to-br from-[#0176D3] to-[#0176D3] rounded-md" />
        <span className="font-bold text-[6px] text-white/90">LeadDrive</span>
      </div>
      <div className="relative mb-2 px-0.5">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 text-[#001E3C]/60" />
        <div className="bg-[#001E3C]/60 rounded-md py-0.5 pl-4 text-[#001E3C]/60 text-[5px]">Axtar...</div>
      </div>
      {list.map((item, i) => {
        const Icon = item.icon
        const isActive = activeLabel ? item.label === activeLabel : item.active
        return (
          <div key={i}>
            {item.section && (
              <div className="text-[4px] font-semibold text-[#001E3C]/60 uppercase tracking-wider px-1.5 mt-1.5 mb-0.5">{item.section}</div>
            )}
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-[2px] rounded-md mb-[1px] text-[6px]",
              isActive ? "bg-[#0176D3]/20 text-[#0176D3]" : "text-[#001E3C]/40"
            )}>
              <Icon className="w-2 h-2 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TopBar() {
  return (
    <div className="flex items-center justify-between px-2.5 py-1 bg-white border-b border-[#001E3C]/10">
      <span className="text-[7px] font-semibold text-[#001E3C]/40">LeadDrive Inc.</span>
      <div className="flex items-center gap-1">
        <Bell className="w-2 h-2 text-[#001E3C]/40" />
        <div className="w-3.5 h-3.5 bg-gradient-to-br from-[#0176D3] to-[#0176D3] rounded-full flex items-center justify-center text-[5px] font-bold text-white">R</div>
      </div>
    </div>
  )
}

/* ================================================================
   1. CRM PIPELINE PREVIEW (Kanban board)
   ================================================================ */

const pipelineColumns = [
  {
    title: "Yeni", color: "bg-blue-500", count: 3, total: "₼38,500",
    deals: [
      { name: "ERP Tətbiqi", company: "NeftGaz MMC", amount: "₼25,000", prob: 20 },
      { name: "Cloud Setup", company: "AzərLogistik", amount: "₼8,500", prob: 15 },
      { name: "Audit Xidməti", company: "BakıFin", amount: "₼5,000", prob: 10 },
    ],
  },
  {
    title: "Kvalifikasiya", color: "bg-cyan-500", count: 2, total: "₼21,300",
    deals: [
      { name: "CRM Lisenziya", company: "TechVision MMC", amount: "₼12,800", prob: 40 },
      { name: "Data Migration", company: "DevPort", amount: "₼8,500", prob: 35 },
    ],
  },
  {
    title: "Təklif", color: "bg-amber-500", count: 2, total: "₼34,200",
    deals: [
      { name: "Kibertəhlükə", company: "BankTech", amount: "₼18,700", prob: 60 },
      { name: "HR Modul", company: "FinServ Group", amount: "₼15,500", prob: 55 },
    ],
  },
  {
    title: "Danışıq", color: "bg-[#0176D3]", count: 2, total: "₼27,600",
    deals: [
      { name: "SAP İnteqrasiya", company: "AzərNeft", amount: "₼19,200", prob: 75 },
      { name: "Hosting Plan", company: "CloudAz", amount: "₼8,400", prob: 80 },
    ],
  },
  {
    title: "Qazanıldı", color: "bg-emerald-500", count: 1, total: "₼31,000",
    deals: [
      { name: "Full Stack Dev", company: "DigiTech MMC", amount: "₼31,000", prob: 100 },
    ],
  },
]

export function CrmPipelinePreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Sövdələşmələr" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Satış Pipeline</h2>
              <p className="text-[5px] text-[#001E3C]/60">13 sövdələşmə</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] px-1.5 py-0.5 rounded bg-[#F3F4F7] text-[#001E3C]/60 border border-[#001E3C]/10">Ön yarat</span>
              <span className="bg-[#0176D3] rounded px-1.5 py-0.5 text-[5px] text-white font-medium">+ Yeni sövdələşmə</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {[
              { label: "Cəmi sövdələşmə", value: "13", color: "bg-blue-500" },
              { label: "Ümumi dəyər", value: "₼98,784", color: "bg-cyan-500" },
              { label: "Gözlənilən", value: "₼3,500", color: "bg-amber-500" },
              { label: "Satış", value: "1", color: "bg-emerald-500" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1.5 text-white", k.color)}>
                <span className="text-[5px] opacity-80">{k.label}</span>
                <div className="text-[9px] font-bold">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Kanban columns */}
          <div className="flex gap-1 overflow-hidden">
            {pipelineColumns.map((col) => (
              <div key={col.title} className="flex-1 min-w-0">
                <div className="flex items-center gap-0.5 mb-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full", col.color)} />
                  <span className="text-[6px] font-semibold text-[#001E3C]/80">{col.title}</span>
                  <span className="text-[5px] text-[#001E3C]/40 ml-auto">{col.count}</span>
                </div>
                <div className="space-y-0.5">
                  {col.deals.map((deal, j) => (
                    <div key={j} className="bg-white rounded border border-[#001E3C]/10 p-1 shadow-sm">
                      <div className="text-[6px] font-semibold text-[#001E3C] truncate">{deal.name}</div>
                      <div className="text-[5px] text-[#001E3C]/40 truncate">{deal.company}</div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[6px] font-bold text-emerald-600">{deal.amount}</span>
                        <span className="text-[5px] text-[#001E3C]/40">{deal.prob}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   2. CRM DEAL DETAIL PREVIEW
   ================================================================ */

const dealStages = [
  { label: "Lid", done: true },
  { label: "Kvalifikasiya", done: true },
  { label: "Təklif", active: true },
  { label: "Danışıq", done: false },
  { label: "Qazanıldı", done: false },
]

const dealOffers = [
  { name: "Cybersecurity Suite", desc: "Firewall, təhdid idarəsi", price: "₼3,600", match: 96 },
  { name: "24/7 Dəstək", desc: "SLA ilə dəstək xidməti", price: "₼1,500", match: 88 },
  { name: "Backup Service", desc: "Gündəlik backup + recovery", price: "₼800", match: 74 },
]

export function CrmDealDetailPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Sövdələşmələr" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          {/* Back + header */}
          <div className="flex items-center gap-1 mb-1">
            <ArrowLeft className="w-2 h-2 text-[#001E3C]/40" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#001E3C]">ERP Tətbiqi</span>
                <span className="bg-cyan-100 text-cyan-700 text-[5px] font-medium px-1 py-[1px] rounded">Təklif</span>
              </div>
              <span className="text-[5px] text-[#001E3C]/60">NeftGaz MMC</span>
            </div>
          </div>

          {/* Pipeline stages */}
          <div className="flex gap-[2px] mb-1.5">
            {dealStages.map((s, i) => (
              <div key={i} className={cn(
                "flex-1 py-[2px] text-center text-[5px] font-medium rounded-sm",
                s.done ? "bg-blue-500 text-white" :
                (s as any).active ? "bg-blue-500 text-white" :
                "bg-[#001E3C]/10 text-[#001E3C]/60"
              )}>{s.label}</div>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-1.5">
            <div className="bg-blue-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Planlaşan gün</span>
              <div className="text-[9px] font-bold">21</div>
            </div>
            <div className="bg-blue-400 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Mərhələdə gün</span>
              <div className="text-[9px] font-bold">7</div>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Dəyər</span>
              <div className="text-[9px] font-bold">₼25,000</div>
            </div>
            <div className="bg-[#0176D3] text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Ehtimal</span>
              <div className="text-[9px] font-bold">60%</div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-2 gap-1 mb-1.5">
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-[5px] font-medium text-[#001E3C]/80">Ehtimal</span>
                <span className="text-[5px] font-semibold text-[#001E3C]">60%</span>
              </div>
              <div className="h-1 bg-[#F3F4F7] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: "60%" }} />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1">
              <div className="flex justify-between mb-0.5">
                <span className="text-[5px] font-medium text-[#001E3C]/80">Etibar səviyyəsi</span>
                <span className="text-[5px] font-semibold text-[#001E3C]">75%</span>
              </div>
              <div className="h-1 bg-[#F3F4F7] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "75%" }} />
              </div>
            </div>
          </div>

          {/* Da Vinci Next Best Offers */}
          <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-2 h-2 text-[#0176D3]" />
              <span className="text-[6px] font-bold text-[#001E3C]">Next Best Offers</span>
            </div>
            <div className="space-y-1">
              {dealOffers.map((o, i) => (
                <div key={i} className="flex items-center gap-1.5 p-0.5 rounded bg-[#F3F4F7] border border-[#001E3C]/8">
                  <div className="w-4 h-4 bg-gradient-to-br from-violet-500 to-blue-500 rounded flex items-center justify-center flex-shrink-0">
                    <Shield className="w-2 h-2 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[5px] font-semibold text-[#001E3C]">{o.name}</div>
                    <div className="text-[4px] text-[#001E3C]/60 truncate">{o.desc}</div>
                  </div>
                  <span className="text-[5px] font-medium text-[#001E3C]/80">{o.price}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[4px] font-bold flex-shrink-0",
                    o.match >= 90 ? "bg-emerald-100 text-emerald-700" : o.match >= 80 ? "bg-blue-100 text-blue-700" : "bg-[#F3F4F7] text-[#001E3C]/60"
                  )}>{o.match}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   3. MARKETING CAMPAIGNS PREVIEW
   ================================================================ */

const campaigns = [
  { name: "Yaz Kampaniyası 2026", type: "Email", status: "Göndərildi", statusColor: "bg-emerald-100 text-emerald-700", sent: 2450, opened: 1666, clicked: 416, converted: 49 },
  { name: "Webinar Dəvət", type: "Email", status: "Aktiv", statusColor: "bg-blue-100 text-blue-700", sent: 890, opened: 623, clicked: 196, converted: 22 },
  { name: "Pharmastore News", type: "Email", status: "Qaralama", statusColor: "bg-[#F3F4F7] text-[#001E3C]/80", sent: 0, opened: 0, clicked: 0, converted: 0 },
  { name: "Product Launch", type: "SMS", status: "Göndərildi", statusColor: "bg-emerald-100 text-emerald-700", sent: 1200, opened: 960, clicked: 288, converted: 36 },
]

export function MarketingCampaignsPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Kampaniyalar" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Kampaniyalar</h2>
              <p className="text-[5px] text-[#001E3C]/60">E-poçt/SMS kampaniyaları yaradın və göndərin</p>
            </div>
            <span className="bg-[#0176D3] rounded px-1.5 py-0.5 text-[5px] text-white font-medium">+ Yeni kampaniya</span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {[
              { label: "Göndərilən", value: "2", color: "bg-blue-500" },
              { label: "Planlaşdırılmış", value: "0", color: "bg-cyan-500" },
              { label: "Göndərildi", value: "0", color: "bg-amber-500" },
              { label: "Aktiv", value: "1", color: "bg-emerald-500" },
              { label: "Ləğv edildi", value: "0", color: "bg-red-500" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1 text-white text-center", k.color)}>
                <div className="text-[8px] font-bold">{k.value}</div>
                <span className="text-[4px] opacity-80">{k.label}</span>
              </div>
            ))}
          </div>

          {/* Campaign list */}
          <div className="bg-white rounded-lg border border-[#001E3C]/10 overflow-hidden">
            <div className="grid grid-cols-[1.5fr_0.5fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr] gap-0.5 px-1.5 py-1 bg-[#F3F4F7] border-b border-[#001E3C]/10 text-[5px] font-semibold text-[#001E3C]/60 uppercase">
              <span>Kampaniya</span>
              <span>Tip</span>
              <span>Status</span>
              <span className="text-center"><Send className="w-2 h-2 inline" /></span>
              <span className="text-center"><Eye className="w-2 h-2 inline" /></span>
              <span className="text-center"><MousePointer className="w-2 h-2 inline" /></span>
              <span className="text-center"><Target className="w-2 h-2 inline" /></span>
            </div>
            {campaigns.map((c, i) => (
              <div key={i} className={cn(
                "grid grid-cols-[1.5fr_0.5fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr] gap-0.5 px-1.5 py-[3px] text-[6px] items-center",
                i < campaigns.length - 1 && "border-b border-[#001E3C]/8"
              )}>
                <span className="text-[#001E3C] font-medium truncate">{c.name}</span>
                <span className="text-[#001E3C]/60">{c.type}</span>
                <span className={cn("px-1 py-[1px] rounded text-[5px] font-medium text-center", c.statusColor)}>{c.status}</span>
                <span className="text-center text-[#001E3C]/80">{c.sent > 0 ? c.sent.toLocaleString() : "—"}</span>
                <span className="text-center text-[#001E3C]/80">{c.opened > 0 ? c.opened.toLocaleString() : "—"}</span>
                <span className="text-center text-[#001E3C]/80">{c.clicked > 0 ? c.clicked.toLocaleString() : "—"}</span>
                <span className="text-center text-emerald-600 font-semibold">{c.converted > 0 ? c.converted : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   4. MARKETING LEAD SCORING PREVIEW
   ================================================================ */

const scoredLeads = [
  { name: "Tarlan M. Məmmədli", company: "Azmade", score: 92, grade: "A", gradeColor: "bg-emerald-500", source: "referral", conv: "85%" },
  { name: "Cahan Kh. Paşayev", company: "Mars Overseas", score: 85, grade: "A", gradeColor: "bg-emerald-500", source: "referral", conv: "78%" },
  { name: "Nigar Həsənova", company: "DataPro MMC", score: 71, grade: "B", gradeColor: "bg-blue-500", source: "web sayt", conv: "62%" },
  { name: "Kamran Əliyev", company: "TechVision MMC", score: 58, grade: "C", gradeColor: "bg-amber-500", source: "LinkedIn", conv: "45%" },
  { name: "Aynur Quliyeva", company: "FinServ Group", score: 34, grade: "D", gradeColor: "bg-[#0176D3]", source: "kampaniya", conv: "22%" },
  { name: "Tural Həsənov", company: "LogiTech AZ", score: 18, grade: "F", gradeColor: "bg-red-500", source: "cold", conv: "8%" },
]

export function MarketingLeadScoringPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Da Vinci Mərkəzi" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Da Vinci İdarəetmə Mərkəzi</h2>
              <p className="text-[5px] text-[#001E3C]/60">Da Vinci agentlər və konfiqurasiyaları idarə edin</p>
            </div>
            <span className="bg-[#0176D3] rounded px-1.5 py-0.5 text-[5px] text-white font-medium">+ Yeni agent</span>
          </div>

          {/* Grade summary */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {[
              { grade: "A", count: 6, color: "bg-emerald-500" },
              { grade: "B", count: 2, color: "bg-blue-500" },
              { grade: "C", count: 0, color: "bg-amber-500" },
              { grade: "D", count: 0, color: "bg-[#0176D3]" },
              { grade: "F", count: 2, color: "bg-red-500" },
            ].map((g) => (
              <div key={g.grade} className={cn("rounded-lg p-1.5 text-white text-center", g.color)}>
                <div className="text-[10px] font-bold">{g.grade}</div>
                <span className="text-[5px] opacity-80">{g.count} Lidlər</span>
              </div>
            ))}
          </div>

          <div className="text-[5px] text-[#001E3C]/60 mb-1">Ort. bal: 66/100 &nbsp; Ehtimal: 61% &nbsp; Cəmi sessiyalar: 8</div>

          {/* Lead scoring table */}
          <div className="bg-white rounded-lg border border-[#001E3C]/10 overflow-hidden">
            <div className="flex items-center justify-between px-1.5 py-1 bg-[#F3F4F7] border-b border-[#001E3C]/10">
              <span className="text-[6px] font-bold text-[#001E3C]/80">Lidlər</span>
            </div>
            <div className="grid grid-cols-[0.3fr_1.2fr_0.8fr_0.5fr_0.6fr] gap-0.5 px-1.5 py-0.5 border-b border-[#001E3C]/8 text-[5px] font-semibold text-[#001E3C]/40 uppercase">
              <span>Bal</span>
              <span>Lid</span>
              <span>Şirkət</span>
              <span>Mənbə</span>
              <span>Konversiya</span>
            </div>
            {scoredLeads.map((l, i) => (
              <div key={i} className={cn(
                "grid grid-cols-[0.3fr_1.2fr_0.8fr_0.5fr_0.6fr] gap-0.5 px-1.5 py-[3px] text-[6px] items-center",
                i < scoredLeads.length - 1 && "border-b border-[#001E3C]/5"
              )}>
                <div className="flex items-center gap-0.5">
                  <div className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[5px] font-bold text-white", l.gradeColor)}>{l.grade}</div>
                  <span className="text-[5px] text-[#001E3C]/60">{l.score}</span>
                </div>
                <span className="text-[#001E3C] font-medium truncate">{l.name}</span>
                <span className="text-[#001E3C]/60 truncate">{l.company}</span>
                <span className="text-[#001E3C]/40">{l.source}</span>
                <div className="flex items-center gap-0.5">
                  <div className="flex-1 h-1 bg-[#F3F4F7] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", l.gradeColor)} style={{ width: l.conv }} />
                  </div>
                  <span className="text-[5px] text-[#001E3C]/60">{l.conv}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   5. SUPPORT TICKET PREVIEW
   ================================================================ */

export function SupportTicketPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Tiketlər" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          {/* Ticket header */}
          <div className="flex items-center gap-1 mb-1">
            <ArrowLeft className="w-2 h-2 text-[#001E3C]/40" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#001E3C]">[WhatsApp] Menecerə yönləndir</span>
                <span className="text-[5px] text-[#001E3C]/40">DV-4522</span>
              </div>
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-[2px] mb-1.5">
            {["Yeni", "Açıq", "Gözləyir", "Güncəlləndi", "Həll olundu", "Bağlı"].map((s, i) => (
              <div key={i} className={cn(
                "flex-1 py-[2px] text-center text-[5px] font-medium rounded-sm",
                s === "Açıq" ? "bg-blue-500 text-white" : "bg-[#001E3C]/10 text-[#001E3C]/60"
              )}>{s}</div>
            ))}
          </div>

          {/* Ticket KPIs */}
          <div className="grid grid-cols-4 gap-1 mb-1.5">
            <div className="bg-blue-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Yaşı (saat)</span>
              <div className="text-[8px] font-bold">6</div>
            </div>
            <div className="bg-cyan-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Həll müddəti</span>
              <div className="text-[8px] font-bold">—</div>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">İlk cavab</span>
              <div className="text-[8px] font-bold">1 s.</div>
            </div>
            <div className="bg-[#0176D3] text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Prioritet</span>
              <div className="text-[8px] font-bold">Yüksək</div>
            </div>
          </div>

          {/* Ticket body + details side */}
          <div className="grid grid-cols-[1.5fr_1fr] gap-1.5">
            {/* Conversation */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5 space-y-1">
              <div className="text-[6px] font-bold text-[#001E3C] mb-0.5">[WhatsApp] Menecerə yönləndir</div>
              <div className="bg-[#F3F4F7] rounded p-1 border border-[#001E3C]/8">
                <div className="text-[5px] text-[#001E3C]/40 mb-0.5">Müştəri mesajı:</div>
                <div className="text-[5px] text-[#001E3C]/80">Salam! LeadDrive-a xoş gəldiniz. Sizə necə kömək edə bilər?</div>
              </div>
              <div className="bg-violet-50 rounded p-1 border border-violet-100">
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Bot className="w-2 h-2 text-violet-500" />
                  <span className="text-[5px] text-violet-600 font-semibold">Da Vinci Təklif:</span>
                </div>
                <div className="text-[5px] text-[#001E3C]/80">Məsələni baxmaq üçün bir neçə sual: 1. Hansı xidmət? 2. Hansə müqavilə?</div>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                <span className="bg-[#F3F4F7] rounded px-1 py-[1px] text-[5px] text-[#001E3C]/60">Geri</span>
                <span className="bg-blue-500 rounded px-1 py-[1px] text-[5px] text-white">İrəli</span>
              </div>
            </div>

            {/* Details panel */}
            <div className="space-y-1">
              <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
                <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Detallar</div>
                {[
                  { l: "Statusu", v: "Açıq", c: "text-blue-600" },
                  { l: "Prioritet", v: "Yüksək", c: "text-[#0176D3]" },
                  { l: "Kateqoriya", v: "ai_escalation", c: "text-[#001E3C]/60" },
                  { l: "Yaradılma", v: "21.03.2026", c: "text-[#001E3C]/60" },
                ].map((d) => (
                  <div key={d.l} className="flex justify-between py-[1px]">
                    <span className="text-[5px] text-[#001E3C]/40">{d.l}</span>
                    <span className={cn("text-[5px] font-medium", d.c)}>{d.v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Shield className="w-2 h-2 text-blue-500" />
                  <span className="text-[6px] font-bold text-[#001E3C]/80">SLA</span>
                </div>
                <div className="flex justify-between py-[1px]">
                  <span className="text-[5px] text-[#001E3C]/40">Son tarix</span>
                  <span className="text-[5px] text-red-500 font-medium">Təyin edilməyib</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   6. FINANCE PROFITABILITY PREVIEW
   ================================================================ */

const profitClients = [
  { name: "Texnologiya xidmətləri", value: 280000, color: "bg-blue-500" },
  { name: "İnfrastruktur", value: 145000, color: "bg-emerald-500" },
  { name: "Hosting", value: 98000, color: "bg-violet-500" },
  { name: "Dəstək xidmətləri", value: 65000, color: "bg-amber-500" },
  { name: "Digər", value: 28000, color: "bg-[#001E3C]/30" },
]

export function FinanceProfitabilityPreview() {
  const maxVal = Math.max(...profitClients.map(c => c.value))
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Maliyyə" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Gəlirlilik</h2>
              <p className="text-[5px] text-[#001E3C]/60">Xərc modeli analitikası: gəlir, xərclər, mənfəət</p>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {[
              { label: "Ümumi gəlir", value: "₼646,755", color: "bg-blue-500" },
              { label: "Xərclər", value: "₼616,367", color: "bg-emerald-500" },
              { label: "Mənfəət", value: "-₼30,388", color: "bg-red-500" },
              { label: "Marja", value: "15%", color: "bg-violet-500" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1.5 text-white", k.color)}>
                <span className="text-[4px] opacity-80 uppercase">{k.label}</span>
                <div className="text-[8px] font-bold">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {/* Cost structure donut-like */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Xərc strukturu</div>
              {/* Simplified donut via stacked bar */}
              <div className="flex h-2 rounded-full overflow-hidden mb-1.5">
                <div className="bg-blue-500" style={{ width: "45%" }} />
                <div className="bg-emerald-500" style={{ width: "25%" }} />
                <div className="bg-violet-500" style={{ width: "15%" }} />
                <div className="bg-amber-500" style={{ width: "10%" }} />
                <div className="bg-[#001E3C]/30" style={{ width: "5%" }} />
              </div>
              <div className="space-y-[2px]">
                {[
                  { l: "Əməkhaqqı", p: "45%", c: "bg-blue-500" },
                  { l: "Adminstrativ", p: "25%", c: "bg-emerald-500" },
                  { l: "Overhead", p: "15%", c: "bg-violet-500" },
                  { l: "Hosting/Infra", p: "10%", c: "bg-amber-500" },
                  { l: "Digər", p: "5%", c: "bg-[#001E3C]/30" },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-1">
                    <div className={cn("w-1.5 h-1.5 rounded-full", s.c)} />
                    <span className="text-[5px] text-[#001E3C]/60 flex-1">{s.l}</span>
                    <span className="text-[5px] text-[#001E3C]/40">{s.p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue by service - horizontal bars */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Xidmət səviyyəsi üzrə Gəlir</div>
              <div className="space-y-[4px]">
                {profitClients.map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-[1px]">
                      <span className="text-[5px] text-[#001E3C]/60 truncate">{c.name}</span>
                      <span className="text-[5px] text-[#001E3C]/60">₼{(c.value / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="h-1.5 bg-[#F3F4F7] rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", c.color)} style={{ width: `${(c.value / maxVal) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom metrics */}
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            {[
              { l: "Administrativ əlavə xərclər", v: "₼121,854" },
              { l: "Texniki infrastruktur", v: "₼44,224" },
              { l: "Bilavasitə əmək xərcləri", v: "₼144,289" },
            ].map((m) => (
              <div key={m.l} className="bg-white rounded border border-[#001E3C]/10 p-1 text-center">
                <div className="text-[5px] text-[#001E3C]/60">{m.l}</div>
                <div className="text-[7px] font-bold text-[#001E3C]">{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   7. FINANCE BUDGET P&L PREVIEW
   ================================================================ */

const budgetRows = [
  { label: "Gəlir", plan: 2019731, actual: 1848100, exec: 92 },
  { label: "Əməkhaqqı", plan: 850000, actual: 820000, exec: 96 },
  { label: "Hosting xərcləri", plan: 120000, actual: 135000, exec: 112 },
  { label: "Marketing", plan: 200000, actual: 180500, exec: 90 },
  { label: "Ofis xərcləri", plan: 95000, actual: 88000, exec: 93 },
]

export function FinanceBudgetPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Maliyyə" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Büdcələşdirmə</h2>
              <p className="text-[5px] text-[#001E3C]/60">Büdcə planlaşdırma, proqnoz və icra</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] px-1.5 py-0.5 rounded bg-[#F3F4F7] text-[#001E3C]/60 border border-[#001E3C]/10">Q1 2026</span>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="bg-blue-500 text-white rounded-lg p-1.5">
              <span className="text-[4px] opacity-80">PLAN</span>
              <div className="text-[8px] font-bold">₼2,019,731</div>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg p-1.5">
              <span className="text-[4px] opacity-80">FAKT</span>
              <div className="text-[8px] font-bold">₼1,848,100</div>
            </div>
            <div className="bg-[#0176D3] text-white rounded-lg p-1.5">
              <span className="text-[4px] opacity-80">FƏRQ</span>
              <div className="text-[8px] font-bold">+₼170,631</div>
            </div>
          </div>

          <div className="grid grid-cols-[1.5fr_1fr] gap-1.5">
            {/* Plan vs Actual bars */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1.5">Plan / Fakt kateqoriya üzrə</div>
              <div className="space-y-[6px]">
                {budgetRows.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-[1px]">
                      <span className="text-[5px] text-[#001E3C]/60">{r.label}</span>
                      <span className={cn("text-[5px] font-semibold", r.exec > 100 ? "text-red-500" : "text-emerald-600")}>{r.exec}%</span>
                    </div>
                    <div className="flex gap-[1px] h-1.5">
                      <div className="bg-blue-400 rounded-sm" style={{ width: "50%" }} />
                      <div className={cn("rounded-sm", r.exec > 100 ? "bg-red-400" : "bg-emerald-400")} style={{ width: `${Math.min(r.exec / 2, 50)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1 text-[4px] text-[#001E3C]/40">
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1 bg-blue-400 inline-block rounded-sm" /> Plan</span>
                <span className="flex items-center gap-0.5"><span className="w-1.5 h-1 bg-emerald-400 inline-block rounded-sm" /> Fakt</span>
              </div>
            </div>

            {/* Execution donut */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5 flex flex-col items-center justify-center">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1.5">Büdcə icrasI</div>
              <div className="relative w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="94, 100" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-600">94%</span>
                </div>
              </div>
              <div className="text-[5px] text-[#001E3C]/40 mt-1">Büdcə icrası faizi</div>
              <div className="grid grid-cols-2 gap-1 mt-1.5 w-full">
                <div className="text-center p-0.5 bg-[#F3F4F7] rounded border border-[#001E3C]/8">
                  <div className="text-[7px] font-bold text-blue-600">₼2.0M</div>
                  <div className="text-[4px] text-[#001E3C]/40">Plan</div>
                </div>
                <div className="text-center p-0.5 bg-[#F3F4F7] rounded border border-[#001E3C]/8">
                  <div className="text-[7px] font-bold text-emerald-600">₼1.8M</div>
                  <div className="text-[4px] text-[#001E3C]/40">Fakt</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   8. ERP PROJECTS PREVIEW
   ================================================================ */

const projects = [
  { name: "CRM v2 Development", status: "Aktiv", statusColor: "bg-emerald-100 text-emerald-700", progress: 72, members: 4, deadline: "15 Apr" },
  { name: "Mobile App Redesign", status: "Aktiv", statusColor: "bg-emerald-100 text-emerald-700", progress: 45, members: 3, deadline: "30 May" },
  { name: "ERP İnteqrasiya", status: "Planlaşdırılır", statusColor: "bg-blue-100 text-blue-700", progress: 10, members: 2, deadline: "01 İyun" },
  { name: "Infra Migration", status: "Gözləyir", statusColor: "bg-amber-100 text-amber-700", progress: 0, members: 1, deadline: "TBD" },
]

export function ErpProjectsPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Tapşırıqlar" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Layihələr</h2>
              <p className="text-[5px] text-[#001E3C]/60">Layihə tapşırıqlarını izləyin, vəzifələri və resursları idarə edin</p>
            </div>
            <span className="bg-[#0176D3] rounded px-1.5 py-0.5 text-[5px] text-white font-medium">+ Yeni layihə</span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {[
              { label: "Planlaşdırılır", value: "0", color: "bg-blue-500" },
              { label: "Aktiv", value: "0", color: "bg-cyan-500" },
              { label: "Gözləyir", value: "0", color: "bg-amber-500" },
              { label: "Bitmiş", value: "0", color: "bg-emerald-500" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1 text-white text-center", k.color)}>
                <div className="text-[9px] font-bold">{k.value}</div>
                <span className="text-[4px] opacity-80">{k.label}</span>
              </div>
            ))}
          </div>

          {/* Projects table */}
          <div className="bg-white rounded-lg border border-[#001E3C]/10 overflow-hidden">
            <div className="grid grid-cols-[1.5fr_0.7fr_1fr_0.5fr_0.5fr] gap-0.5 px-1.5 py-1 bg-[#F3F4F7] border-b border-[#001E3C]/10 text-[5px] font-semibold text-[#001E3C]/60 uppercase">
              <span>Layihə</span>
              <span>Status</span>
              <span>Proqres</span>
              <span>Komanda</span>
              <span>Son tarix</span>
            </div>
            {projects.map((p, i) => (
              <div key={i} className={cn(
                "grid grid-cols-[1.5fr_0.7fr_1fr_0.5fr_0.5fr] gap-0.5 px-1.5 py-[4px] text-[6px] items-center",
                i < projects.length - 1 && "border-b border-[#001E3C]/8"
              )}>
                <div>
                  <span className="text-[#001E3C] font-medium">{p.name}</span>
                </div>
                <span className={cn("px-1 py-[1px] rounded text-[5px] font-medium text-center", p.statusColor)}>{p.status}</span>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-[#F3F4F7] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-[5px] text-[#001E3C]/60 w-5 text-right">{p.progress}%</span>
                </div>
                <div className="flex -space-x-1">
                  {Array.from({ length: Math.min(p.members, 3) }).map((_, j) => (
                    <div key={j} className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 border border-white text-[3px] text-white flex items-center justify-center font-bold">
                      {String.fromCharCode(65 + j)}
                    </div>
                  ))}
                  {p.members > 3 && <span className="text-[4px] text-[#001E3C]/40 ml-1">+{p.members - 3}</span>}
                </div>
                <span className="text-[5px] text-[#001E3C]/60">{p.deadline}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   9. ERP TASKS PREVIEW
   ================================================================ */

const tasks = [
  { title: "Kampaniyaların Microsoft inboxu", priority: "Yüksək", prColor: "bg-red-500", assignee: "Emil", status: "Ediliyor", stColor: "bg-blue-100 text-blue-700", date: "19 mar" },
  { title: "Очистить историю конвертаций", priority: "Orta", prColor: "bg-amber-500", assignee: "Rəşad", status: "Gözləyir", stColor: "bg-amber-100 text-amber-700", date: "17 mar" },
  { title: "Обновка backlog предложений", priority: "Aşağı", prColor: "bg-[#001E3C]/30", assignee: "Nigar", status: "Bitmiş", stColor: "bg-emerald-100 text-emerald-700", date: "15 mar" },
  { title: "Провести телефонные звонки", priority: "Yüksək", prColor: "bg-red-500", assignee: "Kamran", status: "Ediliyor", stColor: "bg-blue-100 text-blue-700", date: "14 mar" },
  { title: "Send introductory email", priority: "Orta", prColor: "bg-amber-500", assignee: "Aynur", status: "Gözləyir", stColor: "bg-amber-100 text-amber-700", date: "12 mar" },
]

export function ErpTasksPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Tapşırıqlar" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Tapşırıqlar</h2>
              <p className="text-[5px] text-[#001E3C]/60">Komanda tapşırıqlarını idarə et</p>
            </div>
            <div className="flex gap-1">
              <span className="text-[5px] px-1 py-0.5 rounded bg-[#F3F4F7] text-[#001E3C]/60 border border-[#001E3C]/10">Kanban</span>
              <span className="text-[5px] px-1 py-0.5 rounded bg-blue-500 text-white">Siyahı</span>
              <span className="bg-[#0176D3] rounded px-1.5 py-0.5 text-[5px] text-white font-medium">+ Tapşırıq</span>
            </div>
          </div>

          {/* Status KPIs */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            {[
              { label: "Cədvəl", value: "15", color: "bg-blue-500" },
              { label: "Ediliyor", value: "1", color: "bg-cyan-500" },
              { label: "Nəzarət", value: "11", color: "bg-amber-500" },
              { label: "Tapşırıq", value: "0", color: "bg-violet-500" },
              { label: "Bitmiş", value: "0", color: "bg-emerald-500" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1 text-white text-center", k.color)}>
                <div className="text-[8px] font-bold">{k.value}</div>
                <span className="text-[4px] opacity-80">{k.label}</span>
              </div>
            ))}
          </div>

          {/* Tasks table */}
          <div className="bg-white rounded-lg border border-[#001E3C]/10 overflow-hidden">
            <div className="grid grid-cols-[1.5fr_0.5fr_0.5fr_0.6fr_0.4fr] gap-0.5 px-1.5 py-1 bg-[#F3F4F7] border-b border-[#001E3C]/10 text-[5px] font-semibold text-[#001E3C]/60 uppercase">
              <span>Tapşırıq</span>
              <span>Prioritet</span>
              <span>Təyin ed.</span>
              <span>Status</span>
              <span>Tarix</span>
            </div>
            {tasks.map((t, i) => (
              <div key={i} className={cn(
                "grid grid-cols-[1.5fr_0.5fr_0.5fr_0.6fr_0.4fr] gap-0.5 px-1.5 py-[3px] text-[6px] items-center",
                i < tasks.length - 1 && "border-b border-[#001E3C]/8"
              )}>
                <div className="flex items-center gap-0.5">
                  <CheckCircle2 className={cn("w-2 h-2 flex-shrink-0", t.status === "Bitmiş" ? "text-emerald-500" : "text-[#001E3C]/25")} />
                  <span className="text-[#001E3C] truncate">{t.title}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", t.prColor)} />
                  <span className="text-[5px] text-[#001E3C]/60">{t.priority}</span>
                </div>
                <span className="text-[#001E3C]/60">{t.assignee}</span>
                <span className={cn("px-1 py-[1px] rounded text-[5px] font-medium text-center", t.stColor)}>{t.status}</span>
                <span className="text-[5px] text-[#001E3C]/40">{t.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   10. PLATFORM SETTINGS PREVIEW
   ================================================================ */

export function PlatformSettingsPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Parametrlər" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="mb-1.5">
            <h2 className="text-[9px] font-bold text-[#001E3C]">Sabahınız xeyir, Emil Rahimsoy</h2>
            <p className="text-[5px] text-[#001E3C]/60">Platformanı konfiqurasiya edin</p>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {[
              { label: "Açıq sov.", value: "₼616,367", color: "bg-blue-500" },
              { label: "Satış pipeline", value: "₼90,784", color: "bg-emerald-500" },
              { label: "Müştərilər", value: "59", color: "bg-violet-500" },
              { label: "Yeni Lidlər", value: "11", color: "bg-[#0176D3]" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1 text-white", k.color)}>
                <span className="text-[4px] opacity-80">{k.label}</span>
                <div className="text-[8px] font-bold">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Settings grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* Revenue bar chart */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Xidmətlər üzrə gəlir</div>
              {[
                { name: "Texnologiya", value: 85, color: "bg-blue-500" },
                { name: "İnfrastruktur", value: 60, color: "bg-emerald-500" },
                { name: "Hosting", value: 35, color: "bg-red-500" },
                { name: "Dəstək", value: 25, color: "bg-violet-500" },
                { name: "QRC", value: 15, color: "bg-amber-500" },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-1 mb-[3px]">
                  <span className="text-[5px] text-[#001E3C]/60 w-12 text-right truncate">{s.name}</span>
                  <div className="flex-1 h-1.5 bg-[#F3F4F7] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Settings sections */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Satış pipeline</div>
              <div className="space-y-[3px]">
                {[
                  { icon: Users, label: "İstifadəçilər & Rollar", desc: "Komanda idarəetməsi", count: 5 },
                  { icon: Workflow, label: "İş axınları", desc: "Avtomatlaşdırma qaydaları", count: 3 },
                  { icon: ListChecks, label: "Xüsusi sahələr", desc: "CRM sahə konfiqurasiyası", count: 12 },
                  { icon: ClipboardList, label: "Audit jurnalı", desc: "Sistem hadisələri", count: 2000 },
                  { icon: Mail, label: "SMTP Parametrləri", desc: "E-poçt konfiqurasiyası", count: 1 },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-1 p-0.5 rounded hover:bg-[#F3F4F7]">
                    <div className="w-4 h-4 rounded bg-violet-50 border border-violet-200 flex items-center justify-center flex-shrink-0">
                      <s.icon className="w-2 h-2 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[5px] font-semibold text-[#001E3C]">{s.label}</div>
                      <div className="text-[4px] text-[#001E3C]/40">{s.desc}</div>
                    </div>
                    <span className="text-[5px] text-[#001E3C]/40">{s.count}</span>
                    <ChevronRight className="w-2 h-2 text-[#001E3C]/25" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   11. PLATFORM COMPANIES PREVIEW
   ================================================================ */

const companies = [
  { name: "TechVision MMC", sector: "IT Xidmətlər", contacts: 8, deals: 3, score: "HOT", scoreColor: "text-red-500" },
  { name: "NeftGaz MMC", sector: "Enerji", contacts: 12, deals: 5, score: "HOT", scoreColor: "text-red-500" },
  { name: "AzərLogistik", sector: "Logistika", contacts: 6, deals: 2, score: "WARM", scoreColor: "text-amber-500" },
  { name: "BankTech", sector: "Fintech", contacts: 4, deals: 1, score: "HOT", scoreColor: "text-red-500" },
  { name: "DevPort", sector: "Proqramlaşdırma", contacts: 3, deals: 0, score: "COLD", scoreColor: "text-blue-500" },
  { name: "FinServ Group", sector: "Maliyyə", contacts: 9, deals: 4, score: "WARM", scoreColor: "text-amber-500" },
]

export function PlatformCompaniesPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Şirkətlər" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <h2 className="text-[9px] font-bold text-[#001E3C]">Şirkətlər (59)</h2>
              <p className="text-[5px] text-[#001E3C]/60">Müştəri şirkətlərini idarə edin</p>
            </div>
            <span className="bg-[#0176D3] rounded px-1.5 py-0.5 text-[5px] text-white font-medium">+ Əlavə et</span>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-2">
            {[
              { label: "Cəmi", value: "59", color: "bg-blue-500" },
              { label: "Aktiv", value: "59", color: "bg-cyan-500" },
              { label: "Kontaktlar", value: "606", color: "bg-amber-500" },
              { label: "Sövdələşmələr", value: "4699", color: "bg-violet-500" },
            ].map((k, i) => (
              <div key={i} className={cn("rounded-lg p-1 text-white text-center", k.color)}>
                <div className="text-[8px] font-bold">{k.value}</div>
                <span className="text-[4px] opacity-80">{k.label}</span>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0.5 mb-1.5">
            {["Hamısı (59)", "Aktiv (59)", "Perspektiv (5)", "Qeyri-aktiv (5)"].map((t, i) => (
              <span key={i} className={cn("text-[5px] px-1 py-0.5 rounded", i === 0 ? "bg-blue-500 text-white" : "bg-[#F3F4F7] text-[#001E3C]/60")}>{t}</span>
            ))}
          </div>

          {/* Companies grid */}
          <div className="grid grid-cols-3 gap-1">
            {companies.map((c) => (
              <div key={c.name} className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5 shadow-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[6px] font-bold text-[#001E3C] truncate">{c.name}</span>
                  <span className="text-[5px] text-[#001E3C]/40">Aktiv</span>
                </div>
                <div className="text-[5px] text-[#001E3C]/60 mb-1">{c.sector}</div>
                <div className="grid grid-cols-2 gap-0.5 text-[5px]">
                  <div className="flex items-center gap-0.5">
                    <Users className="w-1.5 h-1.5 text-[#001E3C]/40" />
                    <span className="text-[#001E3C]/60">{c.contacts} kontakt</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Briefcase className="w-1.5 h-1.5 text-[#001E3C]/40" />
                    <span className="text-[#001E3C]/60">{c.deals} sövdələşmə</span>
                  </div>
                </div>
                <div className="mt-0.5">
                  <span className={cn("text-[5px] font-bold", c.scoreColor)}>{c.score} {c.deals > 0 ? c.deals * 51 : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   12. DA VINCI ASSISTANT PREVIEW
   ================================================================ */

export function AiAssistantPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Idarə paneli" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="flex h-[250px]">
          {/* Main dashboard content (simplified) */}
          <div className="flex-1 p-2 overflow-hidden">
            <div className="mb-1.5">
              <h2 className="text-[9px] font-bold text-[#001E3C]">Sabahınız xeyir, Emil Rahimsoy</h2>
              <p className="text-[5px] text-[#001E3C]/60">Rəhbər paneli - 2026 M03.28, Şb</p>
            </div>

            {/* Mini KPI */}
            <div className="grid grid-cols-3 gap-1 mb-1.5">
              <div className="bg-blue-500 text-white rounded-lg p-1">
                <span className="text-[4px] opacity-80">Açıq sov.</span>
                <div className="text-[7px] font-bold">₼616,367</div>
              </div>
              <div className="bg-emerald-500 text-white rounded-lg p-1">
                <span className="text-[4px] opacity-80">Pipeline</span>
                <div className="text-[7px] font-bold">₼90,784</div>
              </div>
              <div className="bg-violet-500 text-white rounded-lg p-1">
                <span className="text-[4px] opacity-80">Müştərilər</span>
                <div className="text-[7px] font-bold">59</div>
              </div>
            </div>

            {/* Simplified chart area */}
            <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5 mb-1">
              <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Xidmətlər üzrə gəlir</div>
              {[
                { name: "Texnologiya", w: "90%", color: "bg-blue-500" },
                { name: "Infra", w: "55%", color: "bg-red-500" },
                { name: "Hosting", w: "30%", color: "bg-emerald-500" },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-1 mb-[2px]">
                  <span className="text-[4px] text-[#001E3C]/60 w-10 text-right">{s.name}</span>
                  <div className="flex-1 h-1 bg-[#F3F4F7] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", s.color)} style={{ width: s.w }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Warnings */}
            <div className="flex gap-1">
              <div className="flex items-center gap-0.5 bg-red-50 border border-red-200 rounded px-1 py-0.5 text-[5px] text-red-600">
                <AlertTriangle className="w-2 h-2" /> Aşağı marja: 4.9%
              </div>
              <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 text-[5px] text-amber-600">
                <AlertTriangle className="w-2 h-2" /> Zərərli müştərilər: 37
              </div>
            </div>
          </div>

          {/* Da Vinci Assistant panel (right side) */}
          <div className="w-[120px] bg-gradient-to-b from-violet-600 to-blue-600 text-white p-2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                <span className="text-[7px] font-bold">Da Vinci</span>
              </div>
              <span className="text-[5px] opacity-60">Online</span>
            </div>

            <div className="flex-1 space-y-1.5">
              {/* Da Vinci Icon */}
              <div className="flex justify-center mb-1">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="text-[5px] text-center text-white/80 mb-1.5">
                Da Vinci Assistant
              </div>
              <div className="text-[4px] text-center text-white/60 mb-2">
                CRM məlumatları, sövdələşmələr, müştərilər haqqında soruşun
              </div>

              {/* Suggestion buttons */}
              {[
                "Proses necvirin örtünblərdir?",
                "Hansə sövdələşmələr risk altında?",
                "Gəlirə görə ən yaxşı müştərilər",
              ].map((s, i) => (
                <div key={i} className="bg-white/10 rounded px-1.5 py-1 text-[5px] text-white/90 truncate border border-white/20">
                  {s}
                </div>
              ))}
            </div>

            {/* Chat input */}
            <div className="mt-auto flex items-center gap-0.5 bg-white/10 rounded px-1 py-0.5 border border-white/20">
              <span className="text-[5px] text-white/50 flex-1">Da Vinci-dən soruş...</span>
              <Send className="w-2 h-2 text-white/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   13. DA VINCI LEAD DETAIL PREVIEW
   ================================================================ */

export function AiLeadDetailPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-[#001E3C] text-white min-h-[280px] select-none">
      <Sidebar activeLabel="Lidlər" />
      <div className="flex-1 bg-[#F3F4F7] text-[#001E3C] overflow-hidden">
        <TopBar />
        <div className="p-2">
          {/* Lead header */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-[8px] font-bold text-white">TM</div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-[#001E3C]">Tarlan M. Məmmədli (AZM)</span>
                <span className="bg-emerald-100 text-emerald-700 text-[5px] font-medium px-1 py-[1px] rounded">Yeni</span>
                <span className="bg-amber-100 text-amber-700 text-[5px] font-medium px-1 py-[1px] rounded">Orta</span>
              </div>
              <span className="text-[5px] text-[#001E3C]/60">Azmade &bull; tarlan.mammadli@azmade.az</span>
            </div>
            <div className="flex gap-0.5">
              <span className="bg-emerald-500 rounded px-1 py-0.5 text-[5px] text-white">Sövdələşməyə çevir</span>
              <span className="bg-blue-500 rounded px-1 py-0.5 text-[5px] text-white">Redaktə et</span>
            </div>
          </div>

          {/* Pipeline stages */}
          <div className="flex gap-[2px] mb-1.5">
            {["Yeni", "Əlaqə qurulib", "Kvalifikasiya olub", "Çevrildi", "İtirildi"].map((s, i) => (
              <div key={i} className={cn(
                "flex-1 py-[2px] text-center text-[5px] font-medium rounded-sm",
                i === 0 ? "bg-blue-500 text-white" : "bg-[#001E3C]/10 text-[#001E3C]/60"
              )}>{s}</div>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1 mb-1.5">
            <div className="bg-blue-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Da Vinci Bal / Dərəcə</span>
              <div className="text-[8px] font-bold">92/100 (A)</div>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Yaradılışdan bəri</span>
              <div className="text-[8px] font-bold">12 g.</div>
            </div>
            <div className="bg-[#0176D3] text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Tahmini dəyər</span>
              <div className="text-[8px] font-bold">₼5,000</div>
            </div>
            <div className="bg-violet-500 text-white rounded-lg p-1">
              <span className="text-[4px] opacity-80">Prioritet</span>
              <div className="text-[8px] font-bold">Orta</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 mb-1.5">
            {["Detallar", "Tarixçə", "Tapşırıqlar", "Da Vinci", "Reyting"].map((t, i) => (
              <span key={i} className={cn("text-[5px] px-1.5 py-0.5 rounded", i === 0 ? "bg-blue-500 text-white" : "bg-[#F3F4F7] text-[#001E3C]/60")}>{t}</span>
            ))}
          </div>

          {/* Lead details */}
          <div className="bg-white rounded-lg border border-[#001E3C]/10 p-1.5">
            <div className="text-[6px] font-bold text-[#001E3C]/80 mb-1">Lid məlumatları</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-[3px]">
              {[
                { l: "Əlaqə adı", v: "Tarlan M. Məmmədli (AZM)" },
                { l: "Şirkət", v: "Azmade" },
                { l: "Email", v: "tarlan.mammadli@azmade.az" },
                { l: "Telefon", v: "+994 50 251-72-23" },
                { l: "Mənbə", v: "Referans" },
                { l: "Yönləndirən", v: "Rəşad Rahimov" },
                { l: "Qeydiyyat", v: "20.03.2026" },
                { l: "Yaradılış", v: "15.03.2026" },
              ].map((d) => (
                <div key={d.l} className="flex items-center gap-1">
                  <span className="text-[5px] text-[#001E3C]/40 w-14">{d.l}:</span>
                  <span className="text-[5px] text-[#001E3C]/80 font-medium truncate">{d.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
