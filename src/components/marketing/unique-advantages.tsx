"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"
import { MagicCard } from "@/components/ui/magic-card"
import { advantages } from "@/lib/marketing-data"
import { ArrowRight } from "lucide-react"

export function UniqueAdvantages() {
  return (
    <SectionWrapper id="advantages" variant="white">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl lg:text-4xl font-bold text-[#001E3C]">
          LeadDrive-ı{" "}
          <span className="text-[#0176D3]">fərqli edən</span> nədir?
        </h2>
        <p className="mt-4 text-lg text-[#001E3C]/60 max-w-2xl mx-auto">
          Mövcud CRM-inizdə olmayan — və heç vaxt olmayacaq xüsusiyyətlər.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {advantages.map((adv, i) => {
          const Icon = adv.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <MagicCard
                gradientColor={`${adv.color}20`}
                gradientOpacity={0.5}
                className="bg-white border-[#001E3C]/10 h-full"
              >
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${adv.color}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: adv.color }} />
                  </div>
                  <h3 className="font-bold text-[#001E3C] text-lg mb-2">{adv.title}</h3>
                  <p className="text-sm text-[#001E3C]/60 leading-relaxed mb-4">{adv.description}</p>
                  <Link
                    href={adv.href}
                    className="inline-flex items-center text-sm font-medium text-[#0176D3] hover:underline"
                  >
                    Ətraflı <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </MagicCard>
            </motion.div>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
