"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Plus, Search } from "lucide-react"

interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  description?: string
  status: string
  priority: string
  category?: string
  createdAt: string
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "destructive", in_progress: "default", waiting: "secondary", resolved: "outline", closed: "outline",
}

export default function PortalTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/v1/public/portal-tickets")
      const json = await res.json()
      if (json.success) setTickets(json.data.tickets || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchTickets() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/v1/public/portal-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description, category }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create")
      setSubject("")
      setDescription("")
      setShowForm(false)
      fetchTickets()
    } catch (err: any) {
      setError(err.message)
    } finally { setSaving(false) }
  }

  const filtered = tickets.filter(t =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.ticketNumber.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Tickets</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}
              <div>
                <label className="text-sm font-medium">Subject *</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Describe your issue" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onChange={e => setCategory(e.target.value)} className="mt-1">
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="feature_request">Feature Request</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details..." rows={4} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Submit Ticket"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {tickets.length === 0 ? "No tickets yet. Create one to get started." : "No tickets match your search."}
            </CardContent>
          </Card>
        ) : (
          filtered.map(ticket => (
            <Card key={ticket.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ticket.subject}</span>
                      <Badge variant={statusColors[ticket.status] || "outline"}>{ticket.status.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-xs">{ticket.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ticket.ticketNumber} · {new Date(ticket.createdAt).toLocaleDateString()}
                      {ticket.category ? ` · ${ticket.category}` : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
