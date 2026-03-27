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
import {
  ArrowLeft, Pencil, Trash2, ArrowRight, Loader2,
  Mail, Phone, Building2, User, FileText, Globe,
  TrendingUp, Calendar, DollarSign, Flame, CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"

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
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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

  const id = params.id as string
  const orgId = session?.user?.organizationId

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
        <ColorStatCard
          label={t("modalEstimatedValue")}
          value={lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "---"}
          icon={<DollarSign className="h-4 w-4" />}
          color="green"
        />
        <ColorStatCard
          label={t("modalPriority")}
          value={priorityLabels[lead.priority] || lead.priority}
          icon={<Flame className="h-4 w-4" />}
          color={lead.priority === "high" ? "orange" : lead.priority === "medium" ? "amber" : "slate"}
          hint={t("hintColPriority")}
        />
      </div>

      {/* Lead Info Card */}
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
