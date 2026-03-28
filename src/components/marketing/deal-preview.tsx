"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, DollarSign, TrendingUp,
  Clock, CheckCircle2, Search, Bell, ArrowLeft,
  Shield, Zap, Phone, Mail, Calendar, MapPin,
  MessageSquare, User, Tag, ChevronRight,
  Megaphone, Inbox, BarChart3, Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Sidebar items ── */
const sidebarItems = [
  { icon: LayoutDashboard, label: "İdarə paneli", active: false, section: "CRM" },
  { icon: Building2, label: "Şirkətlər", active: false },
  { icon: UserCheck, label: "Kontaktlar", active: false },
  { icon: Briefcase, label: "Sövdələşmələr", active: true },
  { icon: Target, label: "Lidlər", active: false },
  { icon: FileText, label: "Tapşırıqlar", active: false },
  { icon: Receipt, label: "Hesab-fakturalar", active: false },
  { icon: DollarSign, label: "Maliyyə", active: false },
  { icon: Megaphone, label: "Kampaniyalar", active: false, section: "MARKETİNQ" },
  { icon: Inbox, label: "Gələn qutusu", active: false, section: "KOMMUNİKASİYA" },
]

/* ── Pipeline columns (Kanban) ── */
const pipelineColumns = [
  {
    label: "Lid", count: 1, amount: "2,500 ₼", color: "bg-blue-500",
    deals: [{ name: "Firewall", company: "AlGroup", amount: "2,500 AZN" }],
  },
  {
    label: "Kvalifikasiya", count: 3, amount: "15,300 ₼", color: "bg-blue-400",
    deals: [
      { name: "ERP Tətbiqi", company: "NeftGaz MMC", amount: "8,500 AZN" },
      { name: "CRM Lisenziya", company: "TechVision", amount: "5,000 AZN" },
    ],
  },
  {
    label: "Təklif", count: 4, amount: "34,484 ₼", color: "bg-orange-400",
    deals: [
      { name: "Pharmastore — Kon...", company: "Pharmastore", amount: "15,000 USD" },
      { name: "GT-OFF-2026-005", company: "ZEYTUN PH...", amount: "16,284 USD" },
    ],
  },
  {
    label: "Danışıqlar", count: 3, amount: "35,000 ₼", color: "bg-emerald-500",
    deals: [
      { name: "Zeytun Pharma — E...", company: "Zeytun", amount: "25,000 USD" },
      { name: "Pharmastore — Dön...", company: "Pharmastore", amount: "8,000 USD" },
    ],
  },
  {
    label: "Qazanıldı", count: 1, amount: "3,500 ₼", color: "bg-emerald-600",
    deals: [{ name: "Zeytunpharma — N...", company: "ZEYTUN PH...", amount: "3,500 AZN" }],
  },
]

/* ── Pipeline stage stepper ── */
const stages = [
  { label: "Lid", done: true },
  { label: "Kvalifikasiya", done: true },
  { label: "Təklif", active: true },
  { label: "Danışıqlar", done: false },
  { label: "Qazanıldı", done: false },
]

/* ── Next Best Offers ── */
const offers = [
  { name: "Cloud Migration Package", desc: "Complete migration from on-premise", price: "8,000 AZN", match: 48, type: "service" },
  { name: "Cybersecurity Suite", desc: "Firewall, təhdid idarəsi, monitorinq", price: "3,600 AZN", match: 96, type: "product" },
]

/* ── Deal detail fields ── */
const dealFields = [
  { icon: DollarSign, label: "Sövdələşmə dəyəri", value: "15,000 USD" },
  { icon: User, label: "Məsul şəxs", value: "Təyin edilməyib" },
  { icon: Calendar, label: "Gözlənilən bağlanma", value: "—" },
  { icon: Clock, label: "Yaradılma tarixi", value: "2026-03-20" },
  { icon: Building2, label: "Şirkət", value: "Pharmastore" },
  { icon: Target, label: "Kampaniya", value: "Zeytun Pharma — Лид" },
]

