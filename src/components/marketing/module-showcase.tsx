"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SectionWrapper } from "./section-wrapper"
import { moduleGroups } from "@/lib/marketing-data"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function ModuleShowcase() {
  const [activeTab, setActiveTab] = useState(0)
  const active = moduleGroups[activeTab]

  return (
    <SectionWrapper id="modules" variant="gray">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl lg:text-4xl font-bold text-slate-800">
          Everything you need,{" "}
          <span className="text-orange-500">nothing you don't</span>
        </h2>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          7 module groups. 63+ pages. One platform.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {moduleGroups.map((group, i) => {
          const Icon = group.icon
          return (
            <button
              key={group.id}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                i === activeTab
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {group.title}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="grid lg:grid-cols-2 gap-8 items-center"
        >
          {/* Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {(() => { const Icon = active.icon; return <Icon className="h-6 w-6 text-orange-500" /> })()}
              <h3 className="text-2xl font-bold text-slate-800">{active.title}</h3>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">{active.description}</p>
            <div className="grid grid-cols-2 gap-3">
              {active.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="aspect-[4/3] bg-gradient-to-br from-[hsl(210,20%,97%)] to-[hsl(210,25%,94%)] flex items-center justify-center p-8">
              {(() => {
                const Icon = active.icon
                return (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 mx-auto mb-4 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-orange-500" />
                    </div>
                    <p className="font-semibold text-slate-800">{active.title} Module</p>
                    <p className="text-sm text-gray-400 mt-1">{active.features.length} features</p>
                  </div>
                )
              })()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </SectionWrapper>
  )
}
