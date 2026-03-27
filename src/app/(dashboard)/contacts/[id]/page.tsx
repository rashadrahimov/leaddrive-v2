"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { ArrowLeft, Mail, Phone, Building2, Pencil, Calendar, MessageSquare, Plus, X, Loader2, Sparkles, Star, DollarSign, Activity, Tag, CheckCircle2, Clock } from "lucide-react"
import { ColorStatCard } from "@/components/color-stat-card"

interface Activity {
  id: string
  type: string
  subject?: string
  description?: string
  createdAt: string
}

interface Contact {
  id: string
  fullName: string
  email?: string
  phone?: string
  phones: string[]
  position?: string
  department?: string
  source?: string
  tags: string[]
  isActive: boolean
  lastContactAt?: string
  companyId?: string
  company?: { id: string; name: string }
  activities?: Activity[]
}

const activityIcons: Record<string, string> = {
  email: "📧", call: "📞", meeting: "🤝", note: "📝", task: "✅",
}

// Lazy import engagement tab — same component as deal engagement but with contact API
function ContactEngagement({ contactId, orgId }: { contactId: string; orgId?: string }) {
  const tc = useTranslations("common")
  const [Comp, setComp] = useState<any>(null)
  useEffect(() => {
    import("@/components/deals/engagement-tab").then(m => setComp(() => m.EngagementTab))
  }, [])
  if (!Comp) return <div className="text-center py-8 text-sm text-muted-foreground">{tc("loading")}</div>
  // EngagementTab uses dealId but we pass contactId — we need contact-specific API
  // Instead, fetch directly and render inline
  return <ContactEngagementInner contactId={contactId} orgId={orgId} />
}

