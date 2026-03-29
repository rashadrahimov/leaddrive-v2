"use client"

import Link from "next/link"
import { AnimateIn } from "./animate-in"
import { plans } from "@/lib/marketing-data"
import { Check, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function PricingTeaser() {
  return (
    <section id="pricing" className="relative bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn className="text-center mb-14">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-3">
            Qiymətlər
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Sizinlə birlikdə böyüyən planlar
          </h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
            Pulsuz başlayın, hazır olanda yüksəldin. Gizli ödənişlər yoxdur.
          </p>
        </AnimateIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => (
            <AnimateIn
              key={plan.id}
              delay={i * 70}
            >
              <div
                className={cn(
                  "relative h-full rounded-2xl border p-6 lg:p-7 flex flex-col transition-all duration-300",
                  plan.popular
                    ? "border-slate-900 bg-white ring-1 ring-slate-900 shadow-xl shadow-slate-200/50 lg:scale-[1.03]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100/80"
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Ən populyar
                  </div>
                )}

                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6">{plan.tagline}</p>

                <div className="mb-6">
                  <span className="text-base font-medium text-slate-700">Satışla əlaqə</span>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        plan.popular ? "text-slate-900" : "text-orange-500"
                      )} />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-slate-400 pl-6">
                      + {plan.features.length - 6} daha çox
                    </li>
                  )}
                </ul>

                <Link
                  href={plan.popular ? "/demo" : "/contact"}
                  className={cn(
                    "mt-8 block text-center py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200",
                    plan.popular
                      ? "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  {plan.popular ? "Demo tələb et" : "Başla"}
                </Link>
              </div>
            </AnimateIn>
          ))}
        </div>

        <AnimateIn delay={400} className="text-center mt-10">
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            Bütün xüsusiyyətləri müqayisə et <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AnimateIn>
      </div>
    </section>
  )
}
