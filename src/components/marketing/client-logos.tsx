"use client"

import { AnimateIn } from "./animate-in"

const clients = [
  "AzərTech Həlləri",
  "BulutKöprü IT",
  "DataAxın",
  "İnnovasiya MSP",
  "YaşılTex",
  "Nexus Konsaltinq",
]

export function ClientLogos() {
  return (
    <section className="bg-white py-10 border-b border-[#001E3C]/10">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <p className="text-center text-xs font-medium uppercase tracking-widest text-[#001E3C]/40 mb-6">
            İSTİFADƏÇİLƏR
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {clients.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold text-[#001E3C]/40 hover:text-[#001E3C]/60 transition-colors"
              >
                {name}
              </span>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  )
}