export function DealPreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-slate-900 text-white select-none">
      {/* Sidebar */}
      <div className="w-[120px] flex-shrink-0 bg-slate-900 border-r border-slate-700/50 py-2 px-1.5 hidden sm:block">
        <div className="flex items-center gap-1.5 px-2 mb-3">
          <div className="w-3.5 h-3.5 bg-gradient-to-br from-orange-400 to-red-500 rounded-md" />
          <span className="font-bold text-[7px] text-white/90">LeadDrive</span>
        </div>
        <div className="relative mb-2 px-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 text-slate-500" />
          <div className="bg-slate-800 rounded-md py-1 pl-5 text-slate-500 text-[6px]">Axtar...</div>
        </div>
        {sidebarItems.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i}>
              {item.section && (
                <div className="text-[5px] font-semibold text-slate-500 uppercase tracking-wider px-2 mt-2 mb-1">{item.section}</div>
              )}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-[3px] rounded-md mb-[1px]",
                item.active ? "bg-orange-500/20 text-orange-400" : "text-slate-400"
              )}>
                <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 bg-slate-50 text-slate-900 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-200">
          <span className="text-[8px] font-semibold text-slate-400">Güvən Technology LLC</span>
          <div className="flex items-center gap-1.5">
            <Bell className="w-2.5 h-2.5 text-slate-400" />
            <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-[5px] font-bold text-white">R</div>
          </div>
        </div>

        <div className="p-2.5">
          {/* ── SECTION 1: Pipeline Header ── */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="text-[9px] font-bold text-slate-900">Satış pipeline</h2>
                <p className="text-[5px] text-slate-500">13 sövdələşmə</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="bg-slate-100 rounded-md px-1.5 py-0.5 text-[5px] text-slate-600">Ən yenilər ▾</div>
                <div className="bg-orange-500 rounded-md px-1.5 py-0.5 text-[5px] text-white font-medium">+ Yeni sövdələşmə</div>
              </div>
            </div>

            {/* Summary KPI cards */}
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              <div className="bg-blue-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Cəmi sövdələşmə</span>
                <div className="text-[9px] font-bold">13</div>
              </div>
              <div className="bg-emerald-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Huni dəyəri</span>
                <div className="text-[9px] font-bold">98,784 ₼</div>
              </div>
              <div className="bg-teal-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Qazanıldı</span>
                <div className="text-[9px] font-bold">3,500 ₼</div>
              </div>
              <div className="bg-red-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">İtirildi</span>
                <div className="text-[9px] font-bold">1</div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Kanban Pipeline ── */}
          <div className="flex gap-1 mb-2.5 overflow-hidden">
            {pipelineColumns.map((col, i) => (
              <div key={i} className="flex-1 min-w-0">
                {/* Column header */}
                <div className="flex items-center gap-0.5 mb-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full", col.color)} />
                  <span className="text-[5px] font-semibold text-slate-700 truncate">{col.label}</span>
                  <span className="text-[5px] text-slate-400 ml-auto">{col.count}</span>
                </div>
                <div className="text-[5px] text-slate-400 mb-1">{col.amount}</div>
                {/* Deal cards */}
                <div className="space-y-0.5">
                  {col.deals.map((deal, j) => (
                    <div key={j} className="bg-white rounded border border-slate-200 p-1">
                      <div className="text-[5px] font-semibold text-slate-800 truncate">{deal.name}</div>
                      <div className="text-[4px] text-slate-400 truncate">{deal.company}</div>
                      <div className="text-[5px] font-bold text-slate-900 mt-0.5">{deal.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-slate-200 pt-2 mb-1.5">
            {/* ── SECTION 3: Deal Detail ── */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowLeft className="w-2.5 h-2.5 text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-slate-900">Pharmastore — Kontakt IT</span>
                  <span className="bg-purple-100 text-purple-700 text-[5px] font-medium px-1 py-[1px] rounded">Təklif</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="bg-blue-500 rounded px-1.5 py-0.5 text-[5px] text-white">Redaktə et</div>
                <div className="bg-red-50 text-red-500 rounded px-1.5 py-0.5 text-[5px]">Sil</div>
              </div>
            </div>

            {/* Pipeline stages stepper */}
            <div className="flex gap-[1px] mb-2">
              {stages.map((stage, i) => (
                <div key={i} className={cn(
                  "flex-1 py-[3px] text-center text-[5px] font-medium",
                  i === 0 ? "rounded-l-sm" : "",
                  i === stages.length - 1 ? "rounded-r-sm" : "",
                  stage.done ? "bg-blue-500 text-white" :
                  stage.active ? "bg-purple-500 text-white" :
                  "bg-slate-200 text-slate-500"
                )}>
                  {stage.label}
                </div>
              ))}
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-1 mb-2">
              <div className="bg-blue-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Hunidə gün</span>
                <div className="text-[9px] font-bold">8</div>
              </div>
              <div className="bg-blue-400 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Mərhələdə gün</span>
                <div className="text-[9px] font-bold">8</div>
              </div>
              <div className="bg-emerald-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Sövdələşmə dəyəri</span>
                <div className="text-[9px] font-bold">15,000 USD</div>
              </div>
              <div className="bg-orange-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">Güvən səviyyəsi</span>
                <div className="text-[9px] font-bold">50%</div>
              </div>
            </div>

            {/* Two columns: Deal info + Next Best Offers */}
            <div className="grid grid-cols-[1.2fr_1fr] gap-2">
              {/* Deal info (İcmal) */}
              <div className="bg-white rounded-lg border border-slate-200 p-2">
                <div className="flex gap-2 mb-1.5">
                  {["İcmal", "Fəaliyyət", "Kontakt rolları", "Rəqiblər", "Təkliflər"].map((tab, i) => (
                    <span key={i} className={cn(
                      "text-[5px] pb-0.5",
                      i === 0 ? "font-semibold text-slate-900 border-b border-blue-500" : "text-slate-400"
                    )}>{tab}</span>
                  ))}
                </div>
                <div className="text-[5px] font-semibold text-slate-500 uppercase tracking-wider mb-1">SÖVDƏLƏŞMƏ MƏLUMATLARI</div>
                <div className="space-y-1">
                  {dealFields.map((field, i) => {
                    const Icon = field.icon
                    return (
                      <div key={i} className="flex items-center gap-1.5">
                        <Icon className="w-2 h-2 text-slate-400 flex-shrink-0" />
                        <span className="text-[5px] text-slate-500 w-[60px] flex-shrink-0">{field.label}</span>
                        <span className="text-[6px] font-medium text-slate-800">{field.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Next Best Offers */}
              <div>
                <div className="bg-white rounded-lg border border-slate-200 p-2 mb-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap className="w-2.5 h-2.5 text-orange-500" />
                    <span className="text-[7px] font-bold text-slate-900">Next Best Offers</span>
                  </div>
                  <div className="space-y-1">
                    {offers.map((offer, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1 rounded bg-slate-50 border border-slate-100">
                        <div className="w-4 h-4 bg-gradient-to-br from-violet-500 to-blue-500 rounded flex items-center justify-center flex-shrink-0">
                          <Shield className="w-2 h-2 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[5px] font-semibold text-slate-900">{offer.name}</div>
                          <div className="text-[4px] text-slate-500 truncate">{offer.desc}</div>
                          <div className="text-[5px] font-medium text-slate-700">{offer.price}</div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[4px] font-bold flex-shrink-0",
                          offer.match >= 90 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                          {offer.match}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Progress bars */}
                <div className="bg-white rounded-lg border border-slate-200 p-2">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[5px] text-slate-600">Ehtimal</span>
                    <span className="text-[6px] font-bold text-slate-900">50%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: "50%" }} />
                  </div>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[5px] text-slate-600">Proqnoz reytinqi</span>
                    <span className="text-[6px] font-bold text-emerald-600">50%</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "50%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
