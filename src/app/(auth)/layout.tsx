"use client"

import { WallpaperProvider } from "@/contexts/wallpaper-context"
import { VideoBackground } from "@/components/video-background"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <WallpaperProvider>
      <VideoBackground />
      <div className="relative z-[2] flex min-h-screen items-center justify-center bg-muted/50">
        <div className="w-full max-w-md backdrop-blur-xl">{children}</div>
      </div>
    </WallpaperProvider>
  )
}
