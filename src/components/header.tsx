"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Search, LogOut, Command } from "lucide-react"
import { signOut } from "next-auth/react"
import { NotificationBell } from "@/components/notification-bell"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslations } from "next-intl"

interface HeaderProps {
  orgName?: string
  userName?: string
}

export function Header({ orgName = "Organization", userName = "User" }: HeaderProps) {
  const t = useTranslations("common")
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 bg-card px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">{orgName}</span>

        {/* Visible search bar */}
        <button className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("search")}</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <LanguageSwitcher />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <div className="ml-2 flex items-center gap-2 border-l border-border/40 pl-4">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#0ea5a0] flex items-center justify-center text-xs font-medium text-white shadow-sm">
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
