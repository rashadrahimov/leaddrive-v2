"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { MtmAgentForm } from "@/components/mtm/agent-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { UserCog, Plus, Pencil, Trash2 } from "lucide-react"

const roleColors: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  SUPERVISOR: "bg-indigo-100 text-indigo-700",
  AGENT: "bg-cyan-100 text-cyan-700",
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-muted text-muted-foreground",
  SUSPENDED: "bg-red-100 text-red-600",
}

export default function MtmAgentsPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const orgId = session?.user?.organizationId

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/v1/mtm/agents?limit=50", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setAgents(r.data.agents || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAgents() }, [session])

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/agents/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchAgents()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={UserCog} title={t("mtmAgents")} description="Manage field agents and teams" />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Agent
        </Button>
      </div>

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
                    <span className="relative flex h-2 w-2">
                      <span className={`absolute inline-flex h-full w-full rounded-full ${agent.isOnline ? "bg-green-400 animate-ping opacity-75" : ""}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${agent.isOnline ? "bg-green-500" : "bg-muted-foreground/30"}`}></span>
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{agent.email || agent.phone || "—"}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditData(agent); setFormOpen(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteItem(agent); setDeleteOpen(true) }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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

      <MtmAgentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={fetchAgents}
        initialData={editData}
        orgId={orgId ? String(orgId) : undefined}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Agent"
        itemName={deleteItem?.name}
      />
    </div>
  )
}
