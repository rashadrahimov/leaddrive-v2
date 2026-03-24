"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Phone, Mail, Users, FileText, CheckSquare, MessageSquare, Filter, Plus } from "lucide-react"

interface TimelineItem {
  id: string
  type: string
  subject: string
  description?: string
  date: string
  author?: string
}

const TYPE_CONFIG: Record<string, { icon: any; bg: string; text: string; labelKey: string }> = {
  call: { icon: Phone, bg: "bg-green-100", text: "text-green-600", labelKey: "actTypeCall" },
  email: { icon: Mail, bg: "bg-blue-100", text: "text-blue-600", labelKey: "actTypeEmail" },
  meeting: { icon: Users, bg: "bg-violet-100", text: "text-violet-600", labelKey: "actTypeMeeting" },
  note: { icon: FileText, bg: "bg-amber-100", text: "text-amber-600", labelKey: "actTypeNote" },
  task: { icon: CheckSquare, bg: "bg-orange-100", text: "text-orange-600", labelKey: "actTypeTask" },
  comment: { icon: MessageSquare, bg: "bg-gray-100", text: "text-gray-600", labelKey: "actTypeComment" },
}

export function ActivityTimeline({ dealId, orgId }: { dealId: string; orgId?: string }) {
  const tc = useTranslations("common")
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const headers: any = orgId ? { "x-organization-id": orgId } : {}

    Promise.all([
      fetch(`/api/v1/activities?relatedType=deal&relatedId=${dealId}&limit=50`, { headers }).then(r => r.json()),
      fetch(`/api/v1/deals/${dealId}`, { headers }).then(r => r.json()),
    ]).then(([actRes, dealRes]) => {
      const timeline: TimelineItem[] = []

      // Activities
      const acts = actRes?.data?.activities || actRes?.data || []
      acts.forEach((a: any) => {
        timeline.push({
          id: a.id,
          type: a.type || "note",
          subject: a.subject || "Activity",
          description: a.description,
          date: a.scheduledAt || a.createdAt,
          author: a.createdByName,
        })
      })

      // Comments from deal
      const comments = dealRes?.data?.comments || []
      comments.forEach((c: any) => {
        timeline.push({
          id: c.id,
          type: "comment",
          subject: c.isInternal ? "Internal note" : "Comment",
          description: c.comment,
          date: c.createdAt,
          author: c.userName,
        })
      })

      // Sort by date desc
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setItems(timeline)
    }).finally(() => setLoading(false))
  }, [dealId, orgId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filters = ["all", "call", "email", "meeting", "note", "task", "comment"]
  const filtered = filter === "all" ? items : items.filter(i => i.type === filter)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {filters.map(f => {
          const count = f === "all" ? items.length : items.filter(i => i.type === f).length
          if (f !== "all" && count === 0) return null
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              }`}
            >
              {f === "all" ? tc("actTypeAll") : tc((TYPE_CONFIG[f]?.labelKey || "actTypeNote") as any)} ({count})
            </button>
          )
        })}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{tc("noActivities")}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{tc("activitiesHint")}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {filtered.map((item, i) => {
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.note
              const Icon = config.icon
              const isFirst = i === 0

              return (
                <div key={item.id} className="flex gap-3 relative group">
                  {/* Icon */}
                  <div className={`relative z-10 h-10 w-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 ${isFirst ? "ring-2 ring-primary/20" : ""}`}>
                    <Icon className={`h-4 w-4 ${config.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4 min-w-0">
                    <div className="bg-card rounded-lg border p-3 shadow-sm group-hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{tc((config.labelKey || "actTypeNote") as any)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.date).toLocaleString("az-AZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {item.author && <span className="text-xs text-muted-foreground ml-auto">{tc("by", { name: item.author })}</span>}
                      </div>
                      <p className="text-sm font-medium">{item.subject}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
