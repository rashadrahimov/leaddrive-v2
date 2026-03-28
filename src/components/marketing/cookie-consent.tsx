"use client"

import { useState, useEffect } from "react"

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-consent")
    if (!accepted) {
      const timer = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem("cookie-consent", "true")
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-slate-400 flex-1">
          Bu sayt təcrübənizi yaxşılaşdırmaq üçün cookies istifadə edir.
          Davam etməklə siz cookie siyasətimizi qəbul edirsiniz.
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={accept}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Qəbul et
          </button>
          <button
            onClick={() => setShow(false)}
            className="rounded-full border border-slate-700 px-5 py-2 text-sm font-medium text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
          >
            Bağla
          </button>
        </div>
      </div>
    </div>
  )
}
