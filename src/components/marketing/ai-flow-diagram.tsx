"use client"

import { motion } from "framer-motion"
import { SectionWrapper } from "./section-wrapper"
import { MessageSquare, Bot, LayoutDashboard, Lightbulb, ArrowRight, Mail, Phone, Send } from "lucide-react"

const flowSteps = [
  { icon: MessageSquare, label: "Müştəri", sublabel: "WhatsApp · Telegram · E-poçt · SMS · FB · IG · VK", color: "#f59e0b" },
  { icon: Bot, label: "Süni Zeka", sublabel: "Claude ilə AI cavab", color: "#7c3aed" },
  { icon: LayoutDashboard, label: "CRM", sublabel: "Avto-zənginləşdirmə", color: "#F97316" },
  { icon: Lightbulb, label: "Təhlillər", sublabel: "Fəaliyyətə keçin", color: "#ef4444" },
]

export function AiFlowDiagram() {
  return (
    <SectionWrapper id="ai" variant="navy">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            <span className="text-orange-400">Sizin üçün</span> işləyən süni intellekt,
            <br />əksinə deyil
          </h2>
          <p className="mt-6 text-slate-300 text-lg leading-relaxed">
            Daxili Claude inteqrasiyası müştəri xidmətinizi, lid skorinqinizi
            və biznes təhlillərinizi gücləndirir. Əlavə deyil. Əsasdır.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "AI agentləri WhatsApp, Telegram və E-poçtda müştəri sorğularına avtomatik cavab verir",
              "Avtomatik lid skorinqi (A-F) və kvalifikasiyası",
              "AI ilə peşəkar e-poçt, mesaj və təklif generasiyası — bir kliklə göndərin",
              "Xərc modelinizdən gəlirlilik və büdcə təhlilləri avtomatik yaradılır",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-300 text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Flow diagram */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4"
        >
          {flowSteps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.15 }}
                  className="relative"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${step.color}20`, border: `2px solid ${step.color}40` }}
                  >
                    <Icon className="h-8 w-8" style={{ color: step.color }} />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="text-xs text-slate-400">{step.sublabel}</p>
                  </div>
                </motion.div>
                {i < flowSteps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.15 }}
                    className="my-2"
                  >
                    <ArrowRight className="h-5 w-5 text-slate-500 rotate-90" />
                  </motion.div>
                )}
              </div>
            )
          })}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
