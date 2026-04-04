"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { UserCog } from "lucide-react"

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  AGENT: "bg-cyan-100 text-cyan-700",
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-muted text-muted-foreground",
  SUSPENDED: "bg-red-100 text-red-600",
}

export default function MtmAgentsPage() {
  const t = useTranslations("nav")
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/mtm/agents?limit=50")
      .then((r) => r.json())
      .then((r) => { if (r.success) setAgents(r.data.agents || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <PageDescription icon={UserCog} title={t("mtmAgents")} description="Manage field agents and teams" />

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>
      ) : agents.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">No agents yet</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-semibold">
                  {agent.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {agent.name}
                    <span className={`relative flex h-2 w-2`}>
                      <span className={`absolute inline-flex h-full w-full rounded-full ${agent.isOnline ? "bg-green-400 animate-ping opacity-75" : ""}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.isOnline ? "bg-green-500" : "bg-muted-foreground/30"}`}></span>
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{agent.email || agent.phone || "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${roleColors[agent.role] || ""}`}>{agent.role}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColors[agent.status] || ""}`}>{agent.status}</span>
                {agent.manager && <span className="text-[10px] text-muted-foreground">Manager: {agent.manager.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
