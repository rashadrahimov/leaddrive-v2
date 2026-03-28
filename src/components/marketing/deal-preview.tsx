"use client"

import {
  LayoutDashboard, Building2, UserCheck, Briefcase,
  Target, FileText, Receipt, Headphones, Bot,
  DollarSign, TrendingUp, Clock, CheckCircle2,
  Search, Bell, Settings, ArrowLeft, Star,
  Shield, Zap, BarChart3, Phone, Mail,
  Calendar, MessageSquare, User, MapPin,
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
]

/* ── Pipeline stages ── */
const stages = [
  { label: "Lid", active: false, done: true },
  { label: "Kvalifikasiya", active: false, done: true },
  { label: "Təklif", active: true, done: false },
  { label: "Danışıq", active: false, done: false },
  { label: "Qazanıldı", active: false, done: false },
]

/* ── Next Best Offers ── */
const offers = [
  { name: "Cybersecurity Suite", desc: "Firewall, təhdid idarəsi, monitorinq", price: "₼3,600", match: 96, type: "product" },
  { name: "24/7 Technical Support", desc: "SLA ilə round-the-clock dəstək", price: "₼1,500", match: 88, type: "service" },
  { name: "Managed Backup Service", desc: "Gündəlik backup + disaster recovery", price: "₼800", match: 74, type: "service" },
]

/* ── Activity timeline ── */
const activities = [
  { type: "call", text: "Əlaqədar ilə telefon danışığı", time: "Bu gün, 14:30", user: "Emil R." },
  { type: "email", text: "Təklif sənədi göndərildi", time: "Dünən, 16:20", user: "Rəşad R." },
  { type: "meeting", text: "Demo görüşü keçirildi", time: "25/03, 11:00", user: "Nigar H." },
  { type: "note", text: "Müştəri büdcəni təsdiqlədi", time: "23/03, 09:45", user: "Emil R." },
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

        <div className="p-3">
          {/* Back + Deal header */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowLeft className="w-2.5 h-2.5 text-slate-400" />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-900">Firewall</span>
                <span className="bg-orange-100 text-orange-700 text-[5px] font-medium px-1 py-[1px] rounded">Lid</span>
              </div>
              <span className="text-[6px] text-slate-500">AlGroup • Elçin Məmmədov</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="bg-blue-500 rounded-md px-2 py-0.5 text-[6px] text-white font-medium">Sövdələşməyə çevir</div>
              <div className="bg-slate-100 rounded-md px-2 py-0.5 text-[6px] text-slate-600">⋯</div>
            </div>
          </div>

          {/* Pipeline stages */}
          <div className="flex gap-[2px] mb-2">
            {stages.map((stage, i) => (
              <div key={i} className={cn(
                "flex-1 py-[3px] text-center text-[5px] font-medium rounded-sm",
                stage.done ? "bg-blue-500 text-white" :
                stage.active ? "bg-blue-500 text-white" :
                "bg-slate-200 text-slate-500"
              )}>
                {stage.label}
              </div>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <div className="bg-blue-500 text-white rounded-lg p-1.5">
              <span className="text-[5px] opacity-80">Planlaşan gün</span>
              <div className="text-[10px] font-bold">21</div>
            </div>
            <div className="bg-blue-400 text-white rounded-lg p-1.5">
              <span className="text-[5px] opacity-80">Mərhələdə gün</span>
              <div className="text-[10px] font-bold">21</div>
            </div>
            <div className="bg-emerald-500 text-white rounded-lg p-1.5">
              <span className="text-[5px] opacity-80">Sövdələşmə dəyəri</span>
              <div className="text-[10px] font-bold">₼2,500</div>
            </div>
            <div className="bg-orange-500 text-white rounded-lg p-1.5">
              <span className="text-[5px] opacity-80">Qazanma ehtimalı</span>
              <div className="text-[10px] font-bold">50%</div>
            </div>
          </div>

          {/* Progress bars */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white rounded-lg border border-slate-200 p-1.5">
              <div className="flex justify-between mb-0.5">
                <span className="text-[6px] font-medium text-slate-700">Ehtimal</span>
                <span className="text-[6px] font-semibold text-slate-900">11%</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: "11%" }} />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-1.5">
              <div className="flex justify-between mb-0.5">
                <span className="text-[6px] font-medium text-slate-700">Güvən səviyyəsi</span>
                <span className="text-[6px] font-semibold text-slate-900">50%</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "50%" }} />
              </div>
            </div>
          </div>

          {/* Two-column: Next Best Offers + Contact info */}
          <div className="grid grid-cols-[1.5fr_1fr] gap-2 mb-2">
            {/* Next Best Offers (AI) */}
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <div className="flex items-center gap-1 mb-1.5">
                <Zap className="w-2.5 h-2.5 text-orange-500" />
                <span className="text-[7px] font-bold text-slate-900">Next Best Offers</span>
              </div>
              <div className="space-y-1">
                {offers.map((offer, i) => (
                  <div key={i} className="flex items-center gap-2 p-1 rounded-md bg-slate-50 border border-slate-100">
                    <div className="w-5 h-5 bg-gradient-to-br from-violet-500 to-blue-500 rounded-md flex items-center justify-center flex-shrink-0">
                      <Shield className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[6px] font-semibold text-slate-900">{offer.name}</div>
                      <div className="text-[5px] text-slate-500 truncate">{offer.desc}</div>
                      <div className="text-[5px] text-slate-600 font-medium">{offer.price}</div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[5px] font-bold flex-shrink-0",
                      offer.match >= 90 ? "bg-emerald-100 text-emerald-700" :
                      offer.match >= 80 ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {offer.match}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact card */}
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <span className="text-[6px] font-semibold text-slate-700">Əlaqədar şəxs</span>
              <div className="mt-1.5 flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-blue-600" />
                </div>
                <div>
                  <div className="text-[7px] font-semibold text-slate-900">Elçin Məmmədov</div>
                  <div className="text-[5px] text-slate-500">IT Director • AlGroup</div>
                </div>
              </div>
              <div className="space-y-1 text-[5px]">
                <div className="flex items-center gap-1 text-slate-600">
                  <Phone className="w-2 h-2" /> +994 50 123 45 67
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Mail className="w-2 h-2" /> elchin@algroup.az
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <MapPin className="w-2 h-2" /> Bakı, Azərbaycan
                </div>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="bg-white rounded-lg border border-slate-200 p-2">
            <span className="text-[6px] font-semibold text-slate-700">Fəaliyyət tarixçəsi</span>
            <div className="mt-1.5 space-y-1">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 py-[2px] border-b border-slate-50 last:border-0">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    a.type === "call" ? "bg-green-100" :
                    a.type === "email" ? "bg-blue-100" :
                    a.type === "meeting" ? "bg-purple-100" :
                    "bg-slate-100"
                  )}>
                    {a.type === "call" && <Phone className="w-2 h-2 text-green-600" />}
                    {a.type === "email" && <Mail className="w-2 h-2 text-blue-600" />}
                    {a.type === "meeting" && <Calendar className="w-2 h-2 text-purple-600" />}
                    {a.type === "note" && <MessageSquare className="w-2 h-2 text-slate-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-[6px] text-slate-700">{a.text}</div>
                    <div className="text-[5px] text-slate-400">{a.time} • {a.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
