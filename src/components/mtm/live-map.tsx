"use client"

import { useEffect } from "react"
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps"
import { useState, useCallback, useMemo } from "react"

// ── Types ────────────────────────────────────────────────────────────────────

export interface RouteStop {
  orderIndex: number
  status: "VISITED" | "SKIPPED" | "NEXT" | "PENDING"
  latitude: number
  longitude: number
  name: string
  address?: string
  visitedAt?: string
}

interface AgentLocation {
  agentId: string
  name: string
  isOnline: boolean
  fieldStatus?: string
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  battery?: number
  recordedAt: string
}

interface Props {
  agents: AgentLocation[]
  replayTrack?: Array<{ latitude: number; longitude: number; recordedAt: string }>
  showGeofence?: boolean
  geofenceRadius?: number
  plannedRoute?: RouteStop[]
  focusAgentId?: string | null
  etaSeconds?: number | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  CHECKED_IN: "#22c55e",
  ON_ROAD:    "#3b82f6",
  LATE:       "#ef4444",
  OFFLINE:    "#94a3b8",
}

const statusLabels: Record<string, string> = {
  CHECKED_IN: "Checked In",
  ON_ROAD:    "On Road",
  LATE:       "Late",
  OFFLINE:    "Offline",
}

const routeStopColors: Record<string, string> = {
  VISITED: "#22c55e",
  SKIPPED: "#ef4444",
  NEXT:    "#6C63FF",
  PENDING: "#94a3b8",
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FitBounds({ agents, plannedRoute }: { agents: AgentLocation[], plannedRoute: RouteStop[] }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const points = [
      ...agents.map(a => ({ lat: a.latitude, lng: a.longitude })),
      ...plannedRoute.map(s => ({ lat: s.latitude, lng: s.longitude })),
    ]
    if (points.length < 2) return
    const bounds = new window.google.maps.LatLngBounds()
    points.forEach(p => bounds.extend(p))
    map.fitBounds(bounds, 80)
  }, [map, agents, plannedRoute])
  return null
}

function FocusAgent({ agents, focusAgentId }: { agents: AgentLocation[], focusAgentId: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !focusAgentId) return
    const agent = agents.find(a => a.agentId === focusAgentId)
    if (agent) {
      map.panTo({ lat: agent.latitude, lng: agent.longitude })
      map.setZoom(15)
    }
  }, [map, focusAgentId, agents])
  return null
}

function RoutePolyline({ plannedRoute }: { plannedRoute: RouteStop[] }) {
  const map = useMap()
  useEffect(() => {
    if (!map || plannedRoute.length < 2) return
    const path = plannedRoute
      .filter(s => s.status === "NEXT" || s.status === "PENDING")
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(s => ({ lat: s.latitude, lng: s.longitude }))
    if (path.length < 2) return
    const polyline = new window.google.maps.Polyline({
      path,
      strokeColor: "#6C63FF",
      strokeWeight: 2,
      strokeOpacity: 0.5,
      geodesic: true,
      map,
    })
    return () => polyline.setMap(null)
  }, [map, plannedRoute])
  return null
}

function ReplayPolyline({ replayTrack }: { replayTrack: Array<{ latitude: number; longitude: number }> }) {
  const map = useMap()
  useEffect(() => {
    if (!map || replayTrack.length < 2) return
    const path = replayTrack.map(p => ({ lat: p.latitude, lng: p.longitude }))
    const polyline = new window.google.maps.Polyline({
      path,
      strokeColor: "#f59e0b",
      strokeWeight: 3,
      strokeOpacity: 0.8,
      geodesic: true,
      map,
    })
    return () => polyline.setMap(null)
  }, [map, replayTrack])
  return null
}

function GeofenceCircles({ agents, geofenceRadius }: { agents: AgentLocation[], geofenceRadius: number }) {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    const circles = agents.map(agent => new window.google.maps.Circle({
      center: { lat: agent.latitude, lng: agent.longitude },
      radius: geofenceRadius,
      strokeColor: statusColors[agent.fieldStatus || "OFFLINE"],
      strokeOpacity: 0.6,
      strokeWeight: 1.5,
      fillColor: statusColors[agent.fieldStatus || "OFFLINE"],
      fillOpacity: 0.08,
      map,
    }))
    return () => circles.forEach(c => c.setMap(null))
  }, [map, agents, geofenceRadius])
  return null
}

