"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { MiniLineChart } from "@/components/charts/mini-charts"
import { cn } from "@/lib/utils"
import {
  CalendarDays,
  MapPin,
  Users,
  Video,
  Building2,
  Plus,
  Copy,
  Mail,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  TrendingUp,
  DollarSign,
  BarChart3,
  Landmark,
  UserCheck,
  Mic2,
  Shield,
  Star,
  Heart,
  Link2,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Event {
  id: string
  name: string
  type: string
  status: string
  startDate?: string
  endDate?: string
  location?: string
  isOnline?: boolean
  capacity?: number
  registeredCount?: number
  budget?: number
  description?: string
  createdAt: string
}

interface EventsAnalyticsProps {
  events: Event[]
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_ATTENDEES = [
  { id: "a1", name: "Ramin Əliyev", company: "TechAz", role: "Speaker", initials: "RƏ" },
  { id: "a2", name: "Leyla Hüseynova", company: "DataSoft", role: "Organizer", initials: "LH" },
  { id: "a3", name: "Orxan Məmmədov", company: "CloudBaku", role: "VIP", initials: "OM" },
  { id: "a4", name: "Nigar İsmayılova", company: "Güvən Tech", role: "Attendee", initials: "Nİ" },
  { id: "a5", name: "Farid Həsənov", company: "AzInnovate", role: "Sponsor", initials: "FH" },
  { id: "a6", name: "Aynur Quliyeva", company: "StartHub", role: "Attendee", initials: "AQ" },
  { id: "a7", name: "Elvin Rzayev", company: "BakuDev", role: "Speaker", initials: "ER" },
  { id: "a8", name: "Səbinə Nəsirova", company: "DigiServ", role: "VIP", initials: "SN" },
]

const MOCK_BUDGET = {
  total: 8500,
  spent: 6200,
  revenue: 22400,
  roiPercent: 261,
  perAttendee: 52,
}

const MOCK_CALENDAR = [
  { id: "c1", name: "DevOps Meetup #12", date: "2026-04-12", location: "Coworking Hub", attendees: 45, status: "open" },
  { id: "c2", name: "AI/ML Workshop", date: "2026-04-18", location: "Zoom", attendees: 120, status: "planned" },
  { id: "c3", name: "Startup Pitch Day", date: "2026-04-25", location: "Hilton Baku", attendees: 200, status: "open" },
  { id: "c4", name: "Cloud Migration Conf", date: "2026-05-03", location: "Ofis", attendees: 80, status: "planned" },
  { id: "c5", name: "CTO Networking", date: "2026-05-10", location: "Landmark", attendees: 35, status: "completed" },
]

const MOCK_REGISTRATION_CHART_DATA = [5, 12, 18, 25, 33, 42, 56, 68, 80, 95, 108, 120]

const MOCK_INVITE_STATS = {
  sent: 240,
  opened: 186,
  confirmed: 120,
  declined: 18,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

const STATUS_MAP: Record<string, { labelKey: string; className: string }> = {
  open: { labelKey: "statusRegistrationOpen", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  planned: { labelKey: "statusPlanned", className: "bg-primary/10 text-primary border-primary/20" },
  completed: { labelKey: "statusCompleted", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { labelKey: "statusCancelled", className: "bg-red-500/10 text-red-400 border-red-500/20" },
}

const ROLE_STYLES: Record<string, string> = {
  Speaker: "bg-[hsl(var(--ai-from))]/10 text-[hsl(var(--ai-from))] border-[hsl(var(--ai-from))]/20",
  Organizer: "bg-primary/10 text-primary border-primary/20",
  VIP: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Attendee: "bg-muted text-muted-foreground border-border",
  Sponsor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  Speaker: <Mic2 className="w-3 h-3" />,
  Organizer: <Shield className="w-3 h-3" />,
  VIP: <Star className="w-3 h-3" />,
  Attendee: <UserCheck className="w-3 h-3" />,
  Sponsor: <Heart className="w-3 h-3" />,
}

const CALENDAR_DOT_COLORS: Record<string, string> = {
  open: "bg-emerald-400",
  planned: "bg-primary",
  completed: "bg-muted-foreground/40",
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EventsAnalytics({ events }: EventsAnalyticsProps) {
  const t = useTranslations("events")
  const tc = useTranslations("common")
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    events.length > 0 ? events[0].id : null
  )

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? events[0]

  const totalEvents = events.length
  const openCount = events.filter((e) => e.status === "open").length
  const plannedCount = events.filter((e) => e.status === "planned").length
  const completedCount = events.filter((e) => e.status === "completed").length

  const capacity = selectedEvent?.capacity ?? 150
  const registered = selectedEvent?.registeredCount ?? 120

  return (
    <div className="space-y-4">
      {/* ── Top Row: Events List + Attendees ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Events list (wider) */}
        <div className="lg:col-span-3 bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-400" />
              {t("title")}
            </h3>
            <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" />
              {t("newEvent")}
            </button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">{t("noEventsYet")}</div>
          ) : (
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {events.map((ev) => {
                const st = STATUS_MAP[ev.status] ?? STATUS_MAP.planned
                const isSelected = ev.id === selectedEventId
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      isSelected
                        ? "bg-violet-500/10 border border-violet-500/20"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                      ev.isOnline ? "bg-blue-500/10" : "bg-emerald-500/10"
                    )}>
                      {ev.isOnline ? (
                        <Video className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Building2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{ev.name}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0", st.className)}>
                          {t(st.labelKey)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(ev.startDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ev.isOnline ? "Zoom" : ev.location || t("location")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {ev.registeredCount ?? 0}/{ev.capacity ?? "—"}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Attendees for selected event */}
        <div className="lg:col-span-2 bg-card rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              {t("participants")} — {selectedEvent?.name ?? "—"}
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 tabular-nums">
              {registered}/{capacity}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
            {MOCK_ATTENDEES.map((att) => (
              <div key={att.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                {/* Avatar */}
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-violet-300">{att.initials}</span>
                </div>
                {/* Name + company */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{att.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{att.company}</p>
                </div>
                {/* Role badge */}
                <span className={cn(
                  "shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                  ROLE_STYLES[att.role] ?? ROLE_STYLES.Attendee
                )}>
                  {ROLE_ICONS[att.role]}
                  {t(`role${att.role}`)}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom stats */}
          <div className="mt-4 pt-3 border-t grid grid-cols-4 gap-2">
            {[
              { label: t("inviteSent"), value: MOCK_INVITE_STATS.sent, icon: <Send className="w-3 h-3" />, color: "text-blue-400" },
              { label: t("inviteOpened"), value: MOCK_INVITE_STATS.opened, icon: <Eye className="w-3 h-3" />, color: "text-amber-400" },
              { label: t("inviteConfirmed"), value: MOCK_INVITE_STATS.confirmed, icon: <CheckCircle2 className="w-3 h-3" />, color: "text-emerald-400" },
              { label: t("inviteDeclined"), value: MOCK_INVITE_STATS.declined, icon: <XCircle className="w-3 h-3" />, color: "text-red-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className={cn("flex items-center justify-center gap-1 text-xs mb-0.5", s.color)}>
                  {s.icon}
                  <span className="font-bold tabular-nums">{s.value}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Budget + Calendar + Registration ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget & ROI */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            {t("budgetAndRoi")}
          </h3>

          <div className="space-y-3">
            {/* Budget row */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t("budget")}</span>
                <span className="font-bold tabular-nums">{"\u20BC"}{fmt(MOCK_BUDGET.total)}</span>
              </div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{t("spent")}</span>
                <span className="font-bold tabular-nums">{"\u20BC"}{fmt(MOCK_BUDGET.spent)}</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min((MOCK_BUDGET.spent / MOCK_BUDGET.total) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Revenue */}
            <div className="flex items-center justify-between text-xs pt-2 border-t">
              <span className="text-muted-foreground">{t("revenue")}</span>
              <span className="font-bold text-emerald-400 tabular-nums">{"\u20BC"}{fmt(MOCK_BUDGET.revenue)}</span>
            </div>

            {/* ROI */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ROI</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                +{MOCK_BUDGET.roiPercent}%
              </span>
            </div>

            {/* Per attendee */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("perAttendee")}</span>
              <span className="font-bold tabular-nums">{"\u20BC"}{fmt(MOCK_BUDGET.perAttendee)}</span>
            </div>
          </div>
        </div>

        {/* Event Calendar */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <CalendarCheck className="w-4 h-4 text-blue-400" />
            {t("eventCalendar")}
          </h3>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {MOCK_CALENDAR.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                {/* Colored dot */}
                <div className={cn("shrink-0 w-2.5 h-2.5 rounded-full", CALENDAR_DOT_COLORS[item.status] ?? "bg-muted-foreground/40")} />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span>{formatShortDate(item.date)}</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {item.location}
                    </span>
                  </div>
                </div>
                {/* Attendee count */}
                <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                  <Users className="w-3 h-3" />
                  {item.attendees}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Registration Portal */}
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Link2 className="w-4 h-4 text-amber-400" />
            {t("registrationPortal")}
          </h3>

          {/* Registration link */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 mb-4">
            <code className="flex-1 text-xs text-muted-foreground truncate">leaddrivecrm.org/r/ev014</code>
            <button className="shrink-0 p-1 rounded hover:bg-muted transition-colors" title={tc("copy")}>
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mb-4">
            {[
              { label: t("invite"), icon: <Mail className="w-3.5 h-3.5" />, className: "bg-violet-600 hover:bg-violet-500 text-white" },
              { label: "ICS", icon: <CalendarDays className="w-3.5 h-3.5" />, className: "bg-muted hover:bg-muted/80 text-foreground" },
              { label: t("confirm"), icon: <CheckCircle2 className="w-3.5 h-3.5" />, className: "bg-muted hover:bg-muted/80 text-foreground" },
            ].map((btn) => (
              <button
                key={btn.label}
                className={cn("flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors", btn.className)}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* Registration dynamics mini chart */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("registrationDynamics")}</p>
            <MiniLineChart data={MOCK_REGISTRATION_CHART_DATA} color="stroke-violet-400" />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
              <span>{t("weeksAgo", { count: 4 })}</span>
              <span className="font-medium text-foreground tabular-nums">{t("registrationsCount", { count: registered })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
