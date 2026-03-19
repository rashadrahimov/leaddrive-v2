"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Clock, CheckCircle } from "lucide-react"

interface PortalTicket {
  id: string
  number: string
  subject: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  lastComment: string
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  in_progress: { label: "In Progress", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  waiting: { label: "Awaiting Reply", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
}

const MOCK_TICKETS: PortalTicket[] = [
  { id: "1", number: "TK-0042", subject: "Cannot access VPN after password reset", status: "in_progress", priority: "high", createdAt: "2026-03-19", updatedAt: "2026-03-19", lastComment: "We've flushed your cached VPN session. Please try reconnecting now." },
  { id: "2", number: "TK-0038", subject: "New laptop request for marketing team", status: "waiting", priority: "medium", createdAt: "2026-03-15", updatedAt: "2026-03-17", lastComment: "Could you please confirm the specifications needed?" },
  { id: "3", number: "TK-0035", subject: "Outlook calendar sync not working", status: "resolved", priority: "low", createdAt: "2026-03-10", updatedAt: "2026-03-12", lastComment: "Fixed by reconfiguring Exchange ActiveSync settings." },
  { id: "4", number: "TK-0029", subject: "Access request for SharePoint site", status: "resolved", priority: "medium", createdAt: "2026-03-05", updatedAt: "2026-03-06", lastComment: "Access granted. Please check your permissions." },
]

export default function PortalTicketsPage() {
  const [search, setSearch] = useState("")
  const [showNewTicket, setShowNewTicket] = useState(false)

  const filtered = MOCK_TICKETS.filter(t =>
    t.subject.toLowerCase().includes(search.toLowerCase()) || t.number.toLowerCase().includes(search.toLowerCase())
  )

  const openCount = MOCK_TICKETS.filter(t => t.status !== "resolved").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tickets</h1>
          <p className="text-sm text-muted-foreground">{openCount} open, {MOCK_TICKETS.length - openCount} resolved</p>
        </div>
        <Button onClick={() => setShowNewTicket(!showNewTicket)}>
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      </div>

      {showNewTicket && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create New Ticket</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input placeholder="Briefly describe your issue..." className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option>VPN & Network</option>
                <option>Email & Calendar</option>
                <option>Hardware</option>
                <option>Software</option>
                <option>Security</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" rows={4} placeholder="Provide details about your request or issue..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowNewTicket(false)}>Cancel</Button>
              <Button size="sm">Submit Ticket</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="space-y-3">
        {filtered.map(ticket => {
          const style = STATUS_STYLES[ticket.status] || STATUS_STYLES.open
          return (
            <Card key={ticket.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.number}</span>
                      <Badge className={style.className}>{style.label}</Badge>
                    </div>
                    <h3 className="font-medium">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{ticket.lastComment}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Created {ticket.createdAt}</span>
                      <span>Updated {ticket.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