function ContactEngagementInner({ contactId, orgId }: { contactId: string; orgId?: string }) {
  const tc = useTranslations("common")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const headers: any = orgId ? { "x-organization-id": orgId } : {}
    fetch(`/api/v1/contacts/${contactId}/engagement`, { headers })
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .finally(() => setLoading(false))
  }, [contactId, orgId])

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">No engagement data</p>

  const items = [
    { label: "Calls", value: data.activities.calls, emoji: "📞" },
    { label: "Emails", value: data.activities.emails, emoji: "📧" },
    { label: "Meetings", value: data.activities.meetings, emoji: "🤝" },
    { label: "Notes", value: data.activities.notes, emoji: "📝" },
    { label: "Tasks", value: data.activities.tasks, emoji: "✅" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {items.map(i => (
          <Card key={i.label} className="border-none shadow-sm">
            <CardContent className="p-3 text-center">
              <p className="text-lg">{i.emoji}</p>
              <p className="text-xl font-bold">{i.value}</p>
              <p className="text-[10px] text-muted-foreground">{i.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {data.email.sent > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">Email Nurturing</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xl font-bold text-blue-600">{data.email.sent}</p><p className="text-[10px] text-muted-foreground">{tc("sent")}</p></div>
              <div><p className="text-xl font-bold text-green-600">{data.email.openRate}%</p><p className="text-[10px] text-muted-foreground">Open Rate</p></div>
              <div><p className="text-xl font-bold text-orange-600">{data.email.clickRate}%</p><p className="text-[10px] text-muted-foreground">Click Rate</p></div>
            </div>
          </CardContent>
        </Card>
      )}
      {data.lastActivity && (
        <p className="text-xs text-muted-foreground">
          Last activity: {data.lastActivity.type} — {data.lastActivity.subject} · {new Date(data.lastActivity.date).toLocaleDateString("ru-RU")}
        </p>
      )}
    </div>
  )
}

export default function ContactDetailPage() {
  const t = useTranslations("contacts")
  const tc = useTranslations("common")
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const id = params.id as string
  const orgId = session?.user?.organizationId

  // AI Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false)
  const [editData, setEditData] = useState({
    fullName: "", email: "", phone: "", position: "", department: "", source: "",
    companyId: "", isActive: true, phones: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])

  const fetchContact = async () => {
    try {
      const res = await fetch(`/api/v1/contacts/${id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setContact(json.data)
      }
    } catch (err) { console.error(err) } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id && session) fetchContact()
  }, [id, session])

  const openEdit = () => {
    if (!contact) return
    setEditData({
      fullName: contact.fullName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      position: contact.position || "",
      department: contact.department || "",
      source: contact.source || "",
      companyId: contact.companyId || "",
      isActive: contact.isActive,
      phones: contact.phones || [],
    })
    setShowEdit(true)
    // Fetch companies for dropdown
    fetch("/api/v1/companies?limit=500", {
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
      .then(r => r.json())
      .then(json => {
        const list = json.data?.companies || json.data || []
        setCompanies(Array.isArray(list) ? list.map((c: any) => ({ id: c.id, name: c.name })) : [])
      })
      .catch(() => {})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/contacts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({
          fullName: editData.fullName,
          email: editData.email || undefined,
          phone: editData.phone || undefined,
          position: editData.position || undefined,
          department: editData.department || undefined,
          source: editData.source || undefined,
          companyId: editData.companyId || undefined,
          isActive: editData.isActive,
          phones: editData.phones.filter(p => p.trim()),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowEdit(false)
        fetchContact()
      }
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const addPhone = () => setEditData(d => ({ ...d, phones: [...d.phones, ""] }))
  const removePhone = (idx: number) => setEditData(d => ({ ...d, phones: d.phones.filter((_, i) => i !== idx) }))
  const updatePhone = (idx: number, val: string) => setEditData(d => ({
    ...d, phones: d.phones.map((p, i) => i === idx ? val : p),
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">{t("contactNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = contact.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{contact.fullName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{contact.position}</span>
                {contact.company && (
                  <>
                    <span>{t("at")}</span>
                    <button
                      onClick={() => router.push(`/companies/${contact.company!.id}`)}
                      className="text-primary hover:underline"
                    >
                      {contact.company!.name}
                    </button>
                  </>
                )}
              </div>
              {contact.email && <p className="text-xs text-muted-foreground mt-0.5">{contact.email}</p>}
              {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
              {/* Communication action buttons */}
              <div className="flex items-center gap-2 mt-2">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} title={t("call")} className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-sm">
                    <Phone className="h-3.5 w-3.5 text-white" />
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} title={tc("email")} className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors shadow-sm">
                    <Mail className="h-3.5 w-3.5 text-white" />
                  </a>
                )}
                {contact.phone && (
                  <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`} target="_blank" title="WhatsApp" className="h-8 w-8 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-sm">
                    <MessageSquare className="h-3.5 w-3.5 text-white" />
                  </a>
                )}
              </div>
              <div className="mt-1 flex gap-1">
                {contact.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={openEdit}>
          <Pencil className="h-4 w-4" />
          {tc("edit")}
        </Button>
      </div>

      {/* KPI Cards */}
      {(() => {
        const daysSince = contact.lastContactAt
          ? Math.floor((Date.now() - new Date(contact.lastContactAt).getTime()) / 86400000)
          : null
        const confColor = contact.isActive
          ? "bg-green-500 shadow-green-500/30"
          : "bg-slate-400 shadow-slate-400/30"
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ColorStatCard
              label={t("lastContact")}
              value={daysSince !== null ? `${daysSince} ${tc("days")}` : "—"}
              icon={<Clock className="h-4 w-4" />}
              color="blue"
            />
            <ColorStatCard
              label={tc("activities")}
              value={contact.activities?.length ?? 0}
              icon={<Activity className="h-4 w-4" />}
              color="violet"
            />
            <ColorStatCard
              label={tc("tags")}
              value={contact.tags?.length ?? 0}
              icon={<Tag className="h-4 w-4" />}
              color="teal"
            />
            <ColorStatCard
              label={tc("status")}
              value={contact.isActive ? tc("active") : tc("inactive")}
              icon={<CheckCircle2 className="h-4 w-4" />}
              bgClass={confColor}
            />
          </div>
        )
      })()}

      <Tabs defaultValue="activities">
        <TabsList>
          <TabsTrigger value="activities">{t("tabActivities")} ({contact.activities?.length || 0})</TabsTrigger>
          <TabsTrigger value="info">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="engagement">{t("tabEngagement")}</TabsTrigger>
          <TabsTrigger value="recommendations" onClick={() => {
            if (recommendations.length === 0 && !loadingRecs) {
              setLoadingRecs(true)
              fetch("/api/v1/ai/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
                body: JSON.stringify({ contactId: id }),
              }).then(r => r.json()).then(json => {
                if (json.success) setRecommendations(json.data.recommendations || [])
              }).finally(() => setLoadingRecs(false))
            }
          }}>
            <Sparkles className="h-3 w-3 mr-1" /> AI Рекомендации
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity Timeline</CardTitle>
              <Button size="sm">
                <MessageSquare className="h-4 w-4" />
                {t("addActivity")}
              </Button>
            </CardHeader>
            <CardContent>
              {contact.activities && contact.activities.length > 0 ? (
                <div className="relative space-y-4 pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
                  {contact.activities.map((activity) => (
                    <div key={activity.id} className="relative">
                      <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-background border text-xs">
                        {activityIcons[activity.type] || "📌"}
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{activity.subject || "Activity"}</span>
                          <span className="text-xs text-muted-foreground">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">{t("noActivities")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">{tc("source")}:</span>
                  <span className="ml-2 font-medium">{contact.source || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <span className="ml-2 font-medium">{contact.department || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className="ml-2">{contact.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{tc("company")}:</span>
                  <span className="ml-2 font-medium">{contact.company?.name || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardContent className="pt-6">
              {loadingRecs ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Загрузка рекомендаций...
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Нет продуктов для рекомендации</p>
                  <p className="text-xs">Добавьте продукты в каталог через API</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec: any, i: number) => (
                    <div key={rec.productId} className="flex items-start gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        i === 0 ? "bg-yellow-100 text-yellow-600" :
                        i === 1 ? "bg-blue-100 text-blue-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        <Star className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{rec.name}</span>
                          <Badge variant="outline" className="text-[10px]">{rec.category}</Badge>
                          <Badge className={`text-[10px] ${
                            rec.score > 70 ? "bg-green-100 text-green-700" :
                            rec.score > 50 ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {rec.score}% match
                          </Badge>
                        </div>
                        {rec.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{rec.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{rec.reason}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <DollarSign className="h-3.5 w-3.5" />
                          {rec.price?.toLocaleString()} {rec.currency}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement */}
        <TabsContent value="engagement">
          <ContactEngagement contactId={id} orgId={orgId ? String(orgId) : undefined} />
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ── */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogHeader>
          <DialogTitle>{tc("edit")}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-sm font-medium">{tc("fullName")} *</Label>
              <Input value={editData.fullName} onChange={e => setEditData(d => ({ ...d, fullName: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">{tc("email")}</Label>
              <Input value={editData.email} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">{tc("phone")}</Label>
              <Input value={editData.phone} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} placeholder="+994..." className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm font-medium">{tc("phone")}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addPhone} className="h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> {tc("create")}
                </Button>
              </div>
              {editData.phones.map((p, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <Input value={p} onChange={e => updatePhone(i, e.target.value)} placeholder="+994..." className="flex-1" />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removePhone(i)} className="h-8 w-8 text-red-500 hover:text-red-700 shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Label className="text-sm font-medium">{tc("position")}</Label>
              <Input value={editData.position} onChange={e => setEditData(d => ({ ...d, position: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">Department</Label>
              <Input value={editData.department} onChange={e => setEditData(d => ({ ...d, department: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">{tc("company")}</Label>
              <Select value={editData.companyId} onChange={e => setEditData(d => ({ ...d, companyId: e.target.value }))} className="mt-1">
                <option value="">{tc("noCompany")}</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">{tc("source")}</Label>
              <Input value={editData.source} onChange={e => setEditData(d => ({ ...d, source: e.target.value }))} className="mt-1" />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowEdit(false)}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving || !editData.fullName.trim()} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
