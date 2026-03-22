"use client"

import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"

const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "az", label: "Azərbaycan" },
  { code: "en", label: "English" },
]

function getLocaleFromCookie(): string {
  if (typeof document === "undefined") return "ru"
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1] || "ru"
  )
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState("ru")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrent(getLocaleFromCookie())
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function switchLocale(locale: string) {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60}`
    window.location.reload()
  }

  const currentLang = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0]

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        title={currentLang.label}
      >
        <Globe className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 min-w-[140px] rounded-md border bg-popover shadow-md">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLocale(lang.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground first:rounded-t-md last:rounded-b-md ${
                lang.code === current ? "font-semibold text-primary" : "text-foreground"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
