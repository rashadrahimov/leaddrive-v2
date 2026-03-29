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
