"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle as LeafletCircle, useMap } from "react-leaflet"
import L from "leaflet"

// Force Leaflet to recalculate container size after mount and on resize
function InvalidateSize() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    const t3 = setTimeout(() => map.invalidateSize(), 800)

    const container = map.getContainer()
    const parent = container?.parentElement
    let observer: ResizeObserver | null = null
    if (parent && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        map.invalidateSize()
      })
      observer.observe(parent)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      observer?.disconnect()
    }
  }, [map])
  return null
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

// Multi-color markers based on field status
const statusColors: Record<string, string> = {
  CHECKED_IN: "#22c55e",  // green
  ON_ROAD: "#3b82f6",     // blue
  LATE: "#ef4444",         // red
  OFFLINE: "#94a3b8",      // gray
}

const createAgentIcon = (fieldStatus: string, initial?: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${statusColors[fieldStatus] || statusColors.OFFLINE};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px; font-weight: bold;
    ">${initial || ""}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

const statusLabels: Record<string, string> = {
  CHECKED_IN: "Checked In",
  ON_ROAD: "On Road",
  LATE: "Late",
  OFFLINE: "Offline",
}

interface Props {
  agents: AgentLocation[]
  replayTrack?: Array<{ latitude: number; longitude: number; recordedAt: string }>
  showGeofence?: boolean
  geofenceRadius?: number // meters, default 100
}

export default function MtmLiveMap({ agents, replayTrack = [], showGeofence = false, geofenceRadius = 100 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  // Wait for container to have real dimensions before rendering MapContainer
  // This prevents Leaflet from capturing wrong viewport size during initialization
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const check = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 100 && height > 100) {
        setReady(true)
      }
    }

    // Check immediately
    check()

    // Also observe for layout changes
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => check())
      observer.observe(el)
    }

    // Fallback timer
    const fallback = setTimeout(() => setReady(true), 500)

    return () => {
      observer?.disconnect()
      clearTimeout(fallback)
    }
  }, [])

  const defaultCenter: [number, number] = [40.4093, 49.8671]
  const center: [number, number] =
    agents.length > 0 ? [agents[0].latitude, agents[0].longitude] : defaultCenter

  // Replay track polyline
  const replayPositions: [number, number][] = replayTrack
    .filter(p => p.latitude && p.longitude)
    .map(p => [p.latitude, p.longitude])

  return (
    <div ref={containerRef} style={{ height: "100%", width: "100%", minHeight: 400 }}>
      {ready ? (
        <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
          <InvalidateSize />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Replay track line */}
          {replayPositions.length > 1 && (
            <Polyline positions={replayPositions} color="#f59e0b" weight={3} opacity={0.8} dashArray="6 4" />
          )}
          {/* Agent markers */}
          {agents.map((agent) => (
            <Marker
              key={agent.agentId}
              position={[agent.latitude, agent.longitude]}
              icon={createAgentIcon(agent.fieldStatus || (agent.isOnline ? "ON_ROAD" : "OFFLINE"), agent.name?.charAt(0)?.toUpperCase())}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {statusLabels[agent.fieldStatus || "OFFLINE"] || "Unknown"}
                    {agent.speed ? ` | ${agent.speed.toFixed(1)} km/h` : ""}
                    {agent.battery ? ` | ${agent.battery}%` : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Last update: {new Date(agent.recordedAt).toLocaleTimeString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {/* Geofence circles around each agent */}
          {showGeofence && agents.map((agent) => (
            <LeafletCircle
              key={`gf-${agent.agentId}`}
              center={[agent.latitude, agent.longitude]}
              radius={geofenceRadius}
              pathOptions={{ color: statusColors[agent.fieldStatus || "OFFLINE"], fillOpacity: 0.1, weight: 1, dashArray: "4 4" }}
            />
          ))}
        </MapContainer>
      ) : (
        <div style={{ height: "100%", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14 }}>
          Loading map...
        </div>
      )}
    </div>
  )
}
