"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { MtmAgentForm } from "@/components/mtm/agent-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { UserCog, Plus, Pencil, Trash2, Search, Users, Wifi } from "lucide-react"

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
  const t = useTranslations("mtmAgents")
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(undefined)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<any>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name_asc")
  const orgId = session?.user?.organizationId

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/v1/mtm/agents?limit=200", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      const r = await res.json()
      if (r.success) setAgents(r.data.agents || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAgents() }, [session])

  const filtered = agents.filter(a => {
    if (activeFilter !== "all" && a.status !== activeFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!a.name?.toLowerCase().includes(s) && !a.email?.toLowerCase().includes(s)) return false
    }
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "name_asc": return (a.name || "").localeCompare(b.name || "")
      case "name_desc": return (b.name || "").localeCompare(a.name || "")
      case "role": return (a.role || "").localeCompare(b.role || "")
      case "status": return (a.status || "").localeCompare(b.status || "")
      default: return 0
    }
  })

  const statusCounts: Record<string, number> = {}
  for (const a of agents) statusCounts[a.status] = (statusCounts[a.status] || 0) + 1

  const totalActive = statusCounts["ACTIVE"] || 0
  const totalOnline = agents.filter(a => a.isOnline).length
  const totalManagers = agents.filter(a => a.role === "MANAGER" || a.role === "SUPERVISOR").length

  async function confirmDelete() {
    if (!deleteItem) return
    const res = await fetch(`/api/v1/mtm/agents/${deleteItem.id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error((await res.json()).error || "Failed to delete")
    fetchAgents()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageDescription icon={UserCog} title={t("title")} description={t("subtitle")} />
        <div className="animate-pulse space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={UserCog} title={`${t("title")} (${filtered.length})`} description={t("subtitle")} />
        <Button onClick={() => { setEditData(undefined); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> {t("add")}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger-children">
        <ColorStatCard label={t("statTotal")} value={agents.length} icon={<UserCog className="h-4 w-4" />} color="blue" hint={t("hintTotal")} />
        <ColorStatCard label={t("statActive")} value={totalActive} icon={<Users className="h-4 w-4" />} color="green" hint={t("hintActive")} />
        <ColorStatCard label={t("statOnline")} value={totalOnline} icon={<Wifi className="h-4 w-4" />} color="teal" hint={t("hintOnline")} />
        <ColorStatCard label={t("statManagers")} value={totalManagers} icon={<Users className="h-4 w-4" />} color="violet" hint={t("hintManagers")} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>
          {t("all")} ({agents.length})
        </Button>
        {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map(s => (
          <Button key={s} variant={activeFilter === s ? "default" : "outline"} size="sm" onClick={() => setActiveFilter(s)}>
            {t(`filter${s.charAt(0) + s.slice(1).toLowerCase()}` as any)} ({statusCounts[s] || 0})
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-[160px]">
          <option value="name_asc">{t("sortNameAsc")}</option>
          <option value="name_desc">{t("sortNameDesc")}</option>
          <option value="role">{t("sortRole")}</option>
          <option value="status">{t("sortStatus")}</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg bg-card">
          {agents.length === 0 ? t("empty") : t("noResults")}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
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
                {agent.manager && <span className="text-[10px] text-muted-foreground">{t("manager")}: {agent.manager.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <MtmAgentForm open={formOpen} onOpenChange={setFormOpen} onSaved={fetchAgents} initialData={editData} orgId={orgId ? String(orgId) : undefined} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} title={t("delete")} itemName={deleteItem?.name} />
    </div>
  )
}
