"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, CreditCard, Send, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrgPlan {
  plan: string
  maxUsers: number
  maxContacts: number
  organizationName: string
}

interface PlanRequest {
  id: string
  requestedPlan: string
  contactName: string
  contactEmail: string
  status: string
  createdAt: string
}

const PLAN_ORDER = ["starter", "business", "professional", "enterprise"]

const PLAN_COLORS: Record<string, { ring: string; badge: string; button: string; icon: string }> = {
  starter: {
    ring: "ring-blue-500",
    badge: "bg-blue-100 text-blue-800",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    icon: "text-blue-600",
  },
  business: {
    ring: "ring-green-500",
    badge: "bg-green-100 text-green-800",
    button: "bg-green-600 hover:bg-green-700 text-white",
    icon: "text-green-600",
  },
  professional: {
    ring: "ring-purple-500",
    badge: "bg-purple-100 text-purple-800",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
    icon: "text-purple-600",
  },
  enterprise: {
    ring: "ring-amber-500",
    badge: "bg-amber-100 text-amber-800",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
    icon: "text-amber-600",
  },
}

interface PlanDef {
  id: string
  price: number
  maxUsers: string
  maxCompanies: string
  maxContacts: string
  auditLogDays: string
  features: string[]
  includesFrom?: string
}

