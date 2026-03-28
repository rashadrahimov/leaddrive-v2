"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, Headphones, Bot,
  DollarSign, TrendingUp, Clock, CheckCircle2,
  Search, Bell, Settings, Mail, Megaphone,
  BarChart3, Inbox, Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Sidebar items (shared CRM structure) ── */
const sidebarItems = [
  { icon: LayoutDashboard, label: "İdarə paneli", active: false, section: "CRM" },
  { icon: Building2, label: "Şirkətlər", active: false },
  { icon: UserCheck, label: "Kontaktlar", active: false },
  { icon: Briefcase, label: "Sövdələşmələr", active: false },
  { icon: Target, label: "Lidlər", active: false },
  { icon: FileText, label: "Tapşırıqlar", active: false },
  { icon: Receipt, label: "Hesab-fakturalar", active: true },
  { icon: DollarSign, label: "Maliyyə", active: false },
  { icon: Megaphone, label: "Kampaniyalar", active: false, section: "MARKETİNQ" },
  { icon: Inbox, label: "Gələn qutusu", active: false, section: "KOMMUNİKASİYA" },
]

/* ── Invoice data ── */
const kpiCards = [
  { label: "ÜMUMİ GƏLİR", value: "₼84,520", icon: DollarSign, color: "bg-emerald-500", trend: "+12%" },
  { label: "GÖZLƏYİR", value: "₼23,180", icon: Clock, color: "bg-orange-500", trend: "8 faktura" },
  { label: "ÖDƏNİLİB", value: "₼56,340", icon: CheckCircle2, color: "bg-blue-500", trend: "+18%" },
  { label: "GECİKMİŞ", value: "₼5,000", icon: TrendingUp, color: "bg-red-500", trend: "2 faktura" },
]

const invoices = [
  { number: "INV-2026-001", client: "TechVision MMC", amount: "₼8,145", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "28/03/2026" },
  { number: "INV-2026-002", client: "AzərLogistik", amount: "₼12,800", status: "Gözləyir", statusColor: "bg-orange-100 text-orange-700", date: "25/03/2026" },
  { number: "INV-2026-003", client: "NeftGaz MMC", amount: "₼25,000", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "22/03/2026" },
  { number: "INV-2026-004", client: "BankTech", amount: "₼5,000", status: "Gecikmiş", statusColor: "bg-red-100 text-red-700", date: "15/03/2026" },
  { number: "INV-2026-005", client: "DevPort", amount: "₼9,605", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "12/03/2026" },
  { number: "INV-2026-006", client: "FinServ Group", amount: "₼6,575", status: "Gözləyir", statusColor: "bg-orange-100 text-orange-700", date: "10/03/2026" },
]

export function InvoicePreview() {
  return (
    <div className="flex text-[7px] leading-tight bg-slate-900 text-white min-h-[280px] select-none">
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
                item.active ? "bg-orange-500/20 text-orange-400" : "text-slate-400 hover:bg-slate-800"
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
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-semibold text-slate-400">Güvən Technology LLC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bell className="w-2.5 h-2.5 text-slate-400" />
            <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-[5px] font-bold text-white">R</div>
          </div>
        </div>

        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-[9px] font-bold text-slate-900">Hesab-fakturalar</h2>
              <p className="text-[6px] text-slate-500">Fakturaları yaradın, göndərin və izləyin</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="bg-slate-100 rounded-md px-2 py-0.5 text-[6px] text-slate-600">Təkrarlanan</div>
              <div className="bg-orange-500 rounded-md px-2 py-0.5 text-[6px] text-white font-medium">+ Yeni faktura</div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {kpiCards.map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} className={cn("rounded-lg p-1.5 text-white", card.color)}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[5px] font-medium opacity-80 uppercase">{card.label}</span>
                    <Icon className="w-2 h-2 opacity-70" />
                  </div>
                  <div className="text-[9px] font-bold">{card.value}</div>
                  <div className="text-[5px] opacity-70">{card.trend}</div>
                </div>
              )
            })}
          </div>

          {/* Payment progress */}
          <div className="bg-white rounded-lg border border-slate-200 p-2 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[6px] font-semibold text-slate-700">Ödəniş proqresi</span>
              <span className="text-[6px] text-slate-500">₼56,340 / ₼84,520 <span className="text-emerald-600 font-medium">67%</span></span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-[1px]">
              <div className="bg-emerald-500 rounded-full" style={{ width: "67%" }} />
              <div className="bg-orange-400 rounded-full" style={{ width: "18%" }} />
              <div className="bg-red-400 rounded-full" style={{ width: "6%" }} />
            </div>
            <div className="flex gap-3 mt-1">
              <span className="flex items-center gap-0.5 text-[5px] text-slate-500"><span className="w-1 h-1 bg-emerald-500 rounded-full inline-block" /> Ödənilib</span>
              <span className="flex items-center gap-0.5 text-[5px] text-slate-500"><span className="w-1 h-1 bg-orange-400 rounded-full inline-block" /> Gözləyir</span>
              <span className="flex items-center gap-0.5 text-[5px] text-slate-500"><span className="w-1 h-1 bg-red-400 rounded-full inline-block" /> Gecikmiş</span>
            </div>
          </div>

          {/* Invoice table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.6fr] gap-1 px-2 py-1 bg-slate-50 border-b border-slate-200 text-[5px] font-semibold text-slate-500 uppercase">
              <span>Nömrə</span>
              <span>Müştəri</span>
              <span>Məbləğ</span>
              <span>Tarix</span>
              <span>Status</span>
            </div>
            {invoices.map((inv, i) => (
              <div key={i} className={cn(
                "grid grid-cols-[1fr_1.2fr_0.7fr_0.7fr_0.6fr] gap-1 px-2 py-[3px] text-[6px]",
                i < invoices.length - 1 && "border-b border-slate-100"
              )}>
                <span className="text-blue-600 font-medium">{inv.number}</span>
                <span className="text-slate-700 truncate">{inv.client}</span>
                <span className="font-semibold text-slate-900">{inv.amount}</span>
                <span className="text-slate-500">{inv.date}</span>
                <span className={cn("px-1 py-[1px] rounded text-[5px] font-medium text-center", inv.statusColor)}>{inv.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
