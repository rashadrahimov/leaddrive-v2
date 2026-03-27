"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { CommandSearch } from "@/components/command-search"
import { AiAssistantPanel } from "@/components/ai-assistant-panel"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "next-intl"

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

  const tc = useTranslations("common")
  const router = useRouter()
  const pathname = usePathname()
  // Show nav buttons only on detail/edit/create pages (paths with more than 1 segment)
  const segments = pathname.split("/").filter(Boolean)
  const isDetailPage = segments.length >= 2

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen">
          <Sidebar org={org} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header
              orgName={user?.organizationName || "LeadDrive CRM"}
              userName={user?.name || "User"}
            />
            <main className="flex-1 overflow-y-auto bg-muted/30 p-6 relative">
              {children}
              {isDetailPage && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border px-1 py-1">
                  <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {tc("back")}
                  </button>
                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />
                  <button
                    onClick={() => router.forward()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {tc("next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </main>
            <CommandSearch />
            <AiAssistantPanel />
          </div>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
