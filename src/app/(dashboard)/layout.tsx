"use client"

import { useSession } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { CommandSearch } from "@/components/command-search"

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
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen">
          <Sidebar org={org} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header
              orgName={user?.organizationName || "LeadDrive CRM"}
              userName={user?.name || "User"}
            />
            <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
              {children}
            </main>
            <CommandSearch />
          </div>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
