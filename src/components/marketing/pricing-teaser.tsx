"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"
import { plans } from "@/lib/marketing-data"
import { Check, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function PricingTeaser() {
  return (
    <SectionWrapper id="pricing" variant="white">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-800">
          Plans that scale{" "}
          <span className="text-orange-500">with you</span>
        </h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Start free, upgrade when you're ready. No hidden fees.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={cn(
              "relative rounded-xl border p-6 flex flex-col",
              plan.popular
                ? "border-orange-500 shadow-lg shadow-orange-500/10 bg-white"
                : "border-gray-200 bg-white hover:border-gray-300 transition-colors"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">{plan.tagline}</p>

            <div className="mb-6">
              <span className="text-2xl font-bold text-slate-800">Contact Sales</span>
            </div>

            <ul className="space-y-2.5 flex-1">
              {plan.features.slice(0, 6).map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
              {plan.features.length > 6 && (
                <li className="text-sm text-gray-400">
                  + {plan.features.length - 6} more features
                </li>
              )}
            </ul>

            <Link
              href="/contact"
              className={cn(
                "mt-6 block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors",
                plan.popular
                  ? "bg-orange-500 text-white hover:bg-orange-500/90"
                  : "bg-orange-500/5 text-slate-800 hover:bg-orange-500/10"
              )}
            >
              Get Started
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link
          href="/pricing"
          className="inline-flex items-center text-sm font-medium text-orange-500 hover:underline"
        >
          Compare all features <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </SectionWrapper>
  )
}
