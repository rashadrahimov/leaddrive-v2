"use client"

import { useState, useEffect } from "react"
import { ArrowUp, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export function FloatingButtons() {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 backdrop-blur-sm text-slate-400 hover:text-white hover:border-slate-600 shadow-lg transition-all duration-300",
          showTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-label="Yuxarı qayıt"
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      {/* WhatsApp */}
      <a
        href="https://wa.me/994105313065?text=Salam%2C%20LeadDrive%20CRM%20haqqında%20məlumat%20almaq%20istəyirəm"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-emerald-500/50 transition-all animate-pulse-glow"
        aria-label="WhatsApp ilə yazın"
        style={{ "--tw-shadow-color": "rgba(16, 185, 129, 0.4)" } as React.CSSProperties}
      >
        <MessageCircle className="h-5 w-5" />
      </a>
    </div>
  )
}
