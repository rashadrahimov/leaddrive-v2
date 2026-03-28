"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, DollarSign, TrendingUp,
  Clock, CheckCircle2, Search, Bell, ArrowLeft,
  Filter, Download, Plus, Mail, Send,
  Megaphone, Inbox, FileDown, Eye, Printer,
  Copy, MoreHorizontal, ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Sidebar items ── */
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

/* ── Invoice list data ── */
const invoices = [
  { number: "INV-2026-001", client: "TechVision MMC", amount: "₼8,145", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "28/03/2026" },
  { number: "INV-2026-002", client: "AzərLogistik", amount: "₼12,800", status: "Gözləyir", statusColor: "bg-orange-100 text-orange-700", date: "25/03/2026" },
  { number: "INV-2026-003", client: "NeftGaz MMC", amount: "₼25,000", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "22/03/2026" },
  { number: "INV-2026-004", client: "BankTech", amount: "₼5,000", status: "Gecikmiş", statusColor: "bg-red-100 text-red-700", date: "15/03/2026" },
  { number: "INV-2026-005", client: "DevPort", amount: "₼9,605", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "12/03/2026" },
  { number: "INV-2026-006", client: "FinServ Group", amount: "₼6,575", status: "Gözləyir", statusColor: "bg-orange-100 text-orange-700", date: "10/03/2026" },
  { number: "INV-2026-007", client: "CloudAz", amount: "₼15,300", status: "Ödənilib", statusColor: "bg-emerald-100 text-emerald-700", date: "08/03/2026" },
]

/* ── Invoice detail line items ── */
const lineItems = [
  { desc: "CRM Lisenziya — Enterprise (10 user)", qty: 10, price: "₼450", total: "₼4,500" },
  { desc: "Tətbiq & konfiqurasiya xidməti", qty: 1, price: "₼2,500", total: "₼2,500" },
  { desc: "Təlim proqramı (3 gün)", qty: 1, price: "₼800", total: "₼800" },
  { desc: "İllik dəstək paketi", qty: 1, price: "₼345", total: "₼345" },
]

/* ── Payment stages ── */
const paymentStages = [
  { label: "Qaralama", done: true, active: false },
  { label: "Göndərilib", done: true, active: true },
  { label: "Ödənilib", done: false, active: false },
]

