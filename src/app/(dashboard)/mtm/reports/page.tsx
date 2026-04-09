"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { PageDescription } from "@/components/page-description"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Users, Route, MapPin, Satellite, Camera, Download, ArrowRight } from "lucide-react"

const reportTypes = [
  { id: "daily", label: "Daily Report", description: "Daily visit and task results analysis", icon: Calendar, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
  { id: "agent", label: "Agent Performance", description: "Agent activity and performance metrics", icon: Users, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
  { id: "route", label: "Route Execution", description: "Route plan execution and deviation analysis", icon: Route, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
  { id: "visit", label: "Customer Visits", description: "Customer visit frequency and duration analysis", icon: MapPin, color: "text-red-500 bg-red-50 dark:bg-red-950/30" },
  { id: "gps", label: "GPS & Location", description: "Agent GPS status and device battery monitoring", icon: Satellite, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30" },
  { id: "photo", label: "Photo Report", description: "Photo quality and metadata audit", icon: Camera, color: "text-green-500 bg-green-50 dark:bg-green-950/30" },
]

export default function MtmReportsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"today" | "week" | "month">("week")
  const [selectedType, setSelectedType] = useState("")
  const [reportData, setReportData] = useState<any[]>([])
  const orgId = session?.user?.organizationId

  const fetchReports = async (type?: string) => {
    try {
      const url = `/api/v1/mtm/reports?period=${period}${type ? `&type=${type}` : ""}`
      const res = await fetch(url, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const r = await res.json()
      if (r.success) {
        setData(r.data)
        if (r.data.reportData) setReportData(r.data.reportData)
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports() }, [session, period])

  const handleViewReport = (type: string) => {
    setSelectedType(type)
    setLoading(true)
    fetchReports(type)
  }

  if (loading && !data) return (
    <div className="space-y-6">
      <PageDescription icon={FileText} title="Reports" description="Review and export various report types" />
      <div className="animate-pulse grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-muted rounded-lg" />)}</div>
    </div>
  )

  const counts = data?.counts || {}

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={FileText} title="Reports" description="Review and export various report types" />
        <div className="flex gap-2">
          {(["today", "week", "month"] as const).map(p => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => { setPeriod(p); setSelectedType("") }}>
              {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </Button>
          ))}
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      {!selectedType ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map(rt => {
            const Icon = rt.icon
            const count = counts[rt.id] || 0
            return (
              <div key={rt.id} className="rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${rt.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{count} records</span>
                </div>
                <h3 className="font-semibold mt-3">{rt.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{rt.description}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[10px] text-muted-foreground">Last generated: {new Date().toLocaleDateString()}</span>
                  <Button variant="link" size="sm" className="text-primary p-0 h-auto" onClick={() => handleViewReport(rt.id)}>
                    View <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedType("")}>← Back to Reports</Button>
            <h3 className="font-semibold">{reportTypes.find(r => r.id === selectedType)?.label}</h3>
          </div>

          {reportData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No data for this report type</div>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    {selectedType === "agent" ? (
                      <>
                        <th className="px-4 py-2 font-medium">Agent</th>
                        <th className="px-4 py-2 font-medium">Role</th>
                        <th className="px-4 py-2 font-medium">Visits</th>
                        <th className="px-4 py-2 font-medium">Tasks</th>
                        <th className="px-4 py-2 font-medium">Photos</th>
                      </>
                    ) : selectedType === "visit" ? (
                      <>
                        <th className="px-4 py-2 font-medium">Agent</th>
                        <th className="px-4 py-2 font-medium">Customer</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium">Check-in</th>
                      </>
                    ) : (
                      <>
                        <th className="px-4 py-2 font-medium">Date</th>
                        <th className="px-4 py-2 font-medium">Agent</th>
                        <th className="px-4 py-2 font-medium">Details</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.slice(0, 50).map((row: any, i: number) => (
                    <tr key={row.id || i} className="border-b last:border-0 hover:bg-muted/30">
                      {selectedType === "agent" ? (
                        <>
                          <td className="px-4 py-2 font-medium">{row.name}</td>
                          <td className="px-4 py-2">{row.role}</td>
                          <td className="px-4 py-2">{row.visits}</td>
                          <td className="px-4 py-2">{row.tasks}</td>
                          <td className="px-4 py-2">{row.photos}</td>
                        </>
                      ) : selectedType === "visit" ? (
                        <>
                          <td className="px-4 py-2">{row.agent?.name}</td>
                          <td className="px-4 py-2">{row.customer?.name}</td>
                          <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{row.status}</span></td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{row.checkInAt ? new Date(row.checkInAt).toLocaleString() : "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(row.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-2">{row.agent?.name || "—"}</td>
                          <td className="px-4 py-2 text-xs max-w-[300px] truncate">{row.action || row.name || row.title || "—"}</td>
                          <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-muted">{row.status || "—"}</span></td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
