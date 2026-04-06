"use client"

import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LeadForm } from "@/components/lead-form"
import { LeadConvertDialog } from "@/components/lead-convert-dialog"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { ColorStatCard } from "@/components/color-stat-card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft, Pencil, Trash2, ArrowRight, Loader2,
  Mail, Phone, Building2, User, FileText, Globe,
  TrendingUp, Calendar, DollarSign, Flame, CheckCircle2,
  Brain, Sparkles, Copy, Send, RefreshCw, CheckCircle,
} from "lucide-react"
import { useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"
import { useFieldPermissions } from "@/hooks/use-field-permissions"

interface Lead {
  id: string
  contactName: string
  companyName: string | null
  email: string | null
  phone: string | null
  source: string | null
  status: string
  priority: string
  score: number
  scoreDetails: any
  estimatedValue: number | null
  notes: string | null
  assignedTo: string | null
  convertedAt: string | null
  lastScoredAt: string | null
  createdAt: string
  updatedAt: string
}

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 80) return { letter: "A", color: "bg-green-500 text-white" }
  if (score >= 60) return { letter: "B", color: "bg-blue-500 text-white" }
  if (score >= 40) return { letter: "C", color: "bg-yellow-500 text-white" }
  if (score >= 20) return { letter: "D", color: "bg-orange-500 text-white" }
  return { letter: "F", color: "bg-red-500 text-white" }
}