export function InvoicePreview() {
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
          {/* ── SECTION 1: Invoice List ── */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h2 className="text-[9px] font-bold text-slate-900">Hesab-fakturalar</h2>
                <p className="text-[5px] text-slate-500">Fakturaları yaradın, göndərin və izləyin</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="bg-slate-100 rounded-md px-1.5 py-0.5 text-[5px] text-slate-600 flex items-center gap-0.5">
                  <Filter className="w-1.5 h-1.5" /> Filter
                </div>
                <div className="bg-orange-500 rounded-md px-1.5 py-0.5 text-[5px] text-white font-medium flex items-center gap-0.5">
                  <Plus className="w-1.5 h-1.5" /> Yeni faktura
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              <div className="bg-emerald-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">ÜMUMİ GƏLİR</span>
                <div className="text-[9px] font-bold">₼84,520</div>
                <div className="text-[5px] opacity-70">+12%</div>
              </div>
              <div className="bg-orange-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">GÖZLƏYİR</span>
                <div className="text-[9px] font-bold">₼23,180</div>
                <div className="text-[5px] opacity-70">8 faktura</div>
              </div>
              <div className="bg-blue-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">ÖDƏNİLİB</span>
                <div className="text-[9px] font-bold">₼56,340</div>
                <div className="text-[5px] opacity-70">+18%</div>
              </div>
              <div className="bg-red-500 text-white rounded-lg p-1.5">
                <span className="text-[5px] opacity-80">GECİKMİŞ</span>
                <div className="text-[9px] font-bold">₼5,000</div>
                <div className="text-[5px] opacity-70">2 faktura</div>
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

          {/* ── Divider ── */}
          <div className="border-t border-slate-200 pt-2">
            {/* ── SECTION 2: Invoice Detail ── */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <ArrowLeft className="w-2.5 h-2.5 text-slate-400" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-900">INV-2026-00001</span>
                    <span className="bg-blue-100 text-blue-700 text-[5px] font-medium px-1 py-[1px] rounded">Göndərilib</span>
                  </div>
                  <span className="text-[5px] text-slate-500">Zeytun Pharmaceuticals İT xidmət</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <div className="bg-slate-100 rounded px-1.5 py-0.5 text-[5px] text-slate-600 flex items-center gap-0.5"><Eye className="w-1.5 h-1.5" /> Redaktə</div>
                <div className="bg-blue-500 rounded px-1.5 py-0.5 text-[5px] text-white flex items-center gap-0.5"><Send className="w-1.5 h-1.5" /> Göndər</div>
                <div className="bg-slate-100 rounded px-1.5 py-0.5 text-[5px] text-slate-600 flex items-center gap-0.5"><FileDown className="w-1.5 h-1.5" /> PDF</div>
                <div className="bg-slate-100 rounded px-1.5 py-0.5 text-[5px] text-slate-600 flex items-center gap-0.5"><Copy className="w-1.5 h-1.5" /> Dublikat</div>
              </div>
            </div>

            {/* Payment stage stepper */}
            <div className="flex gap-[1px] mb-2">
              {paymentStages.map((stage, i) => (
                <div key={i} className={cn(
                  "flex-1 py-[3px] text-center text-[5px] font-medium",
                  i === 0 ? "rounded-l-sm" : "",
                  i === paymentStages.length - 1 ? "rounded-r-sm" : "",
                  stage.done && !stage.active ? "bg-blue-500 text-white" :
                  stage.active ? "bg-emerald-500 text-white" :
                  "bg-slate-200 text-slate-500"
                )}>
                  {stage.label}
                </div>
              ))}
            </div>

            {/* Detail KPI row */}
            <div className="grid grid-cols-5 gap-1 mb-2">
              <div className="bg-white rounded border border-slate-200 p-1.5">
                <span className="text-[5px] text-slate-500">Ara cəm (ƏDV-siz)</span>
                <div className="text-[8px] font-bold text-slate-900">59,709.72 AZN</div>
                <div className="text-[4px] text-slate-400">ƏDV (18%): 10,747.75</div>
              </div>
              <div className="bg-blue-50 rounded border border-blue-200 p-1.5">
                <span className="text-[5px] text-slate-500">Ümumi məbləğ</span>
                <div className="text-[8px] font-bold text-blue-700">70,457.47 AZN</div>
              </div>
              <div className="bg-white rounded border border-slate-200 p-1.5">
                <span className="text-[5px] text-slate-500">Qalıq borc</span>
                <div className="text-[8px] font-bold text-red-600">70,457.47 AZN</div>
              </div>
              <div className="bg-white rounded border border-slate-200 p-1.5">
                <span className="text-[5px] text-slate-500">Ödənilib</span>
                <div className="text-[8px] font-bold text-slate-900">0.00 AZN</div>
              </div>
              <div className="bg-white rounded border border-slate-200 p-1.5">
                <span className="text-[5px] text-slate-500">Ödəniş günü</span>
                <div className="text-[8px] font-bold text-slate-900">26 gün</div>
              </div>
            </div>

            {/* Line items table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[2fr_0.5fr_0.7fr_0.7fr] gap-1 px-2 py-1 bg-slate-50 border-b border-slate-200 text-[5px] font-semibold text-slate-500 uppercase">
                <span>Təsvir</span>
                <span>Say</span>
                <span>Qiymət</span>
                <span>Cəm</span>
              </div>
              {lineItems.map((item, i) => (
                <div key={i} className={cn(
                  "grid grid-cols-[2fr_0.5fr_0.7fr_0.7fr] gap-1 px-2 py-[3px] text-[6px]",
                  i < lineItems.length - 1 && "border-b border-slate-100"
                )}>
                  <span className="text-slate-700">{item.desc}</span>
                  <span className="text-slate-500 text-center">{item.qty}</span>
                  <span className="text-slate-600">{item.price}</span>
                  <span className="font-semibold text-slate-900">{item.total}</span>
                </div>
              ))}
              <div className="grid grid-cols-[2fr_0.5fr_0.7fr_0.7fr] gap-1 px-2 py-1 bg-slate-50 border-t border-slate-200 text-[6px]">
                <span className="font-bold text-slate-900 col-span-3 text-right">Cəmi:</span>
                <span className="font-bold text-slate-900">₼8,145.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
