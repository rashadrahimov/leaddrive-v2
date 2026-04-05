"use client"

import { useEffect, useRef } from "react"
import { useWallpaper } from "@/hooks/use-wallpaper"

export function VideoBackground() {
  const { wallpaperDef, isWallpaperActive } = useWallpaper()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Pause video when tab is hidden, resume when visible
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleVisibility = () => {
      if (document.hidden) {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [wallpaperDef])

  if (!isWallpaperActive || !wallpaperDef) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover"
        key={wallpaperDef.id}
      >
        <source src={wallpaperDef.src} type="video/mp4" />
      </video>
      {/* Minimal scrim — keep video bright */}
      <div className="absolute inset-0 bg-black/5" />
    </div>
  )
}
