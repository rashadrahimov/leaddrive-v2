"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { ColorStatCard } from "@/components/color-stat-card"
import { TicketForm } from "@/components/ticket-form"
import { Ticket, Plus, Clock, AlertTriangle, CheckCircle, Pencil, Trash2, UserX } from "lucide-react"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { cn } from "@/lib/utils"

interface TicketData {
  id: string
  ticketNumber: string
  subject: string
  priority: string
  status: string
  company: string
  assignedTo: string
  createdAt: string
  slaDueAt: string
  slaFirstResponseDueAt: string
  slaPolicyName: string
  firstResponseAt: string
}

type ViewMode = "list" | "kanban"

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

function getSlaStatus(slaDueAt: string | null, status: string): "breached" | "warning" | "ok" | "none" | "done" {
  if (!slaDueAt) return "none"
  if (["resolved", "closed"].includes(status)) return "done"
  const now = Date.now()
  const due = new Date(slaDueAt).getTime()
  if (due < now) return "breached"
  if (due - now < 2 * 3600000) return "warning"
  return "ok"
}

function formatTimeLeft(slaDueAt: string): string {
  const diff = new Date(slaDueAt).getTime() - Date.now()
  if (diff <= 0) return "—"
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}ч ${m}м` : `${m}м`
}

function isSlaBreached(slaDueAt: string | null): boolean {
  if (!slaDueAt) return false
  return new Date(slaDueAt) < new Date()
}

export default function TicketsPage() {
  const t = useTranslations("tickets")
  const tc = useTranslations("common")
  const router = useRouter()
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [view, setView] = useState<ViewMode>("list")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<Record<string, any> | undefined>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<TicketData | null>(null)
  const orgId = session?.user?.organizationId

  const statusLabels: Record<string, string> = {
    new: t("statusNew"),
    open: t("statusOpen"),
    in_progress: t("statusInProgress"),
    waiting: t("statusWaiting"),
    resolved: t("statusResolved"),
    closed: t("statusClosed"),
  }

  async function fetchTickets() {
    try {
      const res = await fetch("/api/v1/tickets?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setTickets(json.data.tickets)
      }
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [session])

  // Poll for new tickets every 20 seconds
  useEffect(() => {
    const interval = setInterval(fetchTickets, 20000)
    return () => clearInterval(interval)
  }, [session])

  function handleEdit(item: TicketData) {
    setEditData(item)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditData(undefined)
    setFormOpen(true)
  }

  function handleDelete(item: TicketData) {
    setDeleteItem(item)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/tickets/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchTickets()
  }

  const columns = [
    {
      key: "ticketNumber", label: t("colNumber"), sortable: true,
      render: (item: any) => <span className="font-mono text-xs">{item.ticketNumber}</span>,
    },
    { key: "subject", label: t("colSubject"), sortable: true },
    {
      key: "priority", label: t("colPriority"), sortable: true,
      render: (item: any) => (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[item.priority])}>
          {item.priority}
        </span>
      ),
    },
    { key: "companyName", label: t("colCompany"), sortable: true, render: (item: any) => <span>{item.companyName || "—"}</span> },
    {
      key: "status", label: t("colStatus"), sortable: true,
      render: (item: any) => <Badge variant="outline">{statusLabels[item.status]}</Badge>,
    },
    {
      key: "slaDueAt", label: t("colSla"), sortable: true,
      render: (item: any) => {
        if (!item.slaDueAt) return <span className="text-xs text-muted-foreground">—</span>
        const slaStatus = getSlaStatus(item.slaDueAt, item.status)
        const colorMap = {
          breached: "text-red-500",
          warning: "text-amber-500",
          ok: "text-green-600 dark:text-green-400",
          done: "text-muted-foreground",
          none: "text-muted-foreground",
        }
        const dotColorMap = {
          breached: "bg-red-500",
          warning: "bg-amber-500",
          ok: "bg-green-500",
          done: "bg-muted-foreground",
          none: "bg-muted-foreground",
        }
        return (
          <div className={cn("flex items-center gap-1.5 text-xs", colorMap[slaStatus])}>
            <span className={cn("inline-block h-2 w-2 rounded-full flex-shrink-0", dotColorMap[slaStatus])} />
            <div className="flex flex-col">
              {item.slaPolicyName && <span className="font-medium leading-tight">{item.slaPolicyName}</span>}
              <span className="leading-tight">
                {slaStatus === "breached" && <>{t("slaBreached")} <AlertTriangle className="inline h-3 w-3" /></>}
                {slaStatus === "warning" && <>{formatTimeLeft(item.slaDueAt)}</>}
                {slaStatus === "ok" && <>{formatTimeLeft(item.slaDueAt)}</>}
                {slaStatus === "done" && <>{t("slaResolved") || "Resolved"}</>}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      key: "firstResponseAt", label: t("colResponse"), sortable: true,
      render: (item: any) => {
        if (!item.firstResponseAt) return <span className="text-xs text-muted-foreground">—</span>
        const ms = new Date(item.firstResponseAt).getTime() - new Date(item.createdAt).getTime()
        const mins = Math.floor(ms / 60000)
        const hours = Math.floor(mins / 60)
        const label = hours > 0 ? `${hours}${tc("hours")} ${mins % 60}${tc("min")}` : `${mins}${tc("min")}`
        return <span className={cn("text-xs font-mono", hours > 4 ? "text-red-500" : hours > 1 ? "text-amber-500" : "text-green-500")}>{label}</span>
      },
    },
    { key: "assigneeName", label: t("colAssigned"), sortable: true, render: (item: any) => <span>{item.assigneeName || "—"}</span> },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item: any) => (
        <div className="flex items-center gap-1" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted" title={tc("edit")}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title={tc("delete")}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      ),
    },
  ]

  const openCount = tickets.filter(t => !["resolved", "closed"].includes(t.status)).length
  const breachedCount = tickets.filter(t => isSlaBreached(t.slaDueAt) && !["resolved", "closed"].includes(t.status)).length
  const resolvedCount = tickets.filter(t => t.status === "resolved").length
  const unassignedCount = tickets.filter(t => !t.assignedTo).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <button onClick={() => setView("list")} className={cn("px-3 py-1.5 text-sm", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{t("list")}</button>
            <button onClick={() => setView("kanban")} className={cn("px-3 py-1.5 text-sm", view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{t("kanban")}</button>
          </div>
          <Button onClick={handleAdd}><Plus className="h-4 w-4" /> {t("newTicket")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <ColorStatCard label={t("statTotal")} value={tickets.length} icon={<Ticket className="h-4 w-4" />} color="blue" />
        <ColorStatCard label={t("statOpen")} value={openCount} icon={<Clock className="h-4 w-4" />} color="amber" />
        <ColorStatCard label={t("statUnassigned")} value={unassignedCount} icon={<UserX className="h-4 w-4" />} color="orange" />
        <ColorStatCard label={t("statSlaBreach")} value={breachedCount} icon={<AlertTriangle className="h-4 w-4" />} color="red" />
        <ColorStatCard label={t("statResolved")} value={resolvedCount} icon={<CheckCircle className="h-4 w-4" />} color="green" />
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: tc("all"), count: tickets.length },
          { key: "new", label: t("statusNew"), count: tickets.filter(t => t.status === "new").length },
          { key: "open", label: t("statusOpen"), count: tickets.filter(t => t.status === "open").length },
          { key: "in_progress", label: t("statusInProgress"), count: tickets.filter(t => t.status === "in_progress").length },
          { key: "waiting", label: t("statusWaiting"), count: tickets.filter(t => t.status === "waiting").length },
          { key: "resolved", label: t("statusResolved"), count: tickets.filter(t => t.status === "resolved").length },
          { key: "closed", label: t("statusClosed"), count: tickets.filter(t => t.status === "closed").length },
        ].filter(tab => tab.key === "all" || tab.count > 0).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-colors",
              statusFilter === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted border-border"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {view === "list" && (
        <DataTable
          columns={columns}
          data={statusFilter === "all" ? tickets : tickets.filter(t => t.status === statusFilter)}
          searchPlaceholder={t("searchPlaceholder")}
          searchKey="subject"
          onRowClick={(item) => router.push(`/tickets/${item.id}`)}
        />
      )}

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {["new", "open", "in_progress", "waiting", "resolved"].map((status) => (
            <div key={status} className="min-w-[280px] flex-shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold">{statusLabels[status]}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{tickets.filter(t => t.status === status).length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border-2 border-dashed border-transparent p-2 hover:border-muted-foreground/20">
                {tickets.filter(t => t.status === status).map(ticket => (
                  <div key={ticket.id} className="rounded-lg border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/tickets/${ticket.id}`)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-muted-foreground">{ticket.ticketNumber}</span>
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", priorityColors[ticket.priority])}>{ticket.priority}</span>
                    </div>
                    <div className="text-sm font-medium mb-1">{ticket.subject}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{(ticket as any).companyName || "—"}</span>
                      {ticket.slaDueAt && (() => {
                        const s = getSlaStatus(ticket.slaDueAt, ticket.status)
                        const dotColor = { breached: "bg-red-500", warning: "bg-amber-500", ok: "bg-green-500", done: "bg-muted-foreground", none: "" }
                        if (s === "none") return null
                        return (
                          <span className="flex items-center gap-1">
                            <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[s])} />
                            {s !== "done" && s !== "breached" && <span className="text-[10px] text-muted-foreground">{formatTimeLeft(ticket.slaDueAt)}</span>}
                            {s === "breached" && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TicketForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchTickets} initialData={editData} orgId={orgId} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("deleteTicket")} itemName={deleteItem?.subject} />
    </div>
  )
}
