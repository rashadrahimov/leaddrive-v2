"use client"

import { useState } from "react"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { faqs } from "@/lib/marketing-data"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-sm font-medium text-slate-900 pr-4">{q}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          open ? "max-h-48 pb-5" : "max-h-0"
        )}
      >
        <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
      </div>
    </div>
  )
}

export function FaqSection() {
  return (
    <SectionWrapper id="faq" variant="white" narrow>
      <AnimateIn className="text-center mb-12">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
          Tez-tez verilən suallar
        </h2>
        <p className="mt-4 text-lg text-slate-500">
          Cavab tapa bilmirsinizsə, bizimlə əlaqə saxlayın.
        </p>
      </AnimateIn>

      <div className="max-w-3xl mx-auto">
        {faqs.map((faq, i) => (
          <AnimateIn key={i} delay={i * 40}>
            <FaqItem q={faq.q} a={faq.a} defaultOpen={i === 0} />
          </AnimateIn>
        ))}
      </div>
    </SectionWrapper>
  )
}
