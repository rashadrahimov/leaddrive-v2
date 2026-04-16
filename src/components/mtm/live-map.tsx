"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle as LeafletCircle, useMap } from "react-leaflet"
import L from "leaflet"

// --- Tile Provider Failover System ---
const GOOGLE_TILES = {
  url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  subdomains: "0123",
  attribution: "&copy; Google Maps",
}

const ERROR_THRESHOLD = 5
const ERROR_WINDOW_MS = 30_000 // 30 seconds

// SmartTileLayer — Google Maps tiles with limit detection
// Detects both tileerror events AND broken/empty tiles (503 returns tiny error image)
function SmartTileLayer({ onLimitReached }: { onLimitReached: (limited: boolean) => void }) {
  const map = useMap()
  const errorCountRef = useRef(0)
  const successCountRef = useRef(0)
  const windowStartRef = useRef(Date.now())

  useEffect(() => {
    const countError = () => {
      const now = Date.now()
      if (now - windowStartRef.current > ERROR_WINDOW_MS) {
        errorCountRef.current = 0
        successCountRef.current = 0
        windowStartRef.current = now
      }
      errorCountRef.current++
      if (errorCountRef.current >= ERROR_THRESHOLD) {
        onLimitReached(true)
      }
    }

    const onTileError = () => countError()

    // Check for broken tiles: 503 may return a tiny error image instead of real tile
    const onTileLoad = (e: any) => {
      const img = e.tile as HTMLImageElement | undefined
      if (img && img.naturalWidth > 0 && img.naturalWidth < 10) {
        // Google returns a tiny 1x1 or similar error image on 503
        countError()
      } else {
        successCountRef.current++
        // Only clear limit if we get enough real successes
        if (successCountRef.current >= 3) {
          errorCountRef.current = 0
          onLimitReached(false)
        }
      }
    }

    map.on("tileerror", onTileError)
    map.on("tileload", onTileLoad)
    return () => {
      map.off("tileerror", onTileError)
      map.off("tileload", onTileLoad)
    }
  }, [map, onLimitReached])

  return (
    <TileLayer
      attribution={GOOGLE_TILES.attribution}
      url={GOOGLE_TILES.url}
      subdomains={GOOGLE_TILES.subdomains}
      maxZoom={19}
      keepBuffer={4}
      // @ts-ignore — force Leaflet to fire tileerror on HTTP errors
      crossOrigin=""
    />
  )
}

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

export interface RouteStop {
  orderIndex: number
  status: "VISITED" | "PENDING" | "SKIPPED" | "NEXT"
  latitude: number
  longitude: number
  name: string
  address?: string
  visitedAt?: string
}

const stopColors: Record<string, string> = {
  VISITED: "#22c55e",
  NEXT: "#6C63FF",
  PENDING: "#94a3b8",
  SKIPPED: "#f59e0b",
}

