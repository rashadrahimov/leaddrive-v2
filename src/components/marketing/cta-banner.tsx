"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { ArrowRight } from "lucide-react"

export function CtaBanner() {
  return (
    <section className="bg-gradient-to-br from-[#F97316] to-[#FACC15] py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl lg:text-5xl font-bold text-white"
        >
          Lidlərinizi idarə etməyə hazırsınız?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 text-lg text-white/80 max-w-xl mx-auto"
        >
          Pulsuz sınaq dövrünüzü bu gün başladın. Kredit kartı tələb olunmur.
          Real marjalarınızı dəqiqələr ərzində görün.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/register">
            <ShimmerButton
              background="rgba(255,255,255,0.15)"
              shimmerColor="rgba(255,255,255,0.4)"
              borderRadius="10px"
              className="text-base font-semibold px-8 py-3.5 border-white/30"
            >
              Pulsuz sınaq başlat
              <ArrowRight className="ml-2 h-4 w-4" />
            </ShimmerButton>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-[10px] hover:bg-white/10 transition-all"
          >
            Satışla danışın
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