export default function LeadDetailPage() {
  const t = useTranslations("leads")
  const tc = useTranslations("common")
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [activeTab, setActiveTab] = useState("details")

  // Da Vinci state
  const [aiLoading, setAiLoading] = useState(false)
  const [sentiment, setSentiment] = useState<any>(null)
  const [aiTasks, setAiTasks] = useState<any>(null)
  const [textType, setTextType] = useState("Email")
  const [tone, setTone] = useState("professional")
  const [instructions, setInstructions] = useState("")
  const [generatedText, setGeneratedText] = useState<any>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [scoring, setScoring] = useState(false)

  const { isVisible, isEditable } = useFieldPermissions("lead")
  const id = params.id as string
  const orgId = session?.user?.organizationId
  const locale = useLocale()

  const statusLabels: Record<string, string> = {
    new: t("statusNew"),
    contacted: t("statusContacted"),
    qualified: t("statusQualified"),
    converted: t("statusConverted"),
    lost: t("statusLost"),
  }

  const priorityLabels: Record<string, string> = {
    low: t("priorityLow"),
    medium: t("priorityMedium"),
    high: t("priorityHigh"),
  }

  const sourceLabels: Record<string, string> = {
    website: t("sourceWebsite"),
    referral: t("sourceReferral"),
    cold_call: t("sourceColdCall"),
    linkedin: t("sourceLinkedin"),
    email: t("sourceEmail"),
  }

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/v1/leads/${id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setLead(json.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id && session) fetchLead()
  }, [id, session])

  const handleStatusChange = async (newStatus: string) => {
    if (!lead || lead.status === newStatus || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/v1/leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json()
      if (json.success) {
        setLead(json.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    await fetch(`/api/v1/leads/${id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    router.push("/leads")
  }

  // Da Vinci helper
  const callAI = async (action: string, options?: any) => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/v1/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({ action, leadId: id, options, locale }),
      })
      const json = await res.json()
      if (json.success) return json.data
    } catch (err) { console.error(err) } finally { setAiLoading(false) }
    return null
  }

  const scoreWithAI = async () => {
    setScoring(true)
    try {
      await fetch("/api/v1/lead-scoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ leadId: id }),
      })
      await fetchLead()
    } catch (err) { console.error(err) } finally { setScoring(false) }
  }

  const sendGeneratedEmail = async () => {
    if (!generatedText || !lead?.email) return
    setEmailSending(true)
    setEmailError("")
    try {
      const res = await fetch("/api/v1/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": String(orgId) } : {}) },
        body: JSON.stringify({ channel: "email", to: lead.email, subject: generatedText.subject, body: generatedText.body }),
      })
      const json = await res.json()
      if (json.success) { setEmailSent(true) } else { setEmailError(json.error || "Failed to send") }
    } catch (err) { setEmailError("Network error") } finally { setEmailSending(false) }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-16 bg-muted rounded-lg animate-pulse" />
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">{t("detailNotFound")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const grade = getGrade(lead.score)
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(lead.createdAt).getTime()) / 86400000
  )
  const conversionProb = (lead.scoreDetails as any)?.conversionProb ?? Math.round(lead.score * 0.85)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xl">
              {lead.contactName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{lead.contactName}</h1>
                <Badge className={cn("text-xs", statusColors[lead.status])}>
                  {statusLabels[lead.status] || lead.status}
                </Badge>
                <Badge className={cn("text-xs", priorityColors[lead.priority])}>
                  {priorityLabels[lead.priority] || lead.priority}
                </Badge>
              </div>
              {lead.companyName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" /> {lead.companyName}
                </p>
              )}
              {lead.email && (
                <p className="text-xs text-muted-foreground mt-0.5">{lead.email}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== "converted" && (
            <Button
              variant="outline"
              className="gap-1.5 text-green-600 hover:text-green-700 hover:border-green-300"
              onClick={() => setShowConvert(true)}
            >
              <ArrowRight className="h-4 w-4" />
              {t("modalConvertToDeal")}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Pencil className="h-4 w-4" />
            {tc("edit")}
          </Button>
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-700"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            {tc("delete")}
          </Button>
        </div>
      </div>

      {/* Status pipeline bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-1">
            {STATUSES.map((status, idx) => {
              const currentIdx = STATUSES.indexOf(lead.status as typeof STATUSES[number])
              const isActive = idx <= currentIdx
              const isCurrent = status === lead.status
              const isLost = lead.status === "lost"

              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={updatingStatus}
                  className={cn(
                    "flex-1 py-2.5 px-3 text-xs font-medium rounded-md transition-all relative",
                    "hover:opacity-80 disabled:opacity-50",
                    isCurrent
                      ? isLost
                        ? "bg-red-500 text-white shadow-sm"
                        : status === "converted"
                          ? "bg-green-500 text-white shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                      : isActive && !isLost
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {statusLabels[status]}
                  {isCurrent && updatingStatus && (
                    <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ColorStatCard
          label={t("detailScoreGrade")}
          value={`${lead.score}/100 (${grade.letter})`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="indigo"
          hint={t("hintColScore")}
        />
        <ColorStatCard
          label={t("detailDaysSinceCreated")}
          value={`${daysSinceCreated} ${t("modalDays")}`}
          icon={<Calendar className="h-4 w-4" />}
          color="blue"
        />
        {isVisible("estimatedValue") && (
          <ColorStatCard
            label={t("modalEstimatedValue")}
            value={lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "---"}
            icon={<DollarSign className="h-4 w-4" />}
            color="green"
          />
        )}
        <ColorStatCard
          label={t("modalPriority")}
          value={priorityLabels[lead.priority] || lead.priority}
          icon={<Flame className="h-4 w-4" />}
          color={lead.priority === "high" ? "orange" : lead.priority === "medium" ? "amber" : "slate"}
          hint={t("hintColPriority")}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {[
          { id: "details", label: t("modalDetails") || "Details" },
          { id: "sentiment", label: t("modalSentiment") || "Sentiment" },
          { id: "tasks", label: t("modalTasks") || "Tasks" },
          { id: "aitext", label: t("modalAiText") || "Da Vinci Text" },
          { id: "ai", label: t("modalAiScoring") || "Da Vinci Scoring" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.id === "sentiment" && <Brain className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab.id === "tasks" && <Sparkles className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab.id === "aitext" && <Mail className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab.id === "ai" && <TrendingUp className="h-3.5 w-3.5 inline mr-1.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Details (existing Lead Info) */}
      {activeTab === "details" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">{t("modalLeadInfo")} <InfoHint text={t("hintColContact")} size={14} /></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{t("modalContactName")}:</span>
              <span className="font-medium">{lead.contactName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{t("modalCompany")}:</span>
              <span className="font-medium">{lead.companyName || "---"}</span>
            </div>
            {isVisible("email") && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{tc("email")}:</span>
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="font-medium text-primary hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">---</span>
                )}
              </div>
            )}
            {isVisible("phone") && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{t("modalPhone")}:</span>
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="font-medium text-primary hover:underline">
                    {lead.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">---</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{t("modalSource")}:</span>
              <span className="font-medium">
                {lead.source ? (sourceLabels[lead.source] || lead.source) : "---"}
              </span>
              <InfoHint text={t("hintColSource")} size={12} />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{t("modalCreated")}:</span>
              <span className="font-medium">
                {new Date(lead.createdAt).toLocaleDateString("ru-RU")}
              </span>
            </div>
            {lead.lastScoredAt && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{t("modalScoredAt")}:</span>
                <span className="font-medium">
                  {new Date(lead.lastScoredAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            )}
            {lead.convertedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-muted-foreground">{t("statusConverted")}:</span>
                <span className="font-medium">
                  {new Date(lead.convertedAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            )}
          </div>

          {/* Notes section */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("modalNotes")}</span>
            </div>
            {lead.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t("modalNoNotes")}</p>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Tab: Sentiment */}
      {activeTab === "sentiment" && (
        <Card>
          <CardContent className="pt-6">
            {!sentiment ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <Button onClick={async () => { const d = await callAI("sentiment"); if (d) setSentiment(d) }} disabled={aiLoading} className="gap-2">
                  {aiLoading ? (t("modalAnalyzing") || "Analyzing...") : (t("modalAnalyzeSentiment") || "Analyze Sentiment")}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">{t("modalSentimentDesc") || "Da Vinci will analyze sentiment based on lead data and interactions"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-6 justify-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-28 h-28" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={sentiment.score >= 70 ? "#22c55e" : sentiment.score >= 40 ? "#3b82f6" : "#ef4444"} strokeWidth="8" strokeDasharray={`${sentiment.score * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-3xl">{sentiment.emoji}</div>
                      <div className="text-sm font-bold">{sentiment.score}%</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{sentiment.sentiment}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("modalSentimentLabel") || "Sentiment"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">{t("modalTrend") || "Trend"}</p>
                    <p className="text-sm font-medium mt-1">{sentiment.trend === "improving" ? (t("modalTrendImproving") || "Improving") : sentiment.trend === "stable" ? (t("modalTrendStable") || "Stable") : (t("modalTrendUnknown") || "Unknown")}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">{t("modalRisk") || "Risk"}</p>
                    <p className={cn("text-sm font-bold mt-1", sentiment.risk === "HIGH" ? "text-red-500" : sentiment.risk === "MEDIUM" ? "text-orange-500" : "text-green-500")}>{sentiment.risk}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-3 pb-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">{t("modalConfidence") || "Confidence"}</p>
                    <p className="text-sm font-bold text-primary mt-1">{sentiment.confidence}%</p>
                  </CardContent></Card>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase">{t("modalSummary") || "Summary"}</p>
                  <p className="text-sm leading-relaxed">{sentiment.summary}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Tasks */}
      {activeTab === "tasks" && (
        <Card>
          <CardContent className="pt-6">
            {!aiTasks ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <Button onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} disabled={aiLoading} className="gap-2">
                  {aiLoading ? (t("modalGenerating") || "Generating...") : (t("modalGenerateTasks") || "Generate Tasks")}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">{t("modalTasksDesc") || "Da Vinci will suggest next best actions for this lead"}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
                  <p className="font-medium text-xs text-yellow-800 dark:text-yellow-300 uppercase mb-1">{t("modalStrategy") || "Strategy"}</p>
                  <p>{aiTasks.strategy}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiTasks.tasks?.map((task: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex gap-1">
                            <Badge variant={task.priority === "HIGH" ? "destructive" : "secondary"} className="text-[10px]">{task.priority}</Badge>
                            <Badge variant="outline" className="text-[10px]">{task.type}</Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{task.dueDate}</span>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{task.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <Button size="sm" className="gap-1"><CheckCircle className="h-3 w-3" /> {t("modalCreateAllTasks") || "Create All Tasks"}</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} className="gap-1"><RefreshCw className="h-3 w-3" /> {t("modalRegenerate") || "Regenerate"}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Da Vinci Text */}
      {activeTab === "aitext" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">{t("modalTextType") || "Type"}</Label>
                <Select value={textType} onChange={(e: any) => setTextType(e.target.value)}>
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("modalTone") || "Tone"}</Label>
                <Select value={tone} onChange={(e: any) => setTone(e.target.value)}>
                  <option value="professional">{t("modalProfessional") || "Professional"}</option>
                  <option value="friendly">{t("modalFriendly") || "Friendly"}</option>
                  <option value="formal">{t("modalFormal") || "Formal"}</option>
                  <option value="persuasive">{t("modalPersuasive") || "Persuasive"}</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("modalExtraInstructions") || "Instructions"}</Label>
                <Input value={instructions} onChange={(e: any) => setInstructions(e.target.value)} placeholder={t("modalExtraInstructionsPlaceholder") || "Extra instructions..."} />
              </div>
            </div>
            <Button onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false) } }} disabled={aiLoading} className="w-full gap-2">
              {aiLoading ? (t("modalGenerating") || "Generating...") : (t("modalGenerateText") || "Generate Text")}
            </Button>

            {generatedText && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
                {generatedText.subject && (
                  <div>
                    <Label className="text-xs text-primary uppercase">{t("modalSubject") || "Subject"}</Label>
                    <Input value={generatedText.subject} onChange={(e: any) => setGeneratedText({ ...generatedText, subject: e.target.value })} className="mt-1 bg-background" />
                  </div>
                )}
                <div>
                  <Label className="text-xs uppercase">{t("modalText") || "Text"}</Label>
                  <Textarea value={generatedText.body} rows={8} onChange={(e: any) => setGeneratedText({ ...generatedText, body: e.target.value })} className="mt-1 bg-background" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedText.body)} className="gap-1">
                    <Copy className="h-3 w-3" /> {t("modalCopy") || "Copy"}
                  </Button>
                  {lead.email && (
                    <Button size="sm" onClick={sendGeneratedEmail} disabled={emailSending || emailSent} className="gap-1">
                      <Send className="h-3 w-3" /> {emailSent ? (t("modalSent") || "Sent!") : emailSending ? (t("modalSending") || "Sending...") : (t("modalSendEmail") || "Send Email")}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false); setEmailError("") } }} className="gap-1">
                    <RefreshCw className="h-3 w-3" /> {t("modalRegenerate") || "Regenerate"}
                  </Button>
                </div>
                {emailError && (
                  <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">{emailError}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Da Vinci Scoring */}
      {activeTab === "ai" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-500" /> {t("modalAiAnalysis") || "Da Vinci Analysis"}
              </h4>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={scoreWithAI} disabled={scoring}>
                {scoring ? (t("modalRecalculating") || "Recalculating...") : (t("modalRecalculate") || "Recalculate")}
              </Button>
            </div>

            {lead.scoreDetails?.reasoning && (
              <div className="p-4 bg-[hsl(var(--ai-from))]/5 rounded-lg border border-[hsl(var(--ai-from))]/20 ai-accent">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[hsl(var(--ai-from))] shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground leading-relaxed">{lead.scoreDetails.reasoning}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center">
              <Card><CardContent className="pt-4 pb-4">
                <div className={cn("text-3xl font-bold", grade.color.replace("bg-", "text-").replace(" text-white", ""))}>
                  {grade.letter}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t("modalGrade") || "Grade"}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4">
                <div className="text-3xl font-bold text-primary">{lead.score}</div>
                <div className="text-xs text-muted-foreground mt-1">{t("modalScore") || "Score"}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4">
                <div className={cn("text-3xl font-bold", conversionProb >= 50 ? "text-green-600" : conversionProb >= 30 ? "text-yellow-600" : "text-red-500")}>
                  {conversionProb}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t("modalConversion") || "Conversion"}</div>
              </CardContent></Card>
            </div>

            {lead.scoreDetails?.factors && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("modalFactors")}</p>
                {Object.entries(lead.scoreDetails.factors).map(([key, val]: [string, any]) => {
                  const normalized = key.charAt(0).toLowerCase() + key.slice(1)
                  const factorLabels: Record<string, string> = {
                    recency: t("factorRecency"),
                    dealPotential: t("factorDealPotential"),
                    sourceQuality: t("factorSourceQuality"),
                    engagementLevel: t("factorEngagement"),
                    contactCompleteness: t("factorCompleteness"),
                  }
                  return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{factorLabels[normalized] || key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${val}%` }} />
                      </div>
                      <span className="font-medium w-8 text-right">{val}%</span>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lead Form Dialog */}
      <LeadForm
        open={showForm}
        onOpenChange={(open) => setShowForm(open)}
        onSaved={() => {
          setShowForm(false)
          fetchLead()
        }}
        initialData={lead}
        orgId={orgId}
      />

      {/* Convert Dialog */}
      {showConvert && (
        <LeadConvertDialog
          open={showConvert}
          onOpenChange={(open) => {
            if (!open) setShowConvert(false)
          }}
          onConverted={() => {
            setShowConvert(false)
            fetchLead()
          }}
          lead={lead as any}
          orgId={orgId}
        />
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={showDelete}
        onOpenChange={(open) => {
          if (!open) setShowDelete(false)
        }}
        onConfirm={handleDelete}
        title={t("deleteLead")}
        itemName={lead.contactName}
      />
    </div>
  )
}
