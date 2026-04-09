"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Activity, LogIn, LogOut, Camera, Download } from "lucide-react"

export default function MtmActivityPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState("")
  const orgId = session?.user?.organizationId

  const fetchActivity = async () => {
    try {
      const url = `/api/v1/mtm/activity?limit=50${type ? `&type=${type}` : ""}`
      const res = await fetch(url, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const r = await res.json()
      if (r.success) setData(r.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchActivity() }, [session, type])

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={Activity} title="Activity Journal" description="Check-in/check-out and field activity log" />
      <div className="animate-pulse space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    </div>
  )

  const kpi = data?.kpi || { totalActivities: 0, totalCheckIns: 0, totalCheckOuts: 0, totalPhotos: 0 }
  const logs = data?.logs || []

  const actionColors: Record<string, string> = {
    VISIT_CHECK_IN: "bg-green-100 text-green-700",
    VISIT_CHECK_OUT: "bg-blue-100 text-blue-700",
    PHOTO_UPLOAD: "bg-purple-100 text-purple-700",
    TASK_CREATED: "bg-amber-100 text-amber-700",
    TASK_COMPLETED: "bg-teal-100 text-teal-700",
    ROUTE_STARTED: "bg-cyan-100 text-cyan-700",
    ROUTE_COMPLETED: "bg-green-100 text-green-700",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Activity} title="Activity Journal" description="Check-in/check-out and field activity log" />
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label="Total Activity" value={kpi.totalActivities} icon={<Activity className="h-4 w-4" />} color="violet" />
        <ColorStatCard label="Check-in" value={kpi.totalCheckIns} icon={<LogIn className="h-4 w-4" />} color="green" />
        <ColorStatCard label="Check-out" value={kpi.totalCheckOuts} icon={<LogOut className="h-4 w-4" />} color="teal" />
        <ColorStatCard label="Photo Upload" value={kpi.totalPhotos} icon={<Camera className="h-4 w-4" />} color="blue" />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Activity Type</h3>
          <Select value={type} onChange={e => setType(e.target.value)} className="w-[200px]">
            <option value="">All</option>
            <option value="CHECK_IN">Check-in</option>
            <option value="CHECK_OUT">Check-out</option>
            <option value="PHOTO">Photo Upload</option>
          </Select>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">
          No activity found for this period
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">Time</th>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-medium">{log.agent?.name || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs max-w-[300px] truncate">
                    {log.details || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
