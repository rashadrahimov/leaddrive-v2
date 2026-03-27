"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { motion } from "framer-motion"
import { ArrowRight, Play, ChevronDown } from "lucide-react"

const typingPhrases = [
  "Real marjanızı görün",
  "Süni intellektlə satış bağlayın",
  "WhatsApp · Telegram · E-poçt — AI cavab",
  "Büdcə, proqnoz, mənfəət",
]

export function HeroSection() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [displayed, setDisplayed] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const phrase = typingPhrases[phraseIndex]
    let timeout: NodeJS.Timeout

    if (!isDeleting && displayed.length < phrase.length) {
      timeout = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 70)
    } else if (!isDeleting && displayed.length === phrase.length) {
      timeout = setTimeout(() => setIsDeleting(true), 1800)
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35)
    } else if (isDeleting && displayed.length === 0) {
      setIsDeleting(false)
      setPhraseIndex((prev) => (prev + 1) % typingPhrases.length)
    }

    return () => clearTimeout(timeout)
  }, [displayed, isDeleting, phraseIndex])

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[hsl(210,30%,97%)] to-white pt-20 pb-16 lg:pt-28 lg:pb-24">
      {/* Decorative grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,160,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,160,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Trust badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatedGradientText className="mb-8">
              <span className="text-sm font-medium text-gray-700">
                500+ şirkət artıq istifadə edir
              </span>
              <ArrowRight className="ml-2 h-3.5 w-3.5 text-gray-500" />
            </AnimatedGradientText>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-800 leading-[1.1]"
          >
            Sizə göstərən CRM:
            <br />
            <span className="text-orange-500 inline-block min-h-[1.2em]">
              {displayed}
              <span className="animate-pulse">|</span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            Satış, marketinq, dəstək və maliyyə analitikası bir platformada.
            Hansı müştərilərin, xidmətlərin və kanalların gəlirli olduğunu dəqiq bilin.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register">
              <ShimmerButton
                background="linear-gradient(135deg, #F97316, #FACC15)"
                borderRadius="10px"
                className="text-base font-semibold px-8 py-3.5"
              >
                Pulsuz sınaq başlat
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-800 border-2 border-orange-500/20 rounded-[10px] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all"
            >
              <Play className="h-4 w-4 fill-current" />
              Demo izlə
            </Link>
            <Link
              href="/plans"
              className="text-base font-medium text-gray-500 hover:text-slate-800 transition-colors underline-offset-4 hover:underline"
            >
              Qiymətlərə bax
            </Link>
          </motion.div>
        </div>

        {/* Dashboard screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 lg:mt-20 relative"
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Browser frame */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/60 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200 max-w-xs mx-auto text-center">
                    app.leaddrivecrm.org
                  </div>
                </div>
              </div>
              {/* Dashboard screenshot */}
              <img
                src="/marketing/crm-dashboard.png"
                alt="LeadDrive CRM İdarə Paneli"
                className="w-full"
                loading="eager"
              />
            </div>

            {/* Floating accent cards */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-4 lg:-left-8 top-1/4 bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3 hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-lg">💬</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">AI Rabitə</p>
                  <p className="text-xs text-green-600 font-medium">WhatsApp · Telegram · E-poçt</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-4 lg:-left-8 bottom-1/4 bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3 hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm font-bold">+</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Gəlir</p>
                  <p className="text-xs text-green-600 font-medium">Bu ay +23%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 lg:-right-8 top-1/4 bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3 hidden lg:block"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <span className="text-orange-500 text-sm font-bold">AI</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">Süni Zeka</p>
                  <p className="text-xs text-orange-500 font-medium">12 tapşırıq avtomatlaşdı</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex justify-center mt-12"
        >
          <ChevronDown className="h-6 w-6 text-gray-300" />
        </motion.div>
      </div>
    </section>
  )
}
