"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Bell, Search, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

interface HeaderProps {
  orgName?: string
  userName?: string
}

export function Header({ orgName = "Organization", userName = "User" }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">{orgName}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" title="Search (Cmd+K)">
          <Search className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <div className="ml-2 flex items-center gap-2 border-l pl-4">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium hidden md:block">{userName}</span>
          <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
