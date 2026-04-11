"use client"

import { useEffect, useState, useCallback } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"

// Inject Leaflet CSS via CDN
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

const markerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #6C63FF;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: grab;
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

interface Props {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(
        Math.round(e.latlng.lat * 1000000) / 1000000,
        Math.round(e.latlng.lng * 1000000) / 1000000,
      )
    },
  })
  return null
}

function FlyToPosition({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.5 })
  }, [lat, lng, map])
  return null
}

export default function LocationPickerMap({ latitude, longitude, onChange }: Props) {
  useLeafletCSS()

  const defaultCenter: [number, number] = [40.4093, 49.8671] // Baku
  const hasPosition = latitude != null && longitude != null && latitude !== 0 && longitude !== 0
  const center: [number, number] = hasPosition ? [latitude!, longitude!] : defaultCenter

  return (
    <div style={{ height: 220, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border, #e2e8f0)" }}>
      <MapContainer center={center} zoom={hasPosition ? 15 : 12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {hasPosition && (
          <>
            <Marker position={[latitude!, longitude!]} icon={markerIcon} />
            <FlyToPosition lat={latitude!} lng={longitude!} />
          </>
        )}
      </MapContainer>
    </div>
  )
}
