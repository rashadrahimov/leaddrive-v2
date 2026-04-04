"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

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

// Custom marker icon
const createAgentIcon = (isOnline: boolean) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${isOnline ? "#06b6d4" : "#94a3b8"};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px; font-weight: bold;
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

interface Props {
  agents: AgentLocation[]
}

export default function MtmLiveMap({ agents }: Props) {
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
          icon={createAgentIcon(agent.isOnline)}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{agent.name}</div>
              <div className="text-xs text-gray-500">
                {agent.isOnline ? "Online" : "Offline"}
                {agent.speed ? ` | ${agent.speed.toFixed(1)} km/h` : ""}
                {agent.battery ? ` | ${agent.battery}%` : ""}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                Last update: {new Date(agent.recordedAt).toLocaleTimeString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
