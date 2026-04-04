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
          <p className="text-sm font-medium text-[#001E3C]/40 uppercase tracking-widest mb-3">
            Qiymətlər
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#001E3C]">
            Sizinlə birlikdə böyüyən planlar
          </h2>
          <p className="mt-4 text-lg text-[#001E3C]/60 max-w-xl mx-auto">
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
                    ? "border-[#0176D3] bg-white ring-1 ring-[#0176D3] shadow-xl shadow-[#0176D3]/10 lg:scale-[1.03]"
                    : "border-[#001E3C]/10 bg-white hover:border-[#001E3C]/15 hover:shadow-lg hover:shadow-[#001E3C]/5"
                )}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0176D3] text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Ən populyar
                  </div>
                )}

                <h3 className="text-lg font-semibold text-[#001E3C]">{plan.name}</h3>
                <p className="text-sm text-[#001E3C]/60 mt-1 mb-6">{plan.tagline}</p>

                <div className="mb-6">
                  <span className="text-base font-medium text-[#001E3C]">Satışla əlaqə</span>
                </div>

                <ul className="space-y-2.5 flex-1">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        plan.popular ? "text-[#0176D3]" : "text-[#0176D3]"
                      )} />
                      <span className="text-sm text-[#001E3C]/60">{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-[#001E3C]/40 pl-6">
                      + {plan.features.length - 6} daha çox
                    </li>
                  )}
                </ul>

                <Link
                  href={plan.popular ? "/demo" : "/contact"}
                  className={cn(
                    "mt-8 block text-center py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200",
                    plan.popular
                      ? "bg-[#0176D3] text-white hover:bg-[#0176D3]/90 shadow-lg shadow-[#0176D3]/10"
                      : "border border-[#001E3C]/10 text-[#001E3C] hover:bg-[#F3F4F7] hover:border-[#001E3C]/15"
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#001E3C]/40 hover:text-[#001E3C]/60 transition-colors"
          >
            Bütün xüsusiyyətləri müqayisə et <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </AnimateIn>
      </div>
    </section>
  )
}
