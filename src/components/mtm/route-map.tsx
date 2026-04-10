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

interface RoutePoint {
  id: string
  orderIndex: number
  status: string
  customer?: { name?: string; latitude?: number; longitude?: number }
  visitedAt?: string
}

const createPointIcon = (index: number, status: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50%;
      background: ${status === "VISITED" ? "#22c55e" : status === "SKIPPED" ? "#ef4444" : "#94a3b8"};
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 12px; font-weight: bold;
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

interface Props {
  points: RoutePoint[]
}

export default function MtmRouteMap({ points }: Props) {
  useLeafletCSS()
  const validPoints = points
    .filter((p) => p.customer?.latitude && p.customer?.longitude)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  if (validPoints.length === 0) return null

  const defaultCenter: [number, number] = [40.4093, 49.8671]
  const center: [number, number] =
    validPoints.length > 0
      ? [validPoints[0].customer!.latitude!, validPoints[0].customer!.longitude!]
      : defaultCenter

  const polylinePositions: [number, number][] = validPoints.map((p) => [
    p.customer!.latitude!,
    p.customer!.longitude!,
  ])

  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
      />
      {/* Route line */}
      <Polyline positions={polylinePositions} color="#6366f1" weight={3} opacity={0.7} dashArray="8 4" />
      {/* Point markers */}
      {validPoints.map((point, i) => (
        <Marker
          key={point.id}
          position={[point.customer!.latitude!, point.customer!.longitude!]}
          icon={createPointIcon(i, point.status)}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">#{i + 1} {point.customer?.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Status: {point.status}
                {point.visitedAt && <> · Visited: {new Date(point.visitedAt).toLocaleTimeString()}</>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
