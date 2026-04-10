"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"

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

// Custom marker icon
const createAgentIcon = (isOnline: boolean, initial?: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${isOnline ? "#06b6d4" : "#94a3b8"};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px; font-weight: bold;
    ">${initial || ""}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

interface Props {
  agents: AgentLocation[]
}

export default function MtmLiveMap({ agents }: Props) {
  useLeafletCSS()

  // Default center: Baku, Azerbaijan
  const defaultCenter: [number, number] = [40.4093, 49.8671]
  const center: [number, number] =
    agents.length > 0 ? [agents[0].latitude, agents[0].longitude] : defaultCenter

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {agents.map((agent) => (
        <Marker
          key={agent.agentId}
          position={[agent.latitude, agent.longitude]}
          icon={createAgentIcon(agent.isOnline, agent.name?.charAt(0)?.toUpperCase())}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{agent.name}</div>
              <div className="text-xs text-muted-foreground">
                {agent.isOnline ? "Online" : "Offline"}
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
