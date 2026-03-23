"use client"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar, ChevronLeft, ChevronRight, Clock, Phone, Mail,
  MessageSquare, FileText, CheckSquare, Users, BarChart3,
} from "lucide-react"

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8:00 - 19:00

const TYPE_ICON: Record<string, any> = {
  call: Phone, email: Mail, meeting: Users, note: FileText, task: CheckSquare,
}
const TYPE_COLOR: Record<string, string> = {
  call: "bg-green-100 border-green-400 text-green-700",
  email: "bg-blue-100 border-blue-400 text-blue-700",
  meeting: "bg-violet-100 border-violet-400 text-violet-700",
  note: "bg-amber-100 border-amber-400 text-amber-700",
  task: "bg-orange-100 border-orange-400 text-orange-700",
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function AgentCalendarPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const orgId = session?.user?.organizationId
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activities, setActivities] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])
  const today = new Date()

  useEffect(() => {
    if (!session) return
    const headers: any = orgId ? { "x-organization-id": String(orgId) } : {}

    Promise.all([
      fetch("/api/v1/activities?limit=200", { headers }).then(r => r.json()),
      fetch("/api/v1/tasks?limit=200", { headers }).then(r => r.json()),
    ]).then(([actRes, taskRes]) => {
      setActivities(actRes?.data?.activities || actRes?.data || [])
      setTasks(taskRes?.data?.tasks || taskRes?.data || [])
    }).finally(() => setLoading(false))
  }, [session])

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

  // Combine activities + tasks into calendar items
  const calendarItems = useMemo(() => {
    const items: { id: string; type: string; subject: string; date: Date; hour: number }[] = []

    activities.forEach((a: any) => {
      const d = a.scheduledAt ? new Date(a.scheduledAt) : new Date(a.createdAt)
      items.push({ id: a.id, type: a.type || "note", subject: a.subject || "Activity", date: d, hour: d.getHours() })
    })

    tasks.forEach((t: any) => {
      const d = t.dueDate ? new Date(t.dueDate) : new Date(t.createdAt)
      items.push({ id: t.id, type: "task", subject: t.title || "Task", date: d, hour: d.getHours() })
    })

    return items
  }, [activities, tasks])

  // Group items by day of week
  const getItemsForDay = (date: Date) =>
    calendarItems.filter(item => isSameDay(item.date, date))

  // Cases by client stats
  const clientCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach((t: any) => {
      const name = t.relatedType === "company" ? "Company" : t.relatedType === "contact" ? "Contact" : "Other"
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [tasks])

  const weekLabel = `${weekDates[0].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${weekDates[6].toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`

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

      {/* Weekly Calendar Grid */}
      <Card className="border-none shadow-sm overflow-hidden">
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
                    <p className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>{date.getDate()}</p>
                    {dayItems.length > 0 && (
                      <Badge variant="outline" className="text-[10px] mt-0.5">{dayItems.length}</Badge>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time slots */}
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[60px]">
                <div className="p-2 text-xs text-muted-foreground text-right pr-3 pt-1">
                  {hour}:00
                </div>
                {weekDates.map((date, i) => {
                  const isToday = isSameDay(date, today)
                  const hourItems = calendarItems.filter(
                    item => isSameDay(item.date, date) && item.hour === hour
                  )
                  return (
                    <div
                      key={i}
                      className={`border-l p-0.5 ${isToday ? "bg-primary/5" : ""}`}
                    >
                      {hourItems.map(item => {
                        const Icon = TYPE_ICON[item.type] || Clock
                        return (
                          <div
                            key={item.id}
                            className={`rounded-md border px-1.5 py-1 mb-0.5 text-xs cursor-pointer hover:opacity-80 ${TYPE_COLOR[item.type] || "bg-gray-100 border-gray-300"}`}
                          >
                            <div className="flex items-center gap-1">
                              <Icon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate font-medium">{item.subject}</span>
                            </div>
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
      </Card>

      {/* Bottom section: Legend + Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Activity Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(TYPE_COLOR).map(([type, cls]) => {
              const Icon = TYPE_ICON[type] || Clock
              const count = calendarItems.filter(i => i.type === type).length
              return (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <div className={`h-6 w-6 rounded flex items-center justify-center border ${cls}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="flex-1 capitalize">{type}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tasks by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {clientCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            ) : (
              <div className="space-y-2">
                {clientCounts.map(([name, count]) => {
                  const maxCount = clientCounts[0][1] as number
                  const pct = Math.max((count as number / maxCount) * 100, 5)
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
