"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import { CommandSearch } from "@/components/command-search"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // TODO: Replace with real session data after full auth integration
  const org = { plan: "enterprise", addons: [] as string[] }

  return (
    <ThemeProvider>
      <div className="flex h-screen">
        <Sidebar org={org} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header orgName="LeadDrive CRM" userName="Admin" />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
            {children}
          </main>
          <CommandSearch />
        </div>
      </div>
    </ThemeProvider>
  )
}
