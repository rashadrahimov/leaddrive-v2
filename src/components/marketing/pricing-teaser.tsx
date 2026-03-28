"use client"

import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { plans } from "@/lib/marketing-data"
import { Check, ArrowRight } from "lucide-react"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"

export function PricingTeaser() {
  return (
    <SectionWrapper id="pricing" variant="darker">
      <AnimateIn className="text-center mb-14">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
          <span className="text-white">Sizinlə birlikdə </span>
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">böyüyən planlar</span>
        </h2>
        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
          Pulsuz başlayın, hazır olanda yüksəldin. Gizli ödənişlər yoxdur.
        </p>
      </AnimateIn>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, i) => (
          <AnimateIn
            key={plan.id}
            delay={i * 80}
            className={cn(
              "relative rounded-2xl border p-6 lg:p-8 flex flex-col overflow-hidden",
              plan.popular
                ? "border-violet-500/40 bg-slate-900/80"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-colors"
            )}
          >
            {plan.popular && (
              <>
                <BorderBeam size={200} duration={8} colorFrom="#8b5cf6" colorTo="#06b6d4" />
                <div className="mb-4">
                  <span className="text-xs font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-wider">
                    Ən Populyar
                  </span>
                </div>
              </>
            )}

            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">{plan.tagline}</p>

            <div className="mb-6">
              <span className="text-lg font-medium text-slate-300">Satışla əlaqə</span>
            </div>

            <ul className="space-y-3 flex-1">
              {plan.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-violet-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-400">{feature}</span>
                </li>
              ))}
              {plan.features.length > 6 && (
                <li className="text-sm text-slate-600">
                  + {plan.features.length - 6} daha çox
                </li>
              )}
            </ul>

            <Link
              href="/contact"
              className={cn(
                "mt-8 block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-all",
                plan.popular
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25"
                  : "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
              )}
            >
              Başla
            </Link>
          </AnimateIn>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/plans"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-400 transition-colors"
        >
          Bütün xüsusiyyətləri müqayisə et <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </div>
    </SectionWrapper>
  )
}
