"use client"

import { motion } from "framer-motion"
import { SectionWrapper } from "./section-wrapper"
import { painPoints, solutions } from "@/lib/marketing-data"
import { ArrowRight } from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5 },
}

export function ProblemSolution() {
  return (
    <SectionWrapper id="problem-solution" variant="white">
      <motion.div {...fadeInUp} className="text-center mb-16">
        <h2 className="text-3xl lg:text-4xl font-bold text-[#001E3C]">
          Təxmin etməyi dayandırın. <span className="text-[#0176D3]">Böyüməyə başlayın.</span>
        </h2>
        <p className="mt-4 text-lg text-[#001E3C]/60 max-w-2xl mx-auto">
          Əksər CRM-lər fəaliyyəti izləyir. LeadDrive gəlirliliyi izləyir.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Pain points */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-red-500/80 mb-4">Problem</h3>
          {painPoints.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-4 p-4 rounded-xl bg-red-50/50 border border-red-100"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#001E3C]">{item.title}</h4>
                  <p className="text-sm text-[#001E3C]/60 mt-1">{item.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Solutions */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0176D3] mb-4">LeadDrive həlli</h3>
          {solutions.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-4 p-4 rounded-xl bg-[#0176D3]/5 border border-[#0176D3]/10"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0176D3]/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[#0176D3]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#001E3C]">{item.title}</h4>
                  <p className="text-sm text-[#001E3C]/60 mt-1">{item.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
