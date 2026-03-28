"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/home#modules", label: "Modullar" },
  { href: "/home#ai", label: "AI" },
  { href: "/home#pricing", label: "Qiymətlər" },
  { href: "/demo", label: "Demo" },
  { href: "/contact", label: "Əlaqə" },
]

export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-sm border-b border-slate-200"
          : "bg-white"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center">
            <Logo size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
            >
              Daxil ol
            </Link>
            <Link
              href="/demo"
              className="rounded-full bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
            >
              Demo tələb et
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 py-4 space-y-1 animate-fade-in-up">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-slate-200 pt-3 mt-3 flex flex-col gap-2 px-3">
              <Link
                href="/login"
                className="text-center text-sm font-medium text-slate-600 hover:text-slate-900 py-2.5 border border-slate-300 rounded-full"
              >
                Daxil ol
              </Link>
              <Link
                href="/demo"
                className="text-center rounded-full bg-orange-500 text-sm font-semibold text-white px-5 py-2.5 hover:bg-orange-600 transition-all"
              >
                Demo tələb et
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
