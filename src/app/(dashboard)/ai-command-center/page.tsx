"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { Zap, TrendingUp, Clock } from "lucide-react"

interface AgentConfig {
  id: string
  configName: string
  model: string
  isActive: boolean
  version: number
  notes: string | null
}

interface ChatSession {
  id: string
  messagesCount: number
  status: string
  createdAt: string
  companyId: string | null
}

export default function AICommandCenterPage() {
  const { data: session } = useSession()
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const orgId = (session?.user as any)?.organizationId

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = orgId ? { "x-organization-id": orgId } : {}
        const [agentsRes, sessionsRes] = await Promise.all([
          fetch("/api/v1/ai-configs", { headers }).then(r => r.json()).catch(() => ({ success: false })),
          fetch("/api/v1/ai-sessions", { headers }).then(r => r.json()).catch(() => ({ success: false })),
        ])
        if (agentsRes.success) setAgents(agentsRes.data?.configs || [])
        if (sessionsRes.success) setSessions(sessionsRes.data?.sessions || [])
      } catch {} finally { setLoading(false) }
    }
    fetchData()
  }, [session])

  const activeAgents = agents.filter(a => a.isActive).length
  const totalMessages = sessions.reduce((s, sess) => s + sess.messagesCount, 0)

  const sessionColumns = [
    { key: "id", label: "Session", render: (item: ChatSession) => item.id.slice(0, 8) + "..." },
    { key: "messagesCount", label: "Messages", sortable: true },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: ChatSession) => (
        <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
      ),
    },
    {
      key: "createdAt", label: "Created", sortable: true,
      render: (item: ChatSession) => new Date(item.createdAt).toLocaleDateString(),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
        <div className="animate-pulse"><div className="h-96 bg-muted rounded-lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
        <p className="text-muted-foreground">Monitor and manage AI agent activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="AI Agents" value={agents.length} icon={<Zap className="h-4 w-4" />} description={`${activeAgents} active`} />
        <StatCard title="Chat Sessions" value={sessions.length} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="Total Messages" value={totalMessages} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Active Agents" value={activeAgents} description={`of ${agents.length}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Agent Configurations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agents.length > 0 ? agents.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium">{agent.configName}</div>
                    <div className="text-xs text-muted-foreground">{agent.model} · v{agent.version}</div>
                  </div>
                  <Badge variant={agent.isActive ? "default" : "secondary"}>
                    {agent.isActive ? "active" : "inactive"}
                  </Badge>
                </div>
              )) : <div className="text-sm text-muted-foreground">No AI agents configured</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">Configure Agents</Button>
            <Button className="w-full" variant="outline">View Logs</Button>
            <Button className="w-full" variant="outline">API Documentation</Button>
            <Button className="w-full" variant="outline">Usage Analytics</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Chat Sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <DataTable columns={sessionColumns} data={sessions} searchPlaceholder="Search sessions..." searchKey="id" pageSize={10} />
          ) : <div className="text-sm text-muted-foreground p-4">No chat sessions yet</div>}
        </CardContent>
      </Card>
    </div>
  )
}
