"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft, Pencil, Trash2, CalendarDays, MapPin, Globe, Users,
  DollarSign, UserPlus, CheckCircle2, XCircle, Clock, TrendingUp,
  Mail, Phone, Search, X, UserCheck, Send, MailCheck, MailX, Loader2, Link2, Check,
} from "lucide-react"
import { EventForm } from "@/components/event-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  registration_open: "bg-violet-100 text-violet-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
}

const STATUS_PIPELINE = ["planned", "registration_open", "in_progress", "completed"]

const PARTICIPANT_STATUS_STYLE: Record<string, string> = {
  registered: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  attended: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-700",
}

const ROLE_STYLE: Record<string, string> = {
  attendee: "bg-gray-100 text-gray-600",
  speaker: "bg-purple-100 text-purple-700",
  sponsor: "bg-amber-100 text-amber-700",
  organizer: "bg-blue-100 text-blue-700",
  vip: "bg-yellow-100 text-yellow-700",
}

export default function EventDetailPage() {
  const t = useTranslations("events")
  const tc = useTranslations("common")
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Registration link
  const [linkCopied, setLinkCopied] = useState(false)

  // Invitation
  const [sendingInvites, setSendingInvites] = useState(false)
  const [inviteResult, setInviteResult] = useState<string | null>(null)

  // Participant management
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [addMode, setAddMode] = useState<"crm" | "manual">("crm")
  const [contacts, setContacts] = useState<any[]>([])
  const [contactSearch, setContactSearch] = useState("")
  const [pName, setPName] = useState("")
  const [pEmail, setPEmail] = useState("")
  const [pPhone, setPPhone] = useState("")
  const [pRole, setPRole] = useState("attendee")

  const getH = () => {
    const h: any = { "Content-Type": "application/json" }
    if (orgId) h["x-organization-id"] = String(orgId)
    return h
  }

  const fetchEvent = async () => {
    try {
      const h: any = orgId ? { "x-organization-id": String(orgId) } : {}
      const res = await fetch(`/api/v1/events/${params.id}?_t=${Date.now()}`, {
        headers: h,
        cache: "no-store",
      })
      const json = await res.json()
      if (json.success) setEvent(json.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { if (params.id) fetchEvent() }, [params.id, session])

  // Fetch CRM contacts for picker
  useEffect(() => {
    if (!showAddPanel || addMode !== "crm") return
    fetch(`/api/v1/contacts?limit=200`, { headers: getH() }).then(r => r.json()).then(json => {
      setContacts(json.data?.contacts || json.data || [])
    }).catch(() => {})
  }, [showAddPanel, addMode])

  const updateStatus = async (status: string) => {
    await fetch(`/api/v1/events/${params.id}`, {
      method: "PUT",
      headers: getH(),
      body: JSON.stringify({ status }),
    })
    await fetchEvent()
  }

  const handleDelete = async () => {
    await fetch(`/api/v1/events/${params.id}`, { method: "DELETE", headers: getH() })
    router.push("/events")
  }

  const addParticipantFromContact = async (contact: any) => {
    await fetch(`/api/v1/events/${params.id}/participants`, {
      method: "POST",
      headers: getH(),
      body: JSON.stringify({
        contactId: contact.id,
        companyId: contact.companyId || undefined,
        name: contact.fullName,
        email: contact.email || "",
        phone: contact.phone || "",
        role: pRole,
      }),
    })
    await fetchEvent()
  }

  const addManualParticipant = async () => {
    if (!pName.trim()) return
    await fetch(`/api/v1/events/${params.id}/participants`, {
      method: "POST",
      headers: getH(),
      body: JSON.stringify({ name: pName, email: pEmail, phone: pPhone, role: pRole }),
    })
    setPName(""); setPEmail(""); setPPhone("")
    await fetchEvent()
  }

  const sendInvitesToAll = async () => {
    const ids = (event.participants || []).filter((p: any) => p.email && p.inviteStatus !== "sent").map((p: any) => p.id)
    if (ids.length === 0) { setInviteResult("All participants already invited"); return }
    setSendingInvites(true)
    setInviteResult(null)
    try {
      const res = await fetch(`/api/v1/events/${params.id}/participants`, {
        method: "PATCH",
        headers: getH(),
        body: JSON.stringify({ action: "send_invites", participantIds: ids }),
      })
      const json = await res.json()
      if (json.success) {
        const d = json.data
        setInviteResult(d.smtpConfigured
          ? `Sent ${d.sent}/${d.total} invitations via email`
          : `Marked ${d.total} as invited (SMTP not configured — configure in Settings → SMTP)`)
      }
      await fetchEvent()
    } catch { setInviteResult("Error sending invitations") }
    finally { setSendingInvites(false) }
  }

  const sendInviteToOne = async (participantId: string) => {
    try {
      const res = await fetch(`/api/v1/events/${params.id}/participants`, {
        method: "PATCH",
        headers: getH(),
        body: JSON.stringify({ action: "send_invites", participantIds: [participantId] }),
      })
      const json = await res.json()
      if (json.success) {
        setInviteResult(json.data?.smtpConfigured
          ? `Sent invitation to 1 participant`
          : `Marked as invited (SMTP not configured)`)
      }
    } catch {}
    await fetchEvent()
  }

  const updateParticipantField = async (participantId: string, field: string, value: string) => {
    await fetch(`/api/v1/events/${params.id}/participants`, {
      method: "PATCH",
      headers: getH(),
      body: JSON.stringify({ participantId, [field]: value }),
    })
    await fetchEvent()
  }

  const removeParticipant = async (participantId: string) => {
    try {
      await fetch(`/api/v1/events/${params.id}/participants`, {
        method: "DELETE",
        headers: getH(),
        body: JSON.stringify({ participantId }),
      })
    } catch {}
    await fetchEvent()
  }

  const updateParticipantStatus = async (participantId: string, status: string) => {
    const participant = event.participants?.find((p: any) => p.id === participantId)
    if (!participant) return
    const attendedDelta = status === "attended" ? 1 : participant.status === "attended" ? -1 : 0
    if (attendedDelta !== 0) {
      await fetch(`/api/v1/events/${params.id}`, {
        method: "PUT",
        headers: getH(),
        body: JSON.stringify({ attendedCount: Math.max(0, (event.attendedCount || 0) + attendedDelta) }),
      })
    }
    await fetchEvent()
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-3">{[0,1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div>
      </div>
    )
  }

  if (!event) return <div className="text-center py-12 text-muted-foreground">{tc("noData")}</div>

  const roi = event.actualRevenue > 0 && event.actualCost > 0
    ? Math.round(((event.actualRevenue - event.actualCost) / event.actualCost) * 100) : null
  const attendanceRate = event.registeredCount > 0
    ? Math.round((event.attendedCount / event.registeredCount) * 100) : 0

  // Filter contacts for picker (exclude already added)
  const existingContactIds = new Set((event.participants || []).map((p: any) => p.contactId).filter(Boolean))
  const filteredContacts = contacts.filter(c =>
    !existingContactIds.has(c.id) &&
    (c.fullName?.toLowerCase().includes(contactSearch.toLowerCase()) ||
     c.email?.toLowerCase().includes(contactSearch.toLowerCase()))
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/events")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold truncate">{event.name}</h1>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLES[event.status] || ""}>{event.status?.replace(/_/g, " ")}</Badge>
                <Badge variant="outline" className="text-xs">{event.type}</Badge>
                {event.isOnline && <Badge variant="outline" className="text-xs"><Globe className="h-3 w-3 mr-1" /> {t("online")}</Badge>}
                {event.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const url = `${window.location.origin}/events/${event.id}/register`
            navigator.clipboard.writeText(url)
            setLinkCopied(true)
            setTimeout(() => setLinkCopied(false), 2000)
          }}>
            {linkCopied ? <Check className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Link2 className="h-3.5 w-3.5 mr-1" />}
            {linkCopied ? tc("saved") : t("register")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> {tc("edit")}
          </Button>
          <Button variant="outline" size="sm" className="text-red-500" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> {tc("delete")}
          </Button>
        </div>
      </div>

      {/* Status pipeline */}
      <div className="flex gap-1">
        {STATUS_PIPELINE.map((s) => {
          const idx = STATUS_PIPELINE.indexOf(event.status)
          const isActive = s === event.status
          const isPast = STATUS_PIPELINE.indexOf(s) < idx
          return (
            <button key={s} onClick={() => updateStatus(s)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                isActive ? "bg-primary text-white shadow-md" :
                isPast ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >{s.replace(/_/g, " ")}</button>
          )
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-blue-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("participants")}</span>
            <Users className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{event.registeredCount}</span>
          {event.maxParticipants > 0 && <span className="text-xs opacity-60"> / {event.maxParticipants}</span>}
        </div>
        <div className="bg-green-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Attended</span>
            <CheckCircle2 className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{event.attendedCount}</span>
          <span className="text-xs opacity-60"> ({attendanceRate}%)</span>
        </div>
        <div className="bg-violet-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{t("budget")}</span>
            <DollarSign className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{event.budget?.toLocaleString()} ₼</span>
        </div>
        <div className="bg-amber-500 text-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">Revenue</span>
            <TrendingUp className="h-4 w-4 opacity-80" />
          </div>
          <span className="text-2xl font-bold">{(event.actualRevenue || 0).toLocaleString()} ₼</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 h-auto">
          <TabsTrigger value="general" className="rounded-md text-sm">{tc("details")}</TabsTrigger>
          <TabsTrigger value="financial" className="rounded-md text-sm">{tc("budget")}</TabsTrigger>
          <TabsTrigger value="participants" className="rounded-md text-sm">
            {t("participants")} ({event.participants?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t("title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: tc("type"), value: event.type },
                  { label: tc("startDate"), value: new Date(event.startDate).toLocaleString("ru-RU") },
                  { label: tc("endDate"), value: event.endDate ? new Date(event.endDate).toLocaleString("ru-RU") : "—" },
                  { label: t("location"), value: event.location || "—" },
                  { label: t("online"), value: event.isOnline ? tc("yes") : tc("no") },
                  { label: "Meeting URL", value: event.meetingUrl || "—" },
                  { label: tc("createdAt"), value: new Date(event.createdAt).toLocaleString("ru-RU") },
                ].map(d => (
                  <div key={d.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium truncate max-w-[60%] text-right">{d.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{tc("description")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{event.description || tc("noData")}</p>
                {event.tags?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t">
                    {event.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{tc("cost")} & {tc("revenue")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: tc("budget"), value: `${(event.budget || 0).toLocaleString()} ₼` },
                  { label: tc("cost"), value: `${(event.actualCost || 0).toLocaleString()} ₼` },
                  { label: tc("revenue"), value: `${(event.expectedRevenue || 0).toLocaleString()} ₼` },
                  { label: tc("revenue"), value: `${(event.actualRevenue || 0).toLocaleString()} ₼` },
                ].map(f => (
                  <div key={f.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-medium">{f.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">KPIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Cost per attendee", value: event.attendedCount > 0 ? `${Math.round((event.actualCost || 0) / event.attendedCount)} ₼` : "—" },
                  { label: "Revenue per attendee", value: event.attendedCount > 0 ? `${Math.round((event.actualRevenue || 0) / event.attendedCount)} ₼` : "—" },
                  { label: "ROI", value: roi !== null ? `${roi}%` : "—" },
                  { label: "Attendance rate", value: `${attendanceRate}%` },
                  { label: "Budget utilization", value: event.budget > 0 ? `${Math.round(((event.actualCost || 0) / event.budget) * 100)}%` : "—" },
                ].map(k => (
                  <div key={k.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{k.label}</span>
                    <span className="font-semibold">{k.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Participants tab */}
        <TabsContent value="participants" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">{event.participants?.length || 0} {t("participants")}</p>
              {event.participants?.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-green-600">
                    <MailCheck className="h-3 w-3" />
                    {(event.participants || []).filter((p: any) => p.inviteStatus === "sent").length} invited
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MailX className="h-3 w-3" />
                    {(event.participants || []).filter((p: any) => p.inviteStatus !== "sent").length} not sent
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {event.participants?.length > 0 && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={sendInvitesToAll} disabled={sendingInvites}>
                  {sendingInvites ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Send All Invitations
                </Button>
              )}
              <Button size="sm" className="gap-1" onClick={() => setShowAddPanel(!showAddPanel)}>
                <UserPlus className="h-3.5 w-3.5" /> {showAddPanel ? tc("close") : tc("add")}
              </Button>
            </div>
          </div>

          {inviteResult && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm">
              <MailCheck className="h-4 w-4" />
              {inviteResult}
              <button onClick={() => setInviteResult(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {/* Add participant panel */}
          {showAddPanel && (
            <Card className="border-2 border-dashed border-primary/30 shadow-sm">
              <CardContent className="p-4 space-y-3">
                {/* Mode toggle */}
                <div className="flex gap-1">
                  <Button size="sm" variant={addMode === "crm" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAddMode("crm")}>
                    <Users className="h-3 w-3 mr-1" /> From CRM Contacts
                  </Button>
                  <Button size="sm" variant={addMode === "manual" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAddMode("manual")}>
                    <UserPlus className="h-3 w-3 mr-1" /> Manual Entry
                  </Button>
                </div>

                {/* Role selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Role:</label>
                  <select className="h-7 border rounded-md px-2 text-xs" value={pRole} onChange={e => setPRole(e.target.value)}>
                    {["attendee","speaker","sponsor","organizer","vip"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {addMode === "crm" ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        className="pl-8 h-8 text-sm"
                        placeholder="Search contacts by name or email..."
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredContacts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">{tc("noResults")}</p>
                      ) : (
                        filteredContacts.slice(0, 20).map(contact => (
                          <div
                            key={contact.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => addParticipantFromContact(contact)}
                          >
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {contact.fullName?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{contact.fullName}</p>
                              <p className="text-[10px] text-muted-foreground">{contact.email || contact.company?.name || "—"}</p>
                            </div>
                            <UserPlus className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="text-xs text-muted-foreground">Name *</label>
                      <Input className="h-8 w-44" value={pName} onChange={e => setPName(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Email</label>
                      <Input className="h-8 w-44" value={pEmail} onChange={e => setPEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Phone</label>
                      <Input className="h-8 w-36" value={pPhone} onChange={e => setPPhone(e.target.value)} />
                    </div>
                    <Button size="sm" className="h-8" onClick={addManualParticipant}>{tc("add")}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Participants table */}
          {event.participants?.length > 0 ? (
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left p-3 font-medium text-muted-foreground">{tc("name")}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{tc("contact")}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{tc("type")}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{tc("status")}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{tc("send")}</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">{t("date")}</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">{tc("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.participants.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {p.name?.charAt(0) || "?"}
                            </div>
                            <span className="font-medium">{p.name}</span>
                            {p.contactId && <Badge variant="outline" className="text-[9px]">CRM</Badge>}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                          {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                          {!p.email && !p.phone && "—"}
                        </td>
                        <td className="p-3">
                          <select
                            className={`text-xs font-medium border-0 rounded-full px-2 py-0.5 cursor-pointer ${ROLE_STYLE[p.role] || "bg-gray-100 text-gray-600"}`}
                            value={p.role}
                            onChange={e => updateParticipantField(p.id, "role", e.target.value)}
                          >
                            {["attendee","speaker","sponsor","organizer","vip"].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            className={`text-xs font-medium border-0 rounded-full px-2 py-0.5 cursor-pointer ${PARTICIPANT_STATUS_STYLE[p.status] || ""}`}
                            value={p.status}
                            onChange={e => updateParticipantField(p.id, "status", e.target.value)}
                          >
                            {["registered","confirmed","attended","cancelled","no_show"].map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                          </select>
                        </td>
                        <td className="p-3">
                          {p.inviteStatus === "sent" ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <MailCheck className="h-3 w-3" />
                                {p.invitedAt ? new Date(p.invitedAt).toLocaleDateString("ru-RU") : "Sent"}
                              </span>
                              {p.email && (
                                <button
                                  onClick={() => sendInviteToOne(p.id)}
                                  className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline"
                                  title="Resend invitation"
                                >
                                  Resend
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => sendInviteToOne(p.id)}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors font-medium"
                              title={p.email ? "Send invitation" : "No email"}
                              disabled={!p.email}
                            >
                              <Send className="h-3 w-3" />
                              {p.email ? "Send invite" : "No email"}
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(p.registeredAt).toLocaleDateString("ru-RU")}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Remove"
                              onClick={() => removeParticipant(p.id)}>
                              <X className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{tc("noData")}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EventForm open={editOpen} onOpenChange={setEditOpen} onSaved={fetchEvent} orgId={orgId} initialData={event} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDelete} title={t("deleteEvent")} itemName={event.name} />
    </div>
  )
}
