"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet"
import L from "leaflet"

// Inject Leaflet CSS via CDN (standalone builds don't include node_modules CSS)
function useLeafletCSS() {
  useEffect(() => {
    if (document.getElementById("leaflet-css")) return
    const link = document.createElement("link")
    link.id = "leaflet-css"
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    link.crossOrigin = ""
    document.head.appendChild(link)
  }, [])
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
}

export default function MtmLiveMap({ agents, replayTrack = [] }: Props) {
  useLeafletCSS()

  const defaultCenter: [number, number] = [40.4093, 49.8671]
  const center: [number, number] =
    agents.length > 0 ? [agents[0].latitude, agents[0].longitude] : defaultCenter

  // Replay track polyline
  const replayPositions: [number, number][] = replayTrack
    .filter(p => p.latitude && p.longitude)
    .map(p => [p.latitude, p.longitude])

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
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
    </MapContainer>
  )
}
