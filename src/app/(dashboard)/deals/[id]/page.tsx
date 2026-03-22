"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Pencil, Trash2, Building2, User, Calendar, DollarSign,
  Clock, TrendingUp, Target, Users, Swords, MessageSquare,
  CheckCircle2, AlertCircle, Tag, Plus, X
} from "lucide-react"
import { DealForm } from "@/components/deal-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"

const STAGES = [
  { key: "LEAD",        label: "Lead",        color: "#6366f1", bg: "bg-indigo-500" },
  { key: "QUALIFIED",   label: "Qualified",   color: "#3b82f6", bg: "bg-blue-500" },
  { key: "PROPOSAL",    label: "Proposal",    color: "#f59e0b", bg: "bg-amber-500" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#f97316", bg: "bg-orange-500" },
  { key: "WON",         label: "Won",         color: "#22c55e", bg: "bg-green-500" },
  { key: "LOST",        label: "Lost",        color: "#ef4444", bg: "bg-red-500" },
]

interface TeamMember {
  id: string
  userId: string
  role: string
  user: { id: string; name: string | null; email: string; avatar: string | null; role: string | null }
}

interface Deal {
  id: string
  name: string
  stage: string
  valueAmount: number
  currency: string
  probability: number
  assignedTo: string | null
  notes: string | null
  expectedClose: string | null
  createdAt: string
  updatedAt: string
  lostReason: string | null
  tags: string[]
  company: { id: string; name: string } | null
  campaign: { id: string; name: string } | null
  teamMembers: TeamMember[]
}

function DealPipelineStages({ currentStage }: { currentStage: string }) {
  const isLost = currentStage === "LOST"
  const activeStages = isLost ? STAGES : STAGES.filter(s => s.key !== "LOST")
  const currentIdx = activeStages.findIndex(s => s.key === currentStage)

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {activeStages.map((stage, idx) => {
        const isActive = stage.key === currentStage
        const isDone = !isLost && idx < currentIdx
        const isUpcoming = !isActive && !isDone

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            {/* Chevron segment */}
            <div
              className={`
                relative flex items-center justify-center h-9 flex-1 min-w-0 px-3
                text-xs font-semibold transition-all select-none
                ${isActive
                  ? "text-white shadow-sm"
                  : isDone
                  ? "text-white/90"
                  : "text-muted-foreground bg-muted/60 dark:bg-muted/30"
                }
              `}
              style={{
                background: isActive
                  ? stage.color
                  : isDone
                  ? stage.color + "99"
                  : undefined,
                clipPath: idx === 0
                  ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)"
                  : idx === activeStages.length - 1
                  ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)"
                  : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)",
              }}
            >
              <span className="truncate">{stage.label}</span>
              {isDone && <CheckCircle2 className="h-3 w-3 ml-1 flex-shrink-0 opacity-70" />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DealKpiCards({ deal }: { deal: Deal }) {
  const daysInFunnel = Math.floor(
    (Date.now() - new Date(deal.createdAt).getTime()) / 86400000
  )

  const cards = [
    {
      label: "Days in funnel",
      value: daysInFunnel,
      bg: "bg-blue-500",
      text: "text-white",
      icon: <Clock className="h-4 w-4 opacity-80" />,
    },
    {
      label: "Deal value",
      value: `${deal.valueAmount.toLocaleString()} ${deal.currency}`,
      bg: "bg-indigo-500",
      text: "text-white",
      icon: <DollarSign className="h-4 w-4 opacity-80" />,
    },
    {
      label: "Win probability",
      value: `${deal.probability}%`,
      bg: deal.probability >= 70 ? "bg-green-500" : deal.probability >= 40 ? "bg-amber-500" : "bg-orange-500",
      text: "text-white",
      icon: <TrendingUp className="h-4 w-4 opacity-80" />,
    },
    {
      label: "Stage",
      value: STAGES.find(s => s.key === deal.stage)?.label ?? deal.stage,
      bg: "bg-violet-500",
      text: "text-white",
      icon: <Target className="h-4 w-4 opacity-80" />,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} ${card.text} rounded-xl p-4 flex flex-col gap-1 shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium opacity-80">{card.label}</span>
            {card.icon}
          </div>
          <span className="text-2xl font-bold leading-tight">{card.value}</span>
        </div>
      ))}
    </div>
  )
}

