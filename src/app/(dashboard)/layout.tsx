"use client"

import { useSession } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { CommandSearch } from "@/components/command-search"
import { AiAssistantPanel } from "@/components/ai-assistant-panel"
import { MotionPage } from "@/components/ui/motion"
import { WallpaperProvider } from "@/contexts/wallpaper-context"
import { VideoBackground } from "@/components/video-background"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const user = session?.user
  const org = {
    plan: user?.plan || "enterprise",
    addons: [] as string[],
  }

  return (
    <ThemeProvider>
      <WallpaperProvider>
        <QueryClientProvider client={queryClient}>
          <VideoBackground />
          <div className="relative z-[2] flex h-screen">
            <Sidebar org={org} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <Header
                orgName={user?.organizationName || "LeadDrive CRM"}
                userName={user?.name || "User"}
              />
              <main className="flex-1 overflow-y-auto bg-background p-8 relative">
                <MotionPage>{children}</MotionPage>
              </main>
              <CommandSearch />
              <AiAssistantPanel />
            </div>
          </div>
        </QueryClientProvider>
      </WallpaperProvider>
    </ThemeProvider>
  )
}
