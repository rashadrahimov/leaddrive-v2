"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { PageDescription } from "@/components/page-description"
import { Button } from "@/components/ui/button"
import { Trophy, Zap, Camera, Target, Heart, Star } from "lucide-react"

const achievementMeta: Record<string, { icon: any; label: string; description: string; color: string }> = {
  speed_master: { icon: Zap, label: "Speed Master", description: "Complete all routes on time", color: "text-amber-500" },
  photo_champion: { icon: Camera, label: "Photo Champion", description: "100+ quality photos uploaded", color: "text-teal-500" },
  consistent_success: { icon: Target, label: "Consistent Success", description: "10+ days with full reports", color: "text-red-500" },
  customer_friend: { icon: Heart, label: "Customer Friend", description: "95%+ customer satisfaction", color: "text-green-500" },
  perfect_week: { icon: Star, label: "Perfect Week", description: "0 delays in a week", color: "text-purple-500" },
}

export default function MtmLeaderboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"weekly" | "monthly" | "all">("monthly")
  const orgId = session?.user?.organizationId

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/v1/mtm/leaderboard?period=${period}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const r = await res.json()
      if (r.success) setData(r.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLeaderboard() }, [session, period])

  if (loading) return (
    <div className="space-y-6">
      <PageDescription icon={Trophy} title="Leaderboard" description="Agent performance ranking and achievements" />
      <div className="animate-pulse space-y-4">
        <div className="h-48 bg-muted rounded-lg" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    </div>
  )

  const rankings = data?.rankings || []
  const maxScore = Math.max(...rankings.map((r: any) => r.score), 1)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription icon={Trophy} title="Leaderboard" description="Agent performance ranking and achievements" />
        <div className="flex gap-1">
          {(["weekly", "monthly", "all"] as const).map(p => (
            <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
              {p === "weekly" ? "Weekly" : p === "monthly" ? "Monthly" : "All Time"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Rankings */}
        <div className="lg:col-span-2 rounded-lg border bg-card p-4">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Full Ranking
          </h3>
          {rankings.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No agents found</div>
          ) : (
            <div className="space-y-3">
              {rankings.map((agent: any) => (
                <div key={agent.agentId} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    agent.rank === 1 ? "bg-amber-100 text-amber-700" :
                    agent.rank === 2 ? "bg-slate-100 text-slate-600" :
                    agent.rank === 3 ? "bg-orange-100 text-orange-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {agent.rank}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                    {agent.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{agent.name}</div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${(agent.score / maxScore) * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span title="Visits">👁 {agent.visits}</span>
                    <span title="Tasks">✓ {agent.completedTasks}</span>
                    <span title="Photos">📷 {agent.approvedPhotos}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">{agent.score}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Achievements
            </h3>
            {rankings.length > 0 && rankings[0].achievements ? (
              <div className="space-y-3">
                {rankings[0].achievements.map((ach: any) => {
                  const meta = achievementMeta[ach.id]
                  if (!meta) return null
                  const Icon = meta.icon
                  const completed = ach.progress >= ach.total
                  return (
                    <div key={ach.id} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${completed ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-4 w-4 ${completed ? meta.color : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{meta.label}</div>
                        <div className="text-[10px] text-muted-foreground">{meta.description}</div>
                        <div className="w-full bg-muted rounded-full h-1 mt-1">
                          <div className={`h-1 rounded-full ${completed ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${Math.min((ach.progress / ach.total) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{ach.progress}/{ach.total}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Select an agent to view achievements</div>
            )}
          </div>

          {/* Top 3 */}
          {rankings.length >= 3 && (
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold text-sm mb-3">Top 3 Weekly Score</h3>
              <div className="space-y-2">
                {rankings.slice(0, 3).map((agent: any) => (
                  <div key={agent.agentId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${agent.rank === 1 ? "text-amber-500" : agent.rank === 2 ? "text-slate-400" : "text-orange-500"}`}>
                        #{agent.rank}
                      </span>
                      <span className="text-sm">{agent.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{agent.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
