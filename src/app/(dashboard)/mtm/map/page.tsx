"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"
import { calculateDistance } from "@/lib/geo-utils"
import type { RouteStop } from "@/components/mtm/live-map"
import {
  MapPin, RefreshCw, Clock, WifiOff, Navigation,
  Radio, AlertTriangle, Play, Eye, EyeOff, Circle, Flame,
} from "lucide-react"

const MtmLiveMap = dynamic(() => import("@/components/mtm/live-map"), { ssr: false })

interface AgentLocation {
  agentId: string
  name: string
  isOnline: boolean
  fieldStatus: string
  routeCompletion: number
  latitude?: number
  longitude?: number
  speed?: number
  battery?: number
  recordedAt?: string
}

interface LiveEvent {
  id: string
  type: string
  agent: string
  customer: string
  time: string
}

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  CHECKED_IN: { label: "Check-in", dotClass: "bg-green-500" },
  ON_ROAD: { label: "On Road", dotClass: "bg-blue-500" },
  LATE: { label: "Late", dotClass: "bg-red-500" },
  OFFLINE: { label: "Offline", dotClass: "bg-muted-foreground/50" },
}

export default function MtmMapPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [agents, setAgents] = useState<AgentLocation[]>([])
  const [statusCounts, setStatusCounts] = useState({ total: 0, checkedIn: 0, onRoad: 0, late: 0, offline: 0 })
  const [liveFeed, setLiveFeed] = useState<LiveEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFeed, setShowFeed] = useState(true)
  const [replayAgent, setReplayAgent] = useState<string | null>(null)
  const [replayTrack, setReplayTrack] = useState<any[]>([])
  const [showGeofence, setShowGeofence] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [agentRoute, setAgentRoute] = useState<any>(null)
  const selectedAgentRef = useRef<string | null>(null)
  const orgId = session?.user?.organizationId

  // Keep ref in sync for polling closure
  useEffect(() => { selectedAgentRef.current = selectedAgent }, [selectedAgent])

  const fetchLocations = useCallback(() => {
    fetch("/api/v1/mtm/locations", {
      headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) {
          setAgents(r.data.agentLocations || [])
          setStatusCounts(r.data.statusCounts || { total: 0, checkedIn: 0, onRoad: 0, late: 0, offline: 0 })
          setLiveFeed(r.data.liveFeed || [])
          setLastUpdate(new Date())
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        // Refresh selected agent's route silently
        if (selectedAgentRef.current) fetchAgentRoute(selectedAgentRef.current)
      })
  }, [orgId, fetchAgentRoute])

  useEffect(() => {
    fetchLocations()
    const interval = setInterval(fetchLocations, 15000)
    return () => clearInterval(interval)
  }, [fetchLocations])

  const fetchAgentRoute = useCallback(async (agentId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const res = await fetch(`/api/v1/mtm/routes?agentId=${agentId}&date=${today}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const r = await res.json()
      if (r.success && r.data?.routes?.length > 0) {
        setAgentRoute(r.data.routes[0])
      } else {
        setAgentRoute(null)
      }
    } catch { setAgentRoute(null) }
  }, [orgId])

  const handleAgentClick = (agentId: string) => {
    if (selectedAgent === agentId) {
      // Deselect
      setSelectedAgent(null)
      setAgentRoute(null)
      setReplayAgent(null)
      setReplayTrack([])
    } else {
      setSelectedAgent(agentId)
      fetchAgentRoute(agentId)
      handleReplay(agentId)
    }
  }

  const handleReplay = async (agentId: string) => {
    try {
      const res = await fetch(`/api/v1/mtm/locations?agentId=${agentId}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const r = await res.json()
      if (r.success) {
        setReplayAgent(agentId)
        setReplayTrack(r.data.locations || [])
      }
    } catch {}
  }

  const filteredAgents = agents.filter(a => {
    if (activeFilter === "all") return true
    if (activeFilter === "checked_in") return a.fieldStatus === "CHECKED_IN"
    if (activeFilter === "on_road") return a.fieldStatus === "ON_ROAD"
    if (activeFilter === "late") return a.fieldStatus === "LATE"
    if (activeFilter === "offline") return a.fieldStatus === "OFFLINE"
    return true
  })

  const mapAgents = filteredAgents.filter(a => a.latitude && a.longitude)

  // Transform route points to RouteStop[] for the map
  const routeStops: RouteStop[] = useMemo(() => {
    if (!agentRoute?.points) return []
    const points = [...agentRoute.points].sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    const firstPendingIdx = points.findIndex((p: any) => p.status === "PENDING")
    return points
      .filter((p: any) => p.customer?.latitude != null && p.customer?.longitude != null)
      .map((p: any, _: number, arr: any[]) => ({
        orderIndex: p.orderIndex,
        status: p.status === "VISITED" ? "VISITED" as const :
                p.status === "SKIPPED" ? "SKIPPED" as const :
                p.orderIndex === firstPendingIdx ? "NEXT" as const : "PENDING" as const,
        latitude: p.customer.latitude,
        longitude: p.customer.longitude,
        name: p.customer.name,
        address: p.customer.address,
        visitedAt: p.visitedAt,
      }))
  }, [agentRoute])

  // ETA calculation: distance to next stop / speed
  const etaSeconds = useMemo(() => {
    if (!selectedAgent || !routeStops.length) return null
    const nextStop = routeStops.find(s => s.status === "NEXT")
    if (!nextStop) return null
    const agent = agents.find(a => a.agentId === selectedAgent)
    if (!agent?.latitude || !agent?.longitude) return null
    const distMeters = calculateDistance(agent.latitude, agent.longitude, nextStop.latitude, nextStop.longitude)
    const speedKmh = (agent.speed && agent.speed > 2) ? agent.speed : 30 // fallback 30 km/h
    return Math.round((distMeters / 1000) / speedKmh * 3600)
  }, [selectedAgent, routeStops, agents])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageDescription icon={MapPin} title={t("mtmMap")} description="Real-time GPS tracking of field agents" />
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button variant={showGeofence ? "default" : "outline"} size="sm" onClick={() => setShowGeofence(!showGeofence)}>
            <Circle className="h-3.5 w-3.5 mr-1" /> Geofence
          </Button>
          <Button variant={showHeatmap ? "default" : "outline"} size="sm" onClick={() => setShowHeatmap(!showHeatmap)}>
            <Flame className="h-3.5 w-3.5 mr-1" /> Heatmap
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLocations}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        <Button variant={activeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("all")}>
          All ({statusCounts.total})
        </Button>
        <Button variant={activeFilter === "checked_in" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("checked_in")}
          className={activeFilter === "checked_in" ? "" : "text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/20"}>
          <MapPin className="h-3 w-3 mr-1" /> Check-in ({statusCounts.checkedIn})
        </Button>
        <Button variant={activeFilter === "on_road" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("on_road")}
          className={activeFilter === "on_road" ? "" : "text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/20"}>
          <Navigation className="h-3 w-3 mr-1" /> On Road ({statusCounts.onRoad})
        </Button>
        <Button variant={activeFilter === "late" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("late")}
          className={activeFilter === "late" ? "" : "text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20"}>
          <AlertTriangle className="h-3 w-3 mr-1" /> Late ({statusCounts.late})
        </Button>
        <Button variant={activeFilter === "offline" ? "default" : "outline"} size="sm" onClick={() => setActiveFilter("offline")}
          className={activeFilter === "offline" ? "" : "text-muted-foreground"}>
          <WifiOff className="h-3 w-3 mr-1" /> Offline ({statusCounts.offline})
        </Button>
      </div>

      {/* Main: Map + Right sidebar */}
      <div className="flex gap-3" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
        {/* Map */}
        <div className="flex-1 rounded-lg border bg-card overflow-hidden relative" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading map...</div>
          ) : (
            <MtmLiveMap
              agents={mapAgents}
              replayTrack={replayAgent ? replayTrack : []}
              showGeofence={showGeofence}
              plannedRoute={routeStops}
              focusAgentId={selectedAgent}
              etaSeconds={etaSeconds}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[280px] flex-shrink-0 space-y-3 overflow-y-auto">
          {/* STATUS block */}
          <div className="rounded-lg border bg-card p-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</h4>
            <div className="space-y-2">
              {(["CHECKED_IN", "ON_ROAD", "LATE", "OFFLINE"] as const).map(status => {
                const cfg = statusConfig[status]
                const count = status === "CHECKED_IN" ? statusCounts.checkedIn : status === "ON_ROAD" ? statusCounts.onRoad : status === "LATE" ? statusCounts.late : statusCounts.offline
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                      <span className="text-xs">{cfg.label}</span>
                    </div>
                    <span className="text-sm font-bold">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Live Feed */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">Live Feed</h4>
                <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <Radio className="h-2 w-2 animate-pulse" /> LIVE
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowFeed(!showFeed)}>
                {showFeed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            {showFeed && (
              liveFeed.length > 0 ? (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {liveFeed.map(evt => (
                    <div key={evt.id} className="text-[10px] flex items-start gap-1.5">
                      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${evt.type === "CHECK_IN" ? "bg-green-500" : evt.type === "LOCATION" ? "bg-blue-400" : "bg-blue-500"}`} />
                      <div>
                        <span className="font-medium">{evt.agent}</span>
                        {evt.type === "LOCATION" ? (
                          <span className="text-muted-foreground"> 📍 GPS ping</span>
                        ) : (
                          <span className="text-muted-foreground"> → {evt.customer}</span>
                        )}
                        <div className="text-muted-foreground">{new Date(evt.time).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground py-2 text-center">Waiting for events...</div>
              )
            )}
          </div>

          {/* Agent list */}
          <div className="rounded-lg border bg-card p-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Agents ({filteredAgents.length})</h4>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredAgents.length === 0 ? (
                <div className="text-[10px] text-muted-foreground py-4 text-center">No agents match filter</div>
              ) : (
                filteredAgents.map(agent => {
                  const cfg = statusConfig[agent.fieldStatus] || statusConfig.OFFLINE
                  const isOnline = agent.fieldStatus !== "OFFLINE"
                  const avatarBg = isOnline ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                  const isSelected = selectedAgent === agent.agentId
                  return (
                    <div key={agent.agentId} className={`flex items-center gap-2 rounded-lg p-1 cursor-pointer transition-colors ${isSelected ? "bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200 dark:ring-blue-800" : "hover:bg-muted/50"}`} onClick={() => handleAgentClick(agent.agentId)}>
                      <div className="relative flex-shrink-0">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold ${avatarBg}`}>
                          {agent.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">
                          {agent.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span className={`inline-flex items-center gap-0.5 ${isOnline ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                            {cfg.label}
                          </span>
                          {agent.speed != null && agent.speed > 0 && <span className="text-muted-foreground">{agent.speed.toFixed(0)} km/h</span>}
                          {agent.routeCompletion > 0 && <span className="text-muted-foreground"><Navigation className="h-2 w-2 inline" /> {agent.routeCompletion}%</span>}
                          {isSelected && etaSeconds != null && etaSeconds > 0 && (
                            <span className="text-blue-600 font-medium">ETA {etaSeconds < 60 ? "<1m" : etaSeconds < 3600 ? `${Math.round(etaSeconds / 60)}m` : `${(etaSeconds / 3600).toFixed(1)}h`}</span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleAgentClick(agent.agentId) }} title="Show route">
                        <Play className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Replay indicator */}
      {replayAgent && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs">
          <Play className="h-3 w-3" />
          Replay mode — {agents.find(a => a.agentId === replayAgent)?.name} ({replayTrack.length} points)
          <Button variant="ghost" size="sm" className="h-5 text-[10px] ml-auto" onClick={() => { setReplayAgent(null); setReplayTrack([]) }}>Close</Button>
        </div>
      )}
    </div>
  )
}
