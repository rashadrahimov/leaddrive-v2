"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  CalendarDays, Plus, Search, MapPin, Globe, Users, DollarSign,
  Pencil, Trash2, Clock,
} from "lucide-react"
import { EventForm } from "@/components/event-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  registration_open: "bg-violet-100 text-violet-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
}

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  registration_open: "Registration Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

const TYPE_LABELS: Record<string, string> = {
  conference: "Conference",
  webinar: "Webinar",
  workshop: "Workshop",
  meetup: "Meetup",
  exhibition: "Exhibition",
  other: "Other",
}

export default function EventsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const orgId = session?.user?.organizationId
  const [events, setEvents] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteEvent, setDeleteEvent] = useState<any>(null)

  const fetchEvents = async () => {
    try {
      const qs = new URLSearchParams()
      if (search) qs.set("search", search)
      if (statusFilter) qs.set("status", statusFilter)
      const res = await fetch(`/api/v1/events?${qs}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) {
        setEvents(json.data.events)
        setTotal(json.data.total)
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { if (session) fetchEvents() }, [session, search, statusFilter])

  const handleDelete = async () => {
    if (!deleteEvent) return
    await fetch(`/api/v1/events/${deleteEvent.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    setDeleteEvent(null)
    fetchEvents()
  }

  const statusCounts = events.reduce((acc: Record<string, number>, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Events</h1>
            <p className="text-sm text-muted-foreground">{total} events total</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Event
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!statusFilter ? "default" : "outline"}
          size="sm" className="h-8 text-xs"
          onClick={() => setStatusFilter("")}
        >
          All ({total})
        </Button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Button
            key={key}
            variant={statusFilter === key ? "default" : "outline"}
            size="sm" className="h-8 text-xs"
            onClick={() => setStatusFilter(statusFilter === key ? "" : key)}
          >
            {label} ({statusCounts[key] || 0})
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9 h-9"
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Event cards */}
      {loading ? (
        <div className="grid gap-3">
          {[0,1,2].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No events yet</p>
          <p className="text-sm">Create your first event to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map(event => (
            <Card
              key={event.id}
              className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/events/${event.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Date block */}
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-primary uppercase">
                      {new Date(event.startDate).toLocaleString("en", { month: "short" })}
                    </span>
                    <span className="text-xl font-bold text-primary leading-tight">
                      {new Date(event.startDate).getDate()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{event.name}</h3>
                      <Badge className={STATUS_STYLES[event.status] || ""}>{STATUS_LABELS[event.status] || event.status}</Badge>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[event.type] || event.type}</Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {event.location}
                        </span>
                      )}
                      {event.isOnline && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Online
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event._count?.participants || event.registeredCount || 0}
                        {event.maxParticipants ? ` / ${event.maxParticipants}` : ""} participants
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(event.startDate).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {event.budget > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {event.budget.toLocaleString()} ₼
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteEvent(event)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventForm open={createOpen} onOpenChange={setCreateOpen} onSaved={fetchEvents} orgId={orgId} />
      <DeleteConfirmDialog
        open={!!deleteEvent}
        onOpenChange={(v) => !v && setDeleteEvent(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        itemName={deleteEvent?.name}
      />
    </div>
  )
}
