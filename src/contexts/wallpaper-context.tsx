"use client"

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react"

export interface WallpaperDef {
  id: string
  label: string
  labelRu: string
  type: "video" | "css"
  src?: string
  /** CSS gradient used as thumbnail in selector */
  thumbGradient: string
}

export const WALLPAPERS: WallpaperDef[] = [
  {
    id: "alpine",
    label: "Alpine Mountains",
    labelRu: "Альпийские горы",
    type: "video",
    src: "/wallpapers/alpine.mp4",
    thumbGradient: "linear-gradient(135deg, #4ade80 0%, #22d3ee 40%, #3b82f6 70%, #f0f9ff 100%)",
  },
  {
    id: "night-city",
    label: "Night City",
    labelRu: "Ночной город",
    type: "video",
    src: "/wallpapers/night-city.mp4",
    thumbGradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 30%, #f59e0b 60%, #1e293b 100%)",
  },
  {
    id: "ocean",
    label: "Ocean Beach",
    labelRu: "Океан",
    type: "video",
    src: "/wallpapers/ocean.mp4",
    thumbGradient: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 40%, #155e75 70%, #f0fdfa 100%)",
  },
  {
    id: "abstract-gradient",
    label: "Abstract Gradient",
    labelRu: "Абстрактный градиент",
    type: "css",
    thumbGradient: "linear-gradient(-45deg, #0f172a, #1e1b4b, #172554, #0c4a6e)",
  },
]

const STORAGE_KEY = "leaddrive-wallpaper"

interface WallpaperContextValue {
  wallpaper: string | null
  wallpaperDef: WallpaperDef | null
  isWallpaperActive: boolean
  setWallpaper: (id: string | null) => void
}

export const WallpaperContext = createContext<WallpaperContextValue>({
  wallpaper: null,
  wallpaperDef: null,
  isWallpaperActive: false,
  setWallpaper: () => {},
})

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [wallpaper, setWallpaperState] = useState<string | null>(null)

  // Read from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && WALLPAPERS.some((w) => w.id === saved)) {
      setWallpaperState(saved)
      document.documentElement.setAttribute("data-wallpaper", saved)
    }
  }, [])

  const setWallpaper = useCallback((id: string | null) => {
    setWallpaperState(id)
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
      document.documentElement.setAttribute("data-wallpaper", id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
      document.documentElement.removeAttribute("data-wallpaper")
    }
  }, [])

  const wallpaperDef = wallpaper ? WALLPAPERS.find((w) => w.id === wallpaper) ?? null : null

  return (
    <WallpaperContext.Provider
      value={{ wallpaper, wallpaperDef, isWallpaperActive: !!wallpaper, setWallpaper }}
    >
      {children}
    </WallpaperContext.Provider>
  )
}
