"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Ticket, Plus, Clock, AlertTriangle, CheckCircle } from "lucide-react"
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
}

type ViewMode = "list" | "kanban"

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

const statusLabels: Record<string, string> = {
  new: "New", in_progress: "In Progress", waiting: "Waiting", resolved: "Resolved", closed: "Closed",
}

function isSlaBreached(slaDueAt: string): boolean {
  return new Date(slaDueAt) < new Date()
}

export default function TicketsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [view, setView] = useState<ViewMode>("list")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTickets() {
      try {
        const orgId = (session?.user as any)?.organizationId
        const res = await fetch("/api/v1/tickets?limit=200", {
          headers: orgId ? { "x-organization-id": orgId } : {},
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
    fetchTickets()
  }, [session])

  const columns = [
    {
      key: "ticketNumber", label: "#", sortable: true,
      render: (item: TicketData) => <span className="font-mono text-xs">{item.ticketNumber}</span>,
    },
    { key: "subject", label: "Subject", sortable: true },
    {
      key: "priority", label: "Priority", sortable: true,
      render: (item: TicketData) => (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[item.priority])}>
          {item.priority}
        </span>
      ),
    },
    { key: "company", label: "Company", sortable: true },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: TicketData) => <Badge variant="outline">{statusLabels[item.status]}</Badge>,
    },
    {
      key: "slaDueAt", label: "SLA", sortable: true,
      render: (item: TicketData) => {
        const breached = isSlaBreached(item.slaDueAt) && !["resolved", "closed"].includes(item.status)
        return (
          <div className={cn("flex items-center gap-1 text-xs", breached && "text-red-500 font-medium")}>
            {breached && <AlertTriangle className="h-3 w-3" />}
            <Clock className="h-3 w-3" />
            {new Date(item.slaDueAt).toLocaleDateString()}
          </div>
        )
      },
    },
    { key: "assignedTo", label: "Assigned", sortable: true },
  ]

  const openCount = tickets.filter(t => ["new", "in_progress", "waiting"].includes(t.status)).length
  const breachedCount = tickets.filter(t => isSlaBreached(t.slaDueAt) && !["resolved", "closed"].includes(t.status)).length
  const resolvedCount = tickets.filter(t => t.status === "resolved").length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted-foreground">Support ticket management with SLA tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <button onClick={() => setView("list")} className={cn("px-3 py-1.5 text-sm", view === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>List</button>
            <button onClick={() => setView("kanban")} className={cn("px-3 py-1.5 text-sm", view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>Kanban</button>
          </div>
          <Button><Plus className="h-4 w-4" /> New Ticket</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={tickets.length} icon={<Ticket className="h-4 w-4" />} />
        <StatCard title="Open" value={openCount} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="SLA Breached" value={breachedCount} icon={<AlertTriangle className="h-4 w-4" />} trend={breachedCount > 0 ? "down" : "neutral"} />
        <StatCard title="Resolved" value={resolvedCount} icon={<CheckCircle className="h-4 w-4" />} trend="up" />
      </div>

      {view === "list" && (
        <DataTable
          columns={columns}
          data={tickets}
          searchPlaceholder="Search tickets..."
          searchKey="subject"
          onRowClick={(item) => router.push(`/tickets/${item.id}`)}
        />
      )}

      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {["new", "in_progress", "waiting", "resolved"].map((status) => (
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
                    <div className="text-xs text-muted-foreground">{ticket.company}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
