"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Phone, Mail,
  MessageSquare, FileText, CheckSquare, Users, BarChart3,
  Ticket, CalendarDays, Video, MapPin, AlertTriangle, Loader2,
} from "lucide-react"

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7:00 - 19:00

// Type styling config
const TYPE_CONFIG: Record<string, { icon: any; bg: string; border: string; text: string; label: string }> = {
  ticket: { icon: Ticket, bg: "bg-red-50", border: "border-l-red-500", text: "text-red-700", label: "Ticket" },
  task: { icon: CheckSquare, bg: "bg-orange-50", border: "border-l-orange-500", text: "text-orange-700", label: "Task" },
  event: { icon: CalendarDays, bg: "bg-indigo-50", border: "border-l-indigo-500", text: "text-indigo-700", label: "Event" },
  activity_call: { icon: Phone, bg: "bg-green-50", border: "border-l-green-500", text: "text-green-700", label: "Call" },
  activity_email: { icon: Mail, bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700", label: "Email" },
  activity_meeting: { icon: Users, bg: "bg-violet-50", border: "border-l-violet-500", text: "text-violet-700", label: "Meeting" },
  activity_note: { icon: FileText, bg: "bg-amber-50", border: "border-l-amber-500", text: "text-amber-700", label: "Note" },
  activity_task: { icon: CheckSquare, bg: "bg-teal-50", border: "border-l-teal-500", text: "text-teal-700", label: "Task Activity" },
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0]
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface CalendarItem {
  id: string
  type: string
  title: string
  date: string
  endDate?: string
  hour: number
  endHour?: number
  status?: string
  priority?: string
  url?: string
  location?: string
  isOnline?: boolean
  eventType?: string
  completed?: boolean
}

export default function AgentCalendarPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const orgId = session?.user?.organizationId
  const [currentDate, setCurrentDate] = useState(new Date())
  const [items, setItems] = useState<CalendarItem[]>([])
  const [counts, setCounts] = useState({ tickets: 0, tasks: 0, events: 0, activities: 0 })
  const [loading, setLoading] = useState(true)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const today = new Date()

  const fetchData = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const headers: any = orgId ? { "x-organization-id": String(orgId) } : {}
    const from = formatDate(weekDates[0])
    const to = formatDate(weekDates[6])

    try {
      const res = await fetch(`/api/v1/calendar/agent?from=${from}&to=${to}`, { headers })
      const json = await res.json()
      if (json.success) {
        setItems(json.data.items || [])
        setCounts(json.data.counts || { tickets: 0, tasks: 0, events: 0, activities: 0 })
      }
    } catch (e) {
      console.error("Failed to fetch calendar data:", e)
    } finally {
      setLoading(false)
    }
  }, [session, orgId, weekDates])

  useEffect(() => { fetchData() }, [fetchData])

  const prevWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 7)
    setCurrentDate(d)
  }
  const nextWeek = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 7)
    setCurrentDate(d)
  }
  const goToday = () => setCurrentDate(new Date())

  const getItemsForDay = (date: Date) =>
    items.filter(item => isSameDay(new Date(item.date), date))

  const getItemsForSlot = (date: Date, hour: number) =>
    items.filter(item => {
      const d = new Date(item.date)
      return isSameDay(d, date) && d.getHours() === hour
    })

  const weekLabel = `${weekDates[0].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${weekDates[6].toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`

  const totalItems = items.length

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Agent Calendar</h1>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Ticket className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.tickets}</p>
              <p className="text-xs text-muted-foreground">Tickets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.tasks}</p>
              <p className="text-xs text-muted-foreground">Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.events}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.activities}</p>
              <p className="text-xs text-muted-foreground">Activities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Calendar Grid */}
      <Card className="border-none shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading calendar...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/40">
                <div className="p-2" />
                {weekDates.map((date, i) => {
                  const isToday = isSameDay(date, today)
                  const dayItems = getItemsForDay(date)
                  return (
                    <div key={i} className={`p-2 text-center border-l ${isToday ? "bg-primary/5" : ""}`}>
                      <p className="text-xs text-muted-foreground">{DAY_NAMES[i]}</p>
                      <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                        {isToday ? (
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white">
                            {date.getDate()}
                          </span>
                        ) : date.getDate()}
                      </p>
                      {dayItems.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-1">
                          {dayItems.some(d => d.type === "ticket") && <div className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                          {dayItems.some(d => d.type === "task") && <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                          {dayItems.some(d => d.type === "event") && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                          {dayItems.some(d => d.type.startsWith("activity_")) && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Time slots */}
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[64px] group">
                  <div className="p-2 text-xs text-muted-foreground text-right pr-3 pt-1">
                    {hour}:00
                  </div>
                  {weekDates.map((date, i) => {
                    const isToday = isSameDay(date, today)
                    const slotItems = getItemsForSlot(date, hour)
                    const isNowSlot = isToday && today.getHours() === hour

                    return (
                      <div
                        key={i}
                        className={`border-l p-0.5 relative transition-colors ${
                          isToday ? "bg-primary/[0.02]" : ""
                        } ${isNowSlot ? "bg-primary/[0.06]" : ""}`}
                      >
                        {/* Current time indicator */}
                        {isNowSlot && (
                          <div
                            className="absolute left-0 right-0 border-t-2 border-primary z-10 pointer-events-none"
                            style={{ top: `${(today.getMinutes() / 60) * 100}%` }}
                          >
                            <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-primary" />
                          </div>
                        )}

                        {slotItems.map(item => {
                          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.activity_note
                          const Icon = config.icon
                          const isHovered = hoveredItem === item.id
                          const spanHours = item.type === "event" && item.endHour ? Math.max(item.endHour - item.hour, 1) : 1

                          return (
                            <div
                              key={item.id}
                              onClick={() => item.url && router.push(item.url)}
                              onMouseEnter={() => setHoveredItem(item.id)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={`rounded-md border-l-[3px] px-1.5 py-1 mb-0.5 text-xs cursor-pointer transition-all ${config.bg} ${config.border} ${
                                isHovered ? "shadow-md scale-[1.02] z-20 relative" : ""
                              }`}
                              style={spanHours > 1 ? { minHeight: `${spanHours * 64 - 4}px` } : {}}
                            >
                              <div className="flex items-center gap-1">
                                <Icon className={`h-3 w-3 flex-shrink-0 ${config.text}`} />
                                <span className={`truncate font-medium ${config.text}`}>{item.title}</span>
                              </div>
                              {/* Priority dot */}
                              {item.priority && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className={`h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[item.priority] || "bg-gray-400"}`} />
                                  <span className="text-[10px] text-muted-foreground capitalize">{item.priority}</span>
                                </div>
                              )}
                              {/* Event location */}
                              {item.location && isHovered && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground truncate">{item.location}</span>
                                </div>
                              )}
                              {/* Status badge */}
                              {item.status && isHovered && (
                                <Badge variant="outline" className="mt-0.5 text-[9px] h-4 px-1">
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Bottom: Legend + Today's schedule */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Legend */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Legend</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, config]) => {
              const Icon = config.icon
              const count = items.filter(i => i.type === key).length
              if (count === 0 && !["ticket", "task", "event", "activity_call"].includes(key)) return null
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div className={`h-6 w-6 rounded flex items-center justify-center border-l-[3px] ${config.bg} ${config.border}`}>
                    <Icon className={`h-3 w-3 ${config.text}`} />
                  </div>
                  <span className="flex-1 text-xs">{config.label}</span>
                  <span className="font-semibold text-xs">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Today's schedule */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Today — {today.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const todayItems = items
                .filter(item => isSameDay(new Date(item.date), today))
                .sort((a, b) => a.hour - b.hour)

              if (todayItems.length === 0) {
                return (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No items for today</p>
                  </div>
                )
              }

              return (
                <div className="space-y-2">
                  {todayItems.map(item => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.activity_note
                    const Icon = config.icon
                    const time = new Date(item.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
                    return (
                      <div
                        key={item.id}
                        onClick={() => item.url && router.push(item.url)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-l-[3px] ${config.border}`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                          <Icon className={`h-4 w-4 ${config.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{time} · {config.label}</p>
                        </div>
                        {item.priority && (
                          <div className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[item.priority] || "bg-gray-400"}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
