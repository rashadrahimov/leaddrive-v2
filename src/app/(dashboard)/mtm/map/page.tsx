"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { PageDescription } from "@/components/page-description"
import { MapPin } from "lucide-react"
import dynamic from "next/dynamic"

const MtmLiveMap = dynamic(() => import("@/components/mtm/live-map"), { ssr: false })

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
  const t = useTranslations("nav")
  const [agents, setAgents] = useState<AgentLocation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLocations = () => {
    fetch("/api/v1/mtm/locations")
      .then((r) => r.json())
      .then((r) => { if (r.success) setAgents(r.data.agentLocations || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLocations()
    const interval = setInterval(fetchLocations, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <PageDescription
        icon={MapPin}
        title={t("mtmMap")}
        description="Real-time GPS tracking of field agents"
      />
      <div className="rounded-lg border bg-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">Loading map...</div>
        ) : (
          <MtmLiveMap agents={agents} />
        )}
      </div>
    </div>
  )
}