// ── Main Component ───────────────────────────────────────────────────────────

function MapContent({
  agents, replayTrack, showGeofence, geofenceRadius,
  plannedRoute, focusAgentId, etaSeconds,
}: Required<Props>) {
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null)

  return (
    <>
      <FitBounds agents={agents} plannedRoute={plannedRoute} />
      <FocusAgent agents={agents} focusAgentId={focusAgentId} />
      <RoutePolyline plannedRoute={plannedRoute} />
      <ReplayPolyline replayTrack={replayTrack} />
      {showGeofence && <GeofenceCircles agents={agents} geofenceRadius={geofenceRadius} />}

      {/* Route stop markers */}
      {plannedRoute.map(stop => (
        <AdvancedMarker
          key={`stop-${stop.orderIndex}`}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          zIndex={1}
          title={stop.name}
        >
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: routeStopColors[stop.status],
            border: "2px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "white",
            opacity: stop.status === "VISITED" ? 0.5 : 1,
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          }}>
            {stop.orderIndex + 1}
          </div>
        </AdvancedMarker>
      ))}

      {/* Agent markers */}
      {agents.map(agent => {
        const color = statusColors[agent.fieldStatus || (agent.isOnline ? "ON_ROAD" : "OFFLINE")]
        const isFocused = agent.agentId === focusAgentId
        return (
          <AdvancedMarker
            key={agent.agentId}
            position={{ lat: agent.latitude, lng: agent.longitude }}
            zIndex={isFocused ? 10 : 5}
            title={agent.name}
            onClick={() => setSelectedAgent(selectedAgent?.agentId === agent.agentId ? null : agent)}
          >
            <div style={{
              width: isFocused ? 38 : 32, height: isFocused ? 38 : 32,
              borderRadius: "50%",
              background: color,
              border: `${isFocused ? 3.5 : 2.5}px solid white`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "white",
              boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
              cursor: "pointer",
              transition: "all 0.2s",
            }}>
              {agent.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </AdvancedMarker>
        )
      })}

      {/* InfoWindow */}
      {selectedAgent && (
        <InfoWindow
          position={{ lat: selectedAgent.latitude, lng: selectedAgent.longitude }}
          onCloseClick={() => setSelectedAgent(null)}
          pixelOffset={[0, -20]}
        >
          <div style={{ fontFamily: "system-ui,sans-serif", minWidth: 160, padding: "4px 2px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#0B0B1E" }}>
              {selectedAgent.name}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
              {statusLabels[selectedAgent.fieldStatus || "OFFLINE"]}
              {selectedAgent.speed && selectedAgent.speed > 0 ? ` · ${selectedAgent.speed.toFixed(1)} km/h` : ""}
              {selectedAgent.battery ? ` · 🔋${selectedAgent.battery}%` : ""}
            </div>
            {etaSeconds != null && selectedAgent.agentId === focusAgentId && (
              <div style={{ fontSize: 12, color: "#6C63FF", fontWeight: 600, marginBottom: 2 }}>
                ETA: {etaSeconds < 60 ? `${etaSeconds}s` : `${Math.round(etaSeconds / 60)} min`}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {new Date(selectedAgent.recordedAt).toLocaleTimeString()}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  )
}

export default function MtmLiveMap({
  agents,
  replayTrack = [],
  showGeofence = false,
  geofenceRadius = 100,
  plannedRoute = [],
  focusAgentId = null,
  etaSeconds = null,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

  const defaultCenter = useMemo(() => (
    agents.length > 0
      ? { lat: agents[0].latitude, lng: agents[0].longitude }
      : { lat: 40.4093, lng: 49.8671 }
  ), [agents])

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        style={{ position: "absolute", inset: 0 }}
        defaultCenter={defaultCenter}
        defaultZoom={12}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
        disableDefaultUI={false}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
      >
        <MapContent
          agents={agents}
          replayTrack={replayTrack}
          showGeofence={showGeofence}
          geofenceRadius={geofenceRadius}
          plannedRoute={plannedRoute}
          focusAgentId={focusAgentId}
          etaSeconds={etaSeconds}
        />
      </Map>
    </APIProvider>
  )
}
