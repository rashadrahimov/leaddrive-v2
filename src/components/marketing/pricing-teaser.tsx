"use client"

import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"
import { AnimateIn } from "./animate-in"
import { plans } from "@/lib/marketing-data"
import { Check, ArrowRight, Sparkles } from "lucide-react"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"

export function PricingTeaser() {
  return (
    <SectionWrapper id="pricing" variant="gray">
      <AnimateIn className="text-center mb-14">
        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
          <span className="text-slate-900">Sizinlə birlikdə </span>
          <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">böyüyən planlar</span>
        </h2>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
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
                ? "border-orange-300 bg-white ring-2 ring-orange-500 lg:scale-[1.03] lg:-my-2 shadow-lg"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all"
            )}
          >
            {plan.popular && (
              <>
                <BorderBeam size={200} duration={8} colorFrom="#f97316" colorTo="#ef4444" />
                <div className="mb-4 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                    Ən Populyar
                  </span>
                </div>
              </>
            )}

            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">{plan.tagline}</p>

            <div className="mb-6">
              <span className="text-lg font-medium text-slate-700">Satışla əlaqə</span>
            </div>

            <ul className="space-y-3 flex-1">
              {plan.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{feature}</span>
                </li>
              ))}
              {plan.features.length > 6 && (
                <li className="text-sm text-slate-400">
                  + {plan.features.length - 6} daha çox
                </li>
              )}
            </ul>

            <Link
              href={plan.popular ? "/demo" : "/contact"}
              className={cn(
                "mt-8 block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-all",
                plan.popular
                  ? "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-lg"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              )}
            >
              {plan.popular ? "Demo tələb et" : "Başla"}
            </Link>
          </AnimateIn>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          href="/plans"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-orange-500 transition-colors"
        >
          Bütün xüsusiyyətləri müqayisə et <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </SectionWrapper>
  )
}
