"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/data-table"
import { StatCard } from "@/components/stat-card"
import { Ticket, Plus, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const MOCK_TICKETS = [
  { id: "1", ticketNumber: "TK-0001", subject: "Server down in production", priority: "critical", status: "in_progress", company: "Zeytun Pharma", assignedTo: "Rashad", createdAt: "2026-03-18", slaDueAt: "2026-03-18 18:00" },
  { id: "2", ticketNumber: "TK-0002", subject: "VPN connection issues", priority: "high", status: "new", company: "Delta Telecom", assignedTo: "", createdAt: "2026-03-17", slaDueAt: "2026-03-18 09:00" },
  { id: "3", ticketNumber: "TK-0003", subject: "Email configuration request", priority: "medium", status: "waiting", company: "Azmade", assignedTo: "Admin", createdAt: "2026-03-16", slaDueAt: "2026-03-17 16:00" },
  { id: "4", ticketNumber: "TK-0004", subject: "Software license renewal", priority: "low", status: "resolved", company: "Tabia", assignedTo: "Admin", createdAt: "2026-03-15", slaDueAt: "2026-03-18 12:00" },
  { id: "5", ticketNumber: "TK-0005", subject: "Printer not working", priority: "medium", status: "new", company: "Novex", assignedTo: "", createdAt: "2026-03-18", slaDueAt: "2026-03-19 16:00" },
]

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
  const [view, setView] = useState<ViewMode>("list")

  const columns = [
    {
      key: "ticketNumber", label: "#", sortable: true,
      render: (item: typeof MOCK_TICKETS[0]) => <span className="font-mono text-xs">{item.ticketNumber}</span>,
    },
    { key: "subject", label: "Subject", sortable: true },
    {
      key: "priority", label: "Priority", sortable: true,
      render: (item: typeof MOCK_TICKETS[0]) => (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", priorityColors[item.priority])}>
          {item.priority}
        </span>
      ),
    },
    { key: "company", label: "Company", sortable: true },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: typeof MOCK_TICKETS[0]) => <Badge variant="outline">{statusLabels[item.status]}</Badge>,
    },
    {
      key: "slaDueAt", label: "SLA", sortable: true,
      render: (item: typeof MOCK_TICKETS[0]) => {
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

  const openCount = MOCK_TICKETS.filter(t => ["new", "in_progress", "waiting"].includes(t.status)).length
  const breachedCount = MOCK_TICKETS.filter(t => isSlaBreached(t.slaDueAt) && !["resolved", "closed"].includes(t.status)).length

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
        <StatCard title="Total" value={MOCK_TICKETS.length} icon={<Ticket className="h-4 w-4" />} />
        <StatCard title="Open" value={openCount} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="SLA Breached" value={breachedCount} icon={<AlertTriangle className="h-4 w-4" />} trend={breachedCount > 0 ? "down" : "neutral"} />
        <StatCard title="Resolved" value={MOCK_TICKETS.filter(t => t.status === "resolved").length} icon={<CheckCircle className="h-4 w-4" />} trend="up" />
      </div>

      {view === "list" && (
        <DataTable
          columns={columns}
          data={MOCK_TICKETS}
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
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{MOCK_TICKETS.filter(t => t.status === status).length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] rounded-lg border-2 border-dashed border-transparent p-2 hover:border-muted-foreground/20">
                {MOCK_TICKETS.filter(t => t.status === status).map(ticket => (
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
