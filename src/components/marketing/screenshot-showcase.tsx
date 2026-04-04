"use client"

import { motion } from "framer-motion"
import { SectionWrapper } from "./section-wrapper"
import { Monitor, Smartphone, Globe, MessageCircle } from "lucide-react"

const showcaseItems = [
  {
    title: "Da Vinci ilə 7 Kanalda Ünsiyyət",
    description: "WhatsApp, Telegram, E-poçt, SMS, Facebook, Instagram, VK — Da Vinci hər kanalda müştərilərə cavab verir və e-poçt generasiya edir.",
    icon: MessageCircle,
  },
  {
    title: "Güclü İdarə Paneli",
    description: "Real vaxt KPI-lər, gəlir qrafikləri, pipeline və avtomatik risk xəbərdarlıqları — hamısı bir baxışda.",
    icon: Monitor,
  },
  {
    title: "Hər Yerdə İşləyir",
    description: "Tam responsiv dizayn. LeadDrive-ı masaüstü, planşet və ya mobildə istifadə edin — eyni güclü təcrübə.",
    icon: Smartphone,
  },
  {
    title: "Çoxdilli Dəstək",
    description: "İngilis, Rus və Azərbaycan dilləri arasında dərhal keçid edin. Hər etiket, hər ipucu, hər hesabat.",
    icon: Globe,
  },
]

export function ScreenshotShowcase() {
  return (
    <SectionWrapper id="showcase" variant="gray">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {showcaseItems.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white rounded-xl p-6 border border-[#001E3C]/10 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0176D3]/5 flex items-center justify-center mb-4">
                <Icon className="h-6 w-6 text-[#001E3C]" />
              </div>
              <h3 className="font-bold text-[#001E3C] text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-[#001E3C]/60 leading-relaxed">{item.description}</p>
            </motion.div>
          )
        })}
      </div>
    </SectionWrapper>
  )
}
