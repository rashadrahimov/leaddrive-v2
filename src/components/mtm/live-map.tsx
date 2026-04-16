"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline, Circle } from "@react-google-maps/api"

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
  ON_ROAD: "#3b82f6",
  LATE: "#ef4444",
  OFFLINE: "#94a3b8",
}

const routeStopColors: Record<string, string> = {
  VISITED: "#22c55e",
  SKIPPED: "#ef4444",
  NEXT: "#6C63FF",
  PENDING: "#94a3b8",
}

const statusLabels: Record<string, string> = {
  CHECKED_IN: "Checked In",
  ON_ROAD: "On Road",
  LATE: "Late",
  OFFLINE: "Offline",
}

const mapContainerStyle = { width: "100%", height: "100%" }

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "simplified" }] },
  ],
}

// ── Component ────────────────────────────────────────────────────────────────

export default function MtmLiveMap({
  agents,
  replayTrack = [],
  showGeofence = false,
  geofenceRadius = 100,
  plannedRoute = [],
  focusAgentId = null,
  etaSeconds = null,
}: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    id: "google-map-script",
  })

  const mapRef = useRef<google.maps.Map | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentLocation | null>(null)

  // Pan to focused agent when focusAgentId changes
  useEffect(() => {
    if (!mapRef.current || !focusAgentId) return
    const agent = agents.find(a => a.agentId === focusAgentId)
    if (agent) {
      mapRef.current.panTo({ lat: agent.latitude, lng: agent.longitude })
      mapRef.current.setZoom(15)
    }
  }, [focusAgentId, agents])

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    // Fit bounds to show all agents
    const allPoints = [
      ...agents.map(a => ({ lat: a.latitude, lng: a.longitude })),
      ...plannedRoute.map(s => ({ lat: s.latitude, lng: s.longitude })),
    ]
    if (allPoints.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      allPoints.forEach(p => bounds.extend(p))
      map.fitBounds(bounds, 80)
    }
  }, [agents, plannedRoute])

  const onUnmount = useCallback(() => { mapRef.current = null }, [])

  const defaultCenter = useMemo(() => (
    agents.length > 0
      ? { lat: agents[0].latitude, lng: agents[0].longitude }
      : { lat: 40.4093, lng: 49.8671 } // Baku default
  ), [agents])

  const replayPath = useMemo(() =>
    replayTrack
      .filter(p => p.latitude && p.longitude)
      .map(p => ({ lat: p.latitude, lng: p.longitude })),
    [replayTrack]
  )

  // Planned route polyline (only pending/next stops)
  const routePath = useMemo(() =>
    plannedRoute
      .filter(s => s.status === "NEXT" || s.status === "PENDING")
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(s => ({ lat: s.latitude, lng: s.longitude })),
    [plannedRoute]
  )

  if (loadError) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 8 }}>
        <div style={{ fontSize: 32 }}>🗺️</div>
        <div style={{ fontSize: 14 }}>Failed to load Google Maps</div>
        <div style={{ fontSize: 12, color: "#ef4444" }}>{loadError.message}</div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 8 }}>
        <div style={{ fontSize: 32 }}>🗺️</div>
        <div style={{ fontSize: 14 }}>Loading Google Maps...</div>
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={12}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {/* Replay track polyline */}
      {replayPath.length > 1 && (
        <Polyline
          path={replayPath}
          options={{ strokeColor: "#f59e0b", strokeWeight: 3, strokeOpacity: 0.8, geodesic: true }}
        />
      )}

      {/* Planned route polyline */}
      {routePath.length > 1 && (
        <Polyline
          path={routePath}
          options={{ strokeColor: "#6C63FF", strokeWeight: 2, strokeOpacity: 0.5, geodesic: true }}
        />
      )}

      {/* Planned route stop markers */}
      {plannedRoute.map((stop) => (
        <Marker
          key={`stop-${stop.orderIndex}`}
          position={{ lat: stop.latitude, lng: stop.longitude }}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: routeStopColors[stop.status],
            fillOpacity: stop.status === "VISITED" ? 0.5 : 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 1.5,
            scale: 7,
          }}
          label={{
            text: String(stop.orderIndex + 1),
            color: "#ffffff",
            fontSize: "9px",
            fontWeight: "700",
          }}
          title={stop.name}
          zIndex={1}
        />
      ))}

      {/* Agent markers */}
      {agents.map((agent) => {
        const isFocused = agent.agentId === focusAgentId
        const color = statusColors[agent.fieldStatus || (agent.isOnline ? "ON_ROAD" : "OFFLINE")]
        return (
          <Marker
            key={agent.agentId}
            position={{ lat: agent.latitude, lng: agent.longitude }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: isFocused ? "#ffffff" : "#ffffff",
              strokeWeight: isFocused ? 3.5 : 2.5,
              scale: isFocused ? 17 : 14,
            }}
            label={{
              text: agent.name?.charAt(0)?.toUpperCase() || "?",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
            }}
            title={agent.name}
            zIndex={isFocused ? 10 : 5}
            onClick={() => setSelectedAgent(agent)}
          />
        )
      })}

      {/* InfoWindow for selected agent */}
      {selectedAgent && (
        <InfoWindow
          position={{ lat: selectedAgent.latitude, lng: selectedAgent.longitude }}
          onCloseClick={() => setSelectedAgent(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -18) }}
        >
          <div style={{ fontFamily: "system-ui, sans-serif", minWidth: 160, padding: "2px 0" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#0B0B1E" }}>{selectedAgent.name}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
              {statusLabels[selectedAgent.fieldStatus || "OFFLINE"] || "Unknown"}
              {selectedAgent.speed && selectedAgent.speed > 0 ? ` · ${selectedAgent.speed.toFixed(1)} km/h` : ""}
              {selectedAgent.battery ? ` · 🔋${selectedAgent.battery}%` : ""}
            </div>
            {etaSeconds != null && selectedAgent.agentId === focusAgentId && (
              <div style={{ fontSize: 12, color: "#6C63FF", fontWeight: 600, marginBottom: 2 }}>
                ETA next stop: {etaSeconds < 60 ? `${etaSeconds}s` : `${Math.round(etaSeconds / 60)} min`}
              </div>
            )}
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              Updated: {new Date(selectedAgent.recordedAt).toLocaleTimeString()}
            </div>
          </div>
        </InfoWindow>
      )}

      {/* Geofence circles around each agent */}
      {showGeofence && agents.map((agent) => (
        <Circle
          key={`gf-${agent.agentId}`}
          center={{ lat: agent.latitude, lng: agent.longitude }}
          radius={geofenceRadius}
          options={{
            strokeColor: statusColors[agent.fieldStatus || "OFFLINE"],
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            fillColor: statusColors[agent.fieldStatus || "OFFLINE"],
            fillOpacity: 0.08,
          }}
        />
      ))}
    </GoogleMap>
  )
}