const createStopIcon = (num: number, status: string) =>
  L.divIcon({
    className: "custom-stop-marker",
    html: `<div style="
      width: 26px; height: 26px; border-radius: 50%;
      background: ${stopColors[status] || stopColors.PENDING};
      border: 2.5px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px; font-weight: 800;
    ">${num}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })

// Auto-focus map on a specific agent when selected
function FocusAgent({ agentId, agents }: { agentId: string | null; agents: AgentLocation[] }) {
  const map = useMap()
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    if (!agentId || agentId === prevId.current) return
    prevId.current = agentId
    const agent = agents.find(a => a.agentId === agentId)
    if (agent) map.setView([agent.latitude, agent.longitude], 14, { animate: true })
  }, [agentId, agents, map])
  return null
}

interface Props {
  agents: AgentLocation[]
  replayTrack?: Array<{ latitude: number; longitude: number; recordedAt: string }>
  showGeofence?: boolean
  geofenceRadius?: number // meters, default 100
  plannedRoute?: RouteStop[]
  focusAgentId?: string | null
  etaSeconds?: number | null
}

export default function MtmLiveMap({ agents, replayTrack = [], showGeofence = false, geofenceRadius = 100, plannedRoute = [], focusAgentId = null, etaSeconds = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [tileLimited, setTileLimited] = useState(false)

  // Measure container and pass exact pixel dimensions to MapContainer.
  // Uses aggressive retries because CSS calc() height may not be applied on first paint.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let stopped = false

    const measure = () => {
      if (stopped) return
      const { width, height } = el.getBoundingClientRect()
      if (width > 50 && height > 50) {
        setDimensions({ width: Math.floor(width), height: Math.floor(height) })
      }
    }

    // Immediate + staggered retries until CSS layout is ready
    measure()
    const t1 = setTimeout(measure, 50)
    const t2 = setTimeout(measure, 150)
    const t3 = setTimeout(measure, 400)
    const t4 = setTimeout(measure, 900)
    const t5 = setTimeout(measure, 2000)

    // Keep watching for resizes (sidebar collapse, window resize)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => measure())
      observer.observe(el)
    }

    return () => {
      stopped = true
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      clearTimeout(t4); clearTimeout(t5)
      observer?.disconnect()
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
      {dimensions ? (
        <div style={{ position: "relative", height: dimensions.height, width: dimensions.width }}>
          <MapContainer
            key={`${dimensions.width}x${dimensions.height}`}
            center={center}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            preferCanvas={true}
          >
            <InvalidateSize />
            <SmartTileLayer onLimitReached={setTileLimited} />
            {focusAgentId && <FocusAgent agentId={focusAgentId} agents={agents} />}
            {/* Planned route polyline + stop markers */}
            {plannedRoute.length > 1 && (
              <Polyline
                positions={plannedRoute.map(s => [s.latitude, s.longitude] as [number, number])}
                color="#6C63FF"
                weight={3}
                opacity={0.5}
                dashArray="8 6"
              />
            )}
            {plannedRoute.map((stop) => (
              <Marker
                key={`stop-${stop.orderIndex}`}
                position={[stop.latitude, stop.longitude]}
                icon={createStopIcon(stop.orderIndex + 1, stop.status)}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{stop.name}</div>
                    {stop.address && <div className="text-xs text-muted-foreground">{stop.address}</div>}
                    <div className="text-xs mt-1" style={{ color: stopColors[stop.status] }}>
                      {stop.status === "VISITED" ? `Visited ${stop.visitedAt ? new Date(stop.visitedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}` :
                       stop.status === "NEXT" ? "Next stop" :
                       stop.status === "SKIPPED" ? "Skipped" : "Pending"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {/* Actual GPS track (blue) */}
            {replayPositions.length > 1 && (
              <Polyline positions={replayPositions} color="#3b82f6" weight={3} opacity={0.7} />
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
                    {focusAgentId === agent.agentId && agent.routeCompletion != null && (
                      <div className="text-xs mt-1" style={{ color: "#6C63FF", fontWeight: 600 }}>
                        Route: {agent.routeCompletion}% complete
                        {etaSeconds != null && etaSeconds > 0 && (
                          <span className="text-muted-foreground font-normal"> | ETA {etaSeconds < 60 ? "<1 min" : etaSeconds < 3600 ? `${Math.round(etaSeconds / 60)} min` : `${(etaSeconds / 3600).toFixed(1)} h`}</span>
                        )}
                      </div>
                    )}
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
          {tileLimited && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 1000,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0B0B1E", marginBottom: 6 }}>
                Map limit reached
              </div>
              <div style={{ fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 340, lineHeight: 1.5 }}>
                The map tile service has temporarily reached its usage limit. The map will automatically resume when the limit resets. Agent tracking continues in the background.
              </div>
              <button
                onClick={() => { setTileLimited(false); window.location.reload() }}
                style={{
                  marginTop: 16, padding: "8px 20px", borderRadius: 8,
                  background: "#6C63FF", color: "#fff", border: "none",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 14, gap: 8 }}>
          <div>🗺️</div>
          <div>Preparing map...</div>
        </div>
      )}
    </div>
  )
}
