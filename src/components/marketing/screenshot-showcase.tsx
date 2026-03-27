"use client"

import { motion } from "framer-motion"
import { SectionWrapper } from "./section-wrapper"
import { Monitor, Smartphone, Globe } from "lucide-react"

const showcaseItems = [
  {
    title: "Powerful Dashboard",
    description: "Real-time KPIs, revenue charts, pipeline funnel, and AI-powered risk alerts — all at a glance.",
    icon: Monitor,
  },
  {
    title: "Works Everywhere",
    description: "Fully responsive design. Use LeadDrive on desktop, tablet, or mobile — same powerful experience.",
    icon: Smartphone,
  },
  {
    title: "Multi-Language",
    description: "Switch between English, Russian, and Azerbaijani instantly. Every label, every tooltip, every report.",
    icon: Globe,
  },
]

export function ScreenshotShowcase() {
  return (
    <SectionWrapper id="showcase" variant="gray">
      <div className="grid lg:grid-cols-3 gap-8">
        {showcaseItems.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/5 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-slate-800" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            </motion.div>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