export default function BillingPage() {
  const t = useTranslations("billing")
  const ts = useTranslations("settings")
  const { data: session } = useSession()

  const [orgPlan, setOrgPlan] = useState<OrgPlan | null>(null)
  const [requests, setRequests] = useState<PlanRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // Form fields
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [message, setMessage] = useState("")

  const PLANS: PlanDef[] = [
    {
      id: "starter",
      price: 9,
      maxUsers: t("featureUsers", { count: 3 }),
      maxCompanies: t("featureCompanies", { count: 100 }),
      maxContacts: t("featureContacts", { count: 500 }),
      auditLogDays: t("featureAuditLog", { days: 7 }),
      features: [
        t("featureCrm"),
        t("featureLeads"),
        t("featureProducts"),
        t("featureDashboardBasic"),
      ],
    },
    {
      id: "business",
      price: 29,
      maxUsers: t("featureUsers", { count: 5 }),
      maxCompanies: t("featureCompanies", { count: 500 }),
      maxContacts: t("featureContacts", { count: 5000 }),
      auditLogDays: t("featureAuditLog", { days: 30 }),
      includesFrom: t("planStarter"),
      features: [
        t("featureTickets"),
        t("featureKb"),
        t("featureContracts"),
        t("featureAgentDesk"),
        t("featureDashboardFull"),
        t("featureRoles"),
        t("featureBasicAutomation"),
      ],
    },
    {
      id: "professional",
      price: 59,
      maxUsers: t("featureUsers", { count: 15 }),
      maxCompanies: t("featureCompaniesUnlimited"),
      maxContacts: t("featureContactsUnlimited"),
      auditLogDays: t("featureAuditLog", { days: 90 }),
      includesFrom: t("planBusiness"),
      features: [
        t("featureEmailCampaigns"),
        t("featureSegments"),
        t("featureJourneys"),
        t("featureAiCenter"),
        t("featureReports"),
        t("featureEvents"),
        t("featureLeadsFull"),
        t("featureFullAutomation"),
        t("featureApi"),
      ],
    },
    {
      id: "enterprise",
      price: 99,
      maxUsers: t("featureUsersUnlimited"),
      maxCompanies: t("featureCompaniesUnlimited"),
      maxContacts: t("featureContactsUnlimited"),
      auditLogDays: t("featureAuditLogUnlimited"),
      includesFrom: t("planProfessional"),
      features: [
        t("featurePricing"),
        t("featureProfitability"),
        t("featureWhatsapp"),
        t("featurePortal"),
        t("featureSmtp"),
        t("featureCustomFields"),
        t("featureInbox"),
        t("featureMultiCurrency"),
        t("featurePrioritySupport"),
      ],
    },
  ]

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (session?.user) {
      setContactName(session.user.name || "")
      setContactEmail(session.user.email || "")
    }
  }, [session])

  async function fetchData() {
    try {
      const [planRes, reqRes] = await Promise.all([
        fetch("/api/v1/organization/plan"),
        fetch("/api/v1/plan-requests"),
      ])
      const planJson = await planRes.json()
      const reqJson = await reqRes.json()
      if (planJson.success) setOrgPlan(planJson.data)
      if (reqJson.success) setRequests(reqJson.data || [])
    } catch (e) {
      console.error("Failed to load billing data:", e)
    } finally {
      setLoading(false)
    }
  }

  const currentPlanIndex = PLAN_ORDER.indexOf(orgPlan?.plan || "starter")

  function openSubscribeDialog(planId: string) {
    setSelectedPlan(planId)
    setSuccessMsg("")
    setErrorMsg("")
    setMessage("")
    setDialogOpen(true)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/v1/plan-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedPlan: selectedPlan,
          contactName,
          contactEmail,
          contactPhone: contactPhone || undefined,
          message: message || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSuccessMsg(t("successDesc"))
        setDialogOpen(false)
        fetchData()
      } else {
        setErrorMsg(json.error || t("errorDesc"))
      }
    } catch {
      setErrorMsg(t("errorDesc"))
    } finally {
      setSubmitting(false)
    }
  }

  function getPlanName(planId: string) {
    const key = `plan${planId.charAt(0).toUpperCase() + planId.slice(1)}` as
      | "planStarter"
      | "planBusiness"
      | "planProfessional"
      | "planEnterprise"
    return t(key)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">{t("statusApproved")}</Badge>
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">{t("statusRejected")}</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">{t("statusPending")}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{ts("billing")}</h1>
          <p className="text-muted-foreground">{ts("billingDesc")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-6 bg-muted rounded w-32" /></CardHeader>
              <CardContent><div className="space-y-2">{[1, 2, 3].map((j) => <div key={j} className="h-4 bg-muted rounded w-full" />)}</div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">{t("successTitle")}</p>
            <p className="text-sm text-green-700">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Payment note */}
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">{t("paymentNote")}</p>
      </div>

      {/* Plan cards grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = orgPlan?.plan === plan.id
          const planIndex = PLAN_ORDER.indexOf(plan.id)
          const isUpgrade = planIndex > currentPlanIndex
          const isDowngrade = planIndex < currentPlanIndex
          const colors = PLAN_COLORS[plan.id]

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                isCurrent && `ring-2 ${colors.ring}`
              )}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{getPlanName(plan.id)}</CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price} &#8380;</span>
                      <span className="text-sm text-muted-foreground">/{t("perMonth")}</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <Badge className={colors.badge}>{t("currentPlan")}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                {/* Limits */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className={cn("h-4 w-4 flex-shrink-0", colors.icon)} />
                    <span className="font-medium">{plan.maxUsers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={cn("h-4 w-4 flex-shrink-0", colors.icon)} />
                    <span>{plan.maxCompanies}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className={cn("h-4 w-4 flex-shrink-0", colors.icon)} />
                    <span>{plan.maxContacts}</span>
                  </div>
                </div>

                {/* Includes from previous */}
                {plan.includesFrom && (
                  <p className="text-xs font-medium text-muted-foreground border-t pt-3">
                    {t("allFromPrevious", { plan: plan.includesFrom })}
                  </p>
                )}

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.icon)} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <Check className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.icon)} />
                    <span className="text-sm">{plan.auditLogDays}</span>
                  </li>
                </ul>

                {/* Action button */}
                <div className="pt-2">
                  {isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      {t("currentPlan")}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => openSubscribeDialog(plan.id)}
                    >
                      {t("contactUs")}
                    </Button>
                  ) : (
                    <Button
                      className={cn("w-full", colors.button)}
                      onClick={() => openSubscribeDialog(plan.id)}
                    >
                      {t("subscribe")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Request history */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("requestHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{getPlanName(req.requestedPlan)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(req.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscribe dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("subscribeDialog")}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("subscribeDialogDesc")}
            </p>
          </DialogHeader>

          {selectedPlan && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm font-medium">
                {getPlanName(selectedPlan)} — {PLANS.find((p) => p.id === selectedPlan)?.price} &#8380;/{t("perMonth")}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("contactName")}</Label>
              <Input
                value={contactName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contactEmail")}</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contactPhone")}</Label>
              <Input
                value={contactPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContactPhone(e.target.value)}
                placeholder="+994 XX XXX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("message")}</Label>
              <Textarea
                value={message}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={3}
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errorMsg}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !contactName || !contactEmail}
            >
              {submitting ? (
                <>{t("sending")}</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t("send")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
