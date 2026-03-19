"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/stat-card"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { AiConfigForm } from "@/components/ai-config-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Zap, TrendingUp, Clock, Plus, Pencil, Trash2 } from "lucide-react"

interface AgentConfig {
  id: string
  configName: string
  model: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  toolsEnabled?: string
  kbEnabled?: boolean
  kbMaxArticles?: number
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
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<AgentConfig | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchData = async () => {
    try {
      const hdrs: Record<string, string> = orgId ? { "x-organization-id": String(orgId) } : {}
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch("/api/v1/ai-configs", { headers: hdrs }).then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/ai-sessions", { headers: hdrs }).then(r => r.json()).catch(() => ({ success: false })),
      ])
      if (agentsRes.success) setAgents(agentsRes.data?.configs || [])
      if (sessionsRes.success) setSessions(sessionsRes.data?.sessions || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/ai-configs/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchData()
  }

  const activeAgents = agents.filter(a => a.isActive).length
  const totalMessages = sessions.reduce((s, sess) => s + sess.messagesCount, 0)

  const sessionColumns = [
    { key: "id", label: "Session", render: (item: any) => <span>{item.id?.slice(0, 8)}...</span> },
    { key: "messagesCount", label: "Messages", sortable: true },
    {
      key: "status", label: "Status", sortable: true,
      render: (item: any) => (
        <Badge variant={item.status === "active" ? "default" : "secondary"}>{item.status}</Badge>
      ),
    },
    {
      key: "createdAt", label: "Created", sortable: true,
      render: (item: any) => <span>{new Date(item.createdAt).toLocaleDateString()}</span>,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Command Center</h1>
          <p className="text-muted-foreground">Monitor and manage AI agent activity</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> New Agent
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="AI Agents" value={agents.length} icon={<Zap className="h-4 w-4" />} description={`${activeAgents} active`} />
        <StatCard title="Chat Sessions" value={sessions.length} icon={<Clock className="h-4 w-4" />} />
        <StatCard title="Total Messages" value={totalMessages} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Active Agents" value={activeAgents} description={`of ${agents.length}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Agent Configurations</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.length > 0 ? agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">{agent.configName}</div>
                  <div className="text-xs text-muted-foreground">{agent.model} · v{agent.version}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={agent.isActive ? "default" : "secondary"}>
                    {agent.isActive ? "active" : "inactive"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setEditData(agent); setShowForm(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setDeleteId(agent.id); setDeleteName(agent.configName) }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            )) : <div className="text-sm text-muted-foreground">No AI agents configured</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Chat Sessions</CardTitle></CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <DataTable columns={sessionColumns} data={sessions} searchPlaceholder="Search sessions..." searchKey="id" pageSize={10} />
          ) : <div className="text-sm text-muted-foreground p-4">No chat sessions yet</div>}
        </CardContent>
      </Card>

      <AiConfigForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchData}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title="Delete AI Agent"
        itemName={deleteName}
      />
    </div>
  )
}
