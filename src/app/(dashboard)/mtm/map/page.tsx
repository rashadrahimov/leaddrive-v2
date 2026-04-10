"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { ColorStatCard } from "@/components/color-stat-card"
import { Button } from "@/components/ui/button"
import { MapPin, Wifi, WifiOff, Clock, RefreshCw } from "lucide-react"
import dynamic from "next/dynamic"

const MtmLiveMap = dynamic(() => import("@/components/mtm/live-map"), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-muted-foreground">Loading map...</div>,
})

interface AgentLocation {
  agentId: string
  name: string
  isOnline: boolean
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  battery?: number
  recordedAt: string
}

export default function MtmMapPage() {
  const { data: session } = useSession()
  const t = useTranslations("nav")
  const [agents, setAgents] = useState<AgentLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const orgId = session?.user?.organizationId

  const fetchLocations = () => {
    fetch("/api/v1/mtm/locations", {
      headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) {
          setAgents(r.data?.agentLocations || [])
          setLastUpdate(new Date())
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (session) {
      fetchLocations()
      const interval = setInterval(fetchLocations, 15000)
      return () => clearInterval(interval)
    }
  }, [session])

  const onlineCount = agents.filter((a) => a.isOnline).length
  const offlineCount = agents.filter((a) => !a.isOnline).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageDescription
          icon={MapPin}
          title={t("mtmMap")}
          description="Real-time GPS tracking of field agents"
        />
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchLocations}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" size="sm">All ({agents.length})</Button>
        <Button variant="outline" size="sm">
          <Wifi className="h-3 w-3 mr-1 text-green-500" /> Online ({onlineCount})
        </Button>
        <Button variant="outline" size="sm">
          <WifiOff className="h-3 w-3 mr-1 text-muted-foreground" /> Offline ({offlineCount})
        </Button>
      </div>

      {/* Map container */}
      <div className="rounded-lg border bg-card overflow-hidden" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
        <MtmLiveMap agents={agents} />
      </div>

      {/* Agent list below map */}
      {agents.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => (
            <div key={agent.agentId} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                {agent.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${agent.isOnline ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                  {agent.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {agent.speed != null ? `${agent.speed.toFixed(0)} km/h` : "—"}
                  {agent.battery != null ? ` · ${agent.battery}%` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
