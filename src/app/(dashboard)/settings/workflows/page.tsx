"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColorStatCard } from "@/components/color-stat-card"
import { WorkflowForm } from "@/components/workflow-form"
import { WorkflowActionsModal } from "@/components/workflow-actions-modal"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import {
  Plus, Workflow, CheckCircle, XCircle, Pencil, Trash2,
  Play, Pause, Eye, Briefcase, Target, Ticket, CheckSquare,
  User, Building2, Mail, Bell, Globe, Edit3, Search, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowAction {
  id: string
  actionType: string
  actionConfig: any
  actionOrder: number
}

interface WorkflowRule {
  id: string
  name: string
  entityType: string
  triggerEvent: string
  conditions?: any
  isActive: boolean
  actions: WorkflowAction[]
}

const entityIcons: Record<string, any> = {
  deal: Briefcase,
  lead: Target,
  ticket: Ticket,
  task: CheckSquare,
  contact: User,
  company: Building2,
}

const actionIcons: Record<string, any> = {
  send_email: Mail,
  create_task: CheckSquare,
  update_field: Edit3,
  send_notification: Bell,
  webhook: Globe,
}

const actionColors: Record<string, string> = {
  send_email: "text-blue-500",
  create_task: "text-teal-500",
  update_field: "text-purple-500",
  send_notification: "text-orange-500",
  webhook: "text-slate-500",
}

export default function WorkflowsPage() {
  const { data: session } = useSession()
  const t = useTranslations("workflows")
  const tc = useTranslations("common")
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<WorkflowRule | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [actionsWorkflow, setActionsWorkflow] = useState<WorkflowRule | null>(null)
  const [search, setSearch] = useState("")
  const orgId = session?.user?.organizationId

  const entityLabels: Record<string, string> = {
    deal: t("entityDeal"),
    lead: t("entityLead"),
    ticket: t("entityTicket"),
    task: t("entityTask"),
    contact: t("entityContact"),
    company: t("entityCompany"),
  }

  const triggerLabels: Record<string, string> = {
    created: t("triggerCreated"),
    updated: t("triggerUpdated"),
    status_changed: t("triggerStatusChanged"),
    stage_changed: t("triggerStageChanged"),
    assigned: t("triggerAssigned"),
  }

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/v1/workflows", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      if (res.ok) {
        const result = await res.json()
        setWorkflows(result.data || [])
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchWorkflows() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/workflows/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchWorkflows()
  }

  const toggleActive = async (wf: WorkflowRule) => {
    await fetch(`/api/v1/workflows/${wf.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {}),
      },
      body: JSON.stringify({ isActive: !wf.isActive }),
    })
    fetchWorkflows()
  }

  const totalCount = workflows.length
  const activeCount = workflows.filter(w => w.isActive).length
  const inactiveCount = totalCount - activeCount

  const filtered = workflows.filter(w =>
    !search.trim() || w.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t("newWorkflow")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <ColorStatCard label={t("statTotal")} value={totalCount} icon={<Workflow className="h-4 w-4" />} color="blue" />
        <ColorStatCard label={t("statActive")} value={activeCount} icon={<CheckCircle className="h-4 w-4" />} color="green" />
        <ColorStatCard label={t("statInactive")} value={inactiveCount} icon={<XCircle className="h-4 w-4" />} color="red" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Workflow cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/20 py-16 text-center">
            <Workflow className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t("noWorkflows")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("noWorkflowsHint")}</p>
            <Button className="mt-4 gap-1.5" onClick={() => { setEditData(undefined); setShowForm(true) }}>
              <Plus className="h-4 w-4" /> {t("newWorkflow")}
            </Button>
          </div>
        ) : filtered.map(wf => {
          const EntityIcon = entityIcons[wf.entityType] || Workflow
          const conditionCount = wf.conditions?.rules?.length || (
            wf.conditions && typeof wf.conditions === "object"
              ? Object.keys(wf.conditions).filter(k => k !== "rules").length
              : 0
          )
          return (
            <div key={wf.id} className="border rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-xs px-2.5 py-0.5 rounded-full font-medium border",
                      wf.isActive
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                      {wf.isActive ? t("statActive") : t("statInactive")}
                    </span>
                    <h3 className="font-semibold truncate">{wf.name}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <EntityIcon className="h-3 w-3" />
                      {entityLabels[wf.entityType] || wf.entityType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-500" />
                      {triggerLabels[wf.triggerEvent] || wf.triggerEvent}
                    </span>
                    {conditionCount > 0 && (
                      <span>{conditionCount} {t("conditions").toLowerCase()}</span>
                    )}
                    <span className="flex items-center gap-1">
                      {wf.actions.map((a, i) => {
                        const AIcon = actionIcons[a.actionType] || Zap
                        return <AIcon key={i} className={cn("h-3 w-3", actionColors[a.actionType] || "text-muted-foreground")} />
                      })}
                      {wf.actions.length > 0 && <span className="ml-0.5">{wf.actions.length}</span>}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => setActionsWorkflow(wf)}>
                    <Eye className="h-3 w-3" /> {t("actions")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => { setEditData(wf); setShowForm(true) }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("gap-1 text-xs h-8", wf.isActive ? "text-yellow-600" : "text-green-600")}
                    onClick={() => toggleActive(wf)}
                  >
                    {wf.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
                    onClick={() => { setDeleteId(wf.id); setDeleteName(wf.name) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form modal */}
      <WorkflowForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchWorkflows}
        initialData={editData}
        orgId={orgId}
      />

      {/* Actions modal */}
      <WorkflowActionsModal
        workflow={actionsWorkflow}
        onClose={() => setActionsWorkflow(null)}
        onSaved={fetchWorkflows}
        orgId={orgId}
      />

      {/* Delete dialog */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteWorkflow")}
        itemName={deleteName}
      />
    </div>
  )
}