function ProbabilityBar({ probability }: { probability: number }) {
  const color =
    probability >= 70 ? "bg-green-500" :
    probability >= 40 ? "bg-amber-500" : "bg-red-400"

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground font-medium">Win probability</span>
        <span className="font-semibold">{probability}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${probability}%` }}
        />
      </div>
    </div>
  )
}

function CompetitorsSection({ dealId, orgId }: { dealId: string; orgId?: string }) {
  const [competitors, setCompetitors] = useState<Array<{
    id: string; name: string; product: string; strengths: string; weaknesses: string
  }>>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: "", product: "", strengths: "", weaknesses: "" })

  const addCompetitor = () => {
    if (!form.name) return
    setCompetitors(prev => [...prev, { id: Date.now().toString(), ...form }])
    setForm({ name: "", product: "", strengths: "", weaknesses: "" })
    setAdding(false)
  }

  if (competitors.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted rounded-xl">
        <Swords className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No competitors tracked yet</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add competitor
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left p-3 font-medium text-muted-foreground">Competitor</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Product</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Strengths</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Weaknesses</th>
              <th className="p-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {competitors.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground">{c.product || "—"}</td>
                <td className="p-3">
                  {c.strengths ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {c.strengths}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-3">
                  {c.weaknesses ? (
                    <span className="inline-flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="h-3.5 w-3.5" /> {c.weaknesses}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => setCompetitors(prev => prev.filter(x => x.id !== c.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Competitor name *</label>
              <input
                className="w-full h-8 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Salesforce"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Their product</label>
              <input
                className="w-full h-8 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Sales Cloud"
                value={form.product}
                onChange={e => setForm({ ...form, product: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Their strengths</label>
              <input
                className="w-full h-8 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. Brand recognition"
                value={form.strengths}
                onChange={e => setForm({ ...form, strengths: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Their weaknesses</label>
              <input
                className="w-full h-8 border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="e.g. High price"
                value={form.weaknesses}
                onChange={e => setForm({ ...form, weaknesses: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addCompetitor} disabled={!form.name}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add competitor
        </Button>
      )}
    </div>
  )
}

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("")
  const TAG_COLORS = ["bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-700"]

  const addTag = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInput("")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${TAG_COLORS[i % TAG_COLORS.length]}`}
        >
          {tag}
          <button onClick={() => onChange(tags.filter(t => t !== tag))} className="hover:opacity-70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-1">
        <input
          className="h-6 w-24 border rounded-full px-2.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="+ Add tag"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
          onBlur={addTag}
        />
      </div>
    </div>
  )
}

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId ? String(session.user.organizationId) : undefined

  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [orgUsers, setOrgUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  const [addingMember, setAddingMember] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedRole, setSelectedRole] = useState("member")

  const fetchDeal = async () => {
    try {
      const res = await fetch(`/api/v1/deals/${id}`, {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      const json = await res.json()
      if (json.success) setDeal(json.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const fetchOrgUsers = async () => {
    try {
      const res = await fetch("/api/v1/users", {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      const json = await res.json()
      if (json.success) setOrgUsers(json.data || [])
    } catch {}
  }

  useEffect(() => { if (session) { fetchDeal(); fetchOrgUsers() } }, [session, id])

  const saveTags = async (newTags: string[]) => {
    if (!deal) return
    try {
      await fetch(`/api/v1/deals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify({ tags: newTags }),
      })
      setDeal({ ...deal, tags: newTags })
    } catch {}
  }

  const addTeamMember = async () => {
    if (!selectedUserId) return
    try {
      const res = await fetch(`/api/v1/deals/${id}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      })
      if (res.ok) {
        fetchDeal()
        setAddingMember(false)
        setSelectedUserId("")
        setSelectedRole("member")
      }
    } catch {}
  }

  const removeTeamMember = async (userId: string) => {
    try {
      await fetch(`/api/v1/deals/${id}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {}) },
        body: JSON.stringify({ userId }),
      })
      fetchDeal()
    } catch {}
  }

  const handleDelete = async () => {
    const res = await fetch(`/api/v1/deals/${id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": orgId } : {},
    })
    if (res.ok) router.push("/deals")
    else throw new Error("Failed to delete")
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 bg-muted rounded-xl" />
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">Deal not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/deals")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Deals
        </Button>
      </div>
    )
  }

  const stageInfo = STAGES.find(s => s.key === deal.stage)

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/deals")} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight truncate">{deal.name}</h1>
            <Badge
              className="text-white font-medium"
              style={{ backgroundColor: stageInfo?.color }}
            >
              {stageInfo?.label ?? deal.stage}
            </Badge>
          </div>
          {deal.company && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3.5 w-3.5" /> {deal.company.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-500 hover:text-red-600 hover:border-red-300"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* ── Tags ── */}
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <TagsInput tags={deal.tags || []} onChange={saveTags} />
      </div>

      {/* ── Pipeline stages ── */}
      <DealPipelineStages currentStage={deal.stage} />

      {/* ── KPI Cards ── */}
      <DealKpiCards deal={deal} />

      {/* ── Win probability bar ── */}
      <Card className="border-none shadow-sm bg-card">
        <CardContent className="pt-5 pb-5">
          <ProbabilityBar probability={deal.probability} />
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 h-auto">
          <TabsTrigger value="overview" className="rounded-md text-sm">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-md text-sm">Activity</TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-md text-sm">Competitors</TabsTrigger>
          <TabsTrigger value="team" className="rounded-md text-sm">Team</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Deal info */}
            <Card className="shadow-sm border-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: <DollarSign className="h-4 w-4 text-muted-foreground" />, label: "Value", value: `${deal.valueAmount.toLocaleString()} ${deal.currency}` },
                  { icon: <User className="h-4 w-4 text-muted-foreground" />, label: "Assigned to", value: deal.assignedTo || "Unassigned" },
                  { icon: <Calendar className="h-4 w-4 text-muted-foreground" />, label: "Expected close", value: deal.expectedClose ? new Date(deal.expectedClose).toLocaleDateString("ru-RU") : "—" },
                  { icon: <Clock className="h-4 w-4 text-muted-foreground" />, label: "Created", value: new Date(deal.createdAt).toLocaleDateString("ru-RU") },
                  { icon: <Building2 className="h-4 w-4 text-muted-foreground" />, label: "Company", value: deal.company?.name || "—" },
                  { icon: <Target className="h-4 w-4 text-muted-foreground" />, label: "Campaign", value: deal.campaign?.name || "—" },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    {icon}
                    <span className="text-sm text-muted-foreground w-28 flex-shrink-0">{label}</span>
                    <span className="text-sm font-medium truncate">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="shadow-sm border-none bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deal.notes ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{deal.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
                )}
                {deal.lostReason && (
                  <>
                    <hr className="my-3 border-border" />
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-red-500 mb-0.5">Lost reason</p>
                        <p className="text-sm">{deal.lostReason}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card className="shadow-sm border-none bg-card">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Activity timeline</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Emails, calls, and notes will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competitors */}
        <TabsContent value="competitors">
          <Card className="shadow-sm border-none bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Swords className="h-4 w-4 text-muted-foreground" /> Competitor Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CompetitorsSection dealId={deal.id} orgId={orgId} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          <Card className="shadow-sm border-none bg-card">
            <CardContent className="pt-6 space-y-4">
              {(deal.teamMembers || []).length > 0 ? (
                <div className="space-y-2">
                  {deal.teamMembers.map(member => {
                    const ROLE_COLORS: Record<string, string> = {
                      owner: "bg-amber-100 text-amber-700",
                      member: "bg-blue-100 text-blue-700",
                      support: "bg-green-100 text-green-700",
                    }
                    return (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {(member.user.name || member.user.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.user.name || member.user.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                        </div>
                        <Badge className={`text-xs ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
                          {member.role}
                        </Badge>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => removeTeamMember(member.userId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : !addingMember ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Add team members working on this deal</p>
                </div>
              ) : null}

              {addingMember ? (
                <div className="p-4 bg-muted/40 rounded-xl border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">User</label>
                      <select
                        className="w-full h-9 border rounded-lg px-3 text-sm bg-background"
                        value={selectedUserId}
                        onChange={e => setSelectedUserId(e.target.value)}
                      >
                        <option value="">Select user...</option>
                        {orgUsers
                          .filter(u => !deal.teamMembers?.some(m => m.userId === u.id))
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
                      <select
                        className="w-full h-9 border rounded-lg px-3 text-sm bg-background"
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value)}
                      >
                        <option value="owner">Owner</option>
                        <option value="member">Member</option>
                        <option value="support">Support</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addTeamMember} disabled={!selectedUserId}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingMember(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAddingMember(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add member
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modals ── */}
      <DealForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchDeal}
        initialData={{
          id: deal.id,
          name: deal.name,
          companyId: deal.company?.id,
          stage: deal.stage,
          valueAmount: deal.valueAmount,
          currency: deal.currency,
          probability: deal.probability,
          expectedClose: deal.expectedClose,
          notes: deal.notes,
        }}
        orgId={orgId}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Delete Deal"
        itemName={deal.name}
      />
    </div>
  )
}
