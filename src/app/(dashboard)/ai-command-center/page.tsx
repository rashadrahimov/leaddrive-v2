"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Zap, TrendingUp, Clock } from "lucide-react"

const AGENT_STATUS = [
  { id: "1", name: "Lead Scorer", status: "active", requests: 4521, avgLatency: 245, uptime: "99.9%" },
  { id: "2", name: "Email Composer", status: "active", requests: 3892, avgLatency: 312, uptime: "99.8%" },
  { id: "3", name: "Meeting Scheduler", status: "inactive", requests: 1245, avgLatency: 521, uptime: "98.5%" },
  { id: "4", name: "Deal Analyzer", status: "active", requests: 2156, avgLatency: 198, uptime: "99.9%" },
]

const RECENT_SESSIONS = [
  { id: "1", agent: "Lead Scorer", user: "Rashad", input: "Score lead: Zeytunpharma", duration: "0.24s", status: "completed" },
  { id: "2", agent: "Email Composer", user: "Afsana", input: "Write follow-up email", duration: "1.32s", status: "completed" },
  { id: "3", agent: "Deal Analyzer", user: "Azar", input: "Analyze GTL deal", duration: "0.45s", status: "completed" },
  { id: "4", agent: "Lead Scorer", user: "Admin", input: "Batch score contacts", duration: "2.15s", status: "completed" },
]

export default function AICommandCenterPage() {
  const columns = [
    { key: "agent", label: "Agent", sortable: true },
    { key: "user", label: "User", sortable: true },
    { key: "input", label: "Task", sortable: false },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (item: typeof RECENT_SESSIONS[0]) => (
        <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {item.status}
        </Badge>
      ),
    },
    { key: "duration", label: "Duration", sortable: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
        <p className="text-muted-foreground">Monitor and manage AI agent activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Requests" value={12814} icon={<Zap className="h-4 w-4" />} trend="up" description="+2,341 this month" />
        <StatCard title="Avg Latency" value="269ms" icon={<Clock className="h-4 w-4" />} description="2% faster" />
        <StatCard title="Uptime" value="99.8%" icon={<TrendingUp className="h-4 w-4" />} trend="up" />
        <StatCard title="Active Agents" value={3} description="of 4" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {AGENT_STATUS.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.requests.toLocaleString()} requests</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                      {agent.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">{agent.avgLatency}ms latency</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">Configure Agents</Button>
            <Button className="w-full" variant="outline">View Logs</Button>
            <Button className="w-full" variant="outline">API Documentation</Button>
            <Button className="w-full" variant="outline">Usage Analytics</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={RECENT_SESSIONS}
            searchPlaceholder="Search by agent, user, or task..."
            searchKey="agent"
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  )
}
