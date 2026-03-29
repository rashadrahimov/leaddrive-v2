"use client"

import { Fragment, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { plans, faqs } from "@/lib/marketing-data"
import { Check, Minus, ArrowRight, ChevronDown } from "lucide-react"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { cn } from "@/lib/utils"

/* ─── full feature comparison matrix ─── */
type FeatureRow = { label: string; starter: boolean; business: boolean; professional: boolean; enterprise: boolean }

const comparisonSections: { title: string; rows: FeatureRow[] }[] = [
  {
    title: "Satış və CRM",
    rows: [
      { label: "İdarə paneli və KPI-lər", starter: true, business: true, professional: true, enterprise: true },
      { label: "Şirkətlər və Kontaktlar", starter: true, business: true, professional: true, enterprise: true },
      { label: "Sövdələşmələr və Pipeline", starter: true, business: true, professional: true, enterprise: true },
      { label: "Lidlər və Skorinq", starter: true, business: true, professional: true, enterprise: true },
      { label: "Tapşırıqlar və Təqvim", starter: true, business: true, professional: true, enterprise: true },
      { label: "Məhsul kataloqu", starter: true, business: true, professional: true, enterprise: true },
      { label: "Müqavilələr", starter: false, business: true, professional: true, enterprise: true },
      { label: "Fakturalar və Ödənişlər", starter: false, business: false, professional: true, enterprise: true },
      { label: "Təkliflər (Offer→Faktura)", starter: false, business: false, professional: true, enterprise: true },
    ],
  },
  {
    title: "Marketinq",
    rows: [
      { label: "Kampaniya meneceri", starter: false, business: false, professional: true, enterprise: true },
      { label: "E-poçt şablonları", starter: false, business: false, professional: true, enterprise: true },
      { label: "Marşrut qurucusu (Flow Editor)", starter: false, business: false, professional: true, enterprise: true },
      { label: "Seqmentlər", starter: false, business: false, professional: true, enterprise: true },
      { label: "Tədbirlər və Qeydiyyat", starter: false, business: false, professional: true, enterprise: true },
      { label: "Kampaniya ROI", starter: false, business: false, professional: true, enterprise: true },
    ],
  },
  {
    title: "Dəstək",
    rows: [
      { label: "Tiket idarəsi", starter: false, business: true, professional: true, enterprise: true },
      { label: "SLA siyasətləri", starter: false, business: true, professional: true, enterprise: true },
      { label: "Agent iş masası", starter: false, business: true, professional: true, enterprise: true },
      { label: "Bilik bazası", starter: false, business: true, professional: true, enterprise: true },
      { label: "Müştəri portalı", starter: false, business: false, professional: false, enterprise: true },
    ],
  },
  {
    title: "Rabitə",
    rows: [
      { label: "E-poçt inteqrasiyası", starter: true, business: true, professional: true, enterprise: true },
      { label: "7 kanallı gələn qutusu", starter: false, business: false, professional: false, enterprise: true },
      { label: "SMTP konfiqurasiyası", starter: false, business: false, professional: false, enterprise: true },
    ],
  },
  {
    title: "Analitika və Maliyyə",
    rows: [
      { label: "Hesabatlar", starter: false, business: false, professional: true, enterprise: true },
      { label: "Xərc modeli mühərriki", starter: false, business: false, professional: false, enterprise: true },
      { label: "Gəlirlilik təhlili", starter: false, business: false, professional: false, enterprise: true },
      { label: "Büdcələşdirmə və P&L", starter: false, business: false, professional: false, enterprise: true },
      { label: "Maliyyə (Debitor, Kreditor, Fondlar)", starter: false, business: false, professional: false, enterprise: true },
      { label: "Dinamik qiymətləndirmə", starter: false, business: false, professional: false, enterprise: true },
    ],
  },
  {
    title: "AI",
    rows: [
      { label: "AI skorinqi", starter: false, business: false, professional: true, enterprise: true },
      { label: "AI Satış Köməkçisi", starter: false, business: false, professional: false, enterprise: true },
      { label: "AI Komanda Mərkəzi", starter: false, business: false, professional: false, enterprise: true },
      { label: "AI Dəstək Agenti", starter: false, business: false, professional: false, enterprise: true },
    ],
  },
  {
    title: "Platforma",
    rows: [
      { label: "Rollar və İcazələr", starter: false, business: true, professional: true, enterprise: true },
      { label: "İş axınları", starter: false, business: false, professional: true, enterprise: true },
      { label: "Xüsusi sahələr", starter: false, business: false, professional: false, enterprise: true },
      { label: "Audit jurnalı", starter: false, business: false, professional: false, enterprise: true },
      { label: "API və Webhooklar", starter: false, business: false, professional: false, enterprise: true },
      { label: "Layihələr (ERP)", starter: false, business: false, professional: true, enterprise: true },
      { label: "3 dil (AZ/RU/EN)", starter: true, business: true, professional: true, enterprise: true },
      { label: "Qaranlıq rejim", starter: true, business: true, professional: true, enterprise: true },
    ],
  },
]

const planNames = ["Starter", "Business", "Professional", "Enterprise"] as const
const planKeys = ["starter", "business", "professional", "enterprise"] as const

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white via-[hsl(210,30%,97%)] to-white pt-20 pb-16">
        <div className="mx-auto max-w-5xl px-4 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl lg:text-5xl font-bold text-slate-800"
          >
            Şəffaf <span className="text-orange-500">qiymətlər</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Pulsuz sınaq ilə başlayın. Gizli ödənişlər yoxdur. İstədiyiniz zaman yüksəldin.
          </motion.p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16 -mt-4">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={cn(
                  "relative rounded-xl border p-6 flex flex-col bg-white",
                  plan.popular
                    ? "border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500"
                    : "border-gray-200"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Ən Populyar
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{plan.tagline}</p>
                <div className="mb-6">
                  <span className="text-2xl font-bold text-slate-800">Satışla əlaqə</span>
                </div>
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={cn(
                    "mt-6 block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors",
                    plan.popular
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-orange-500/5 text-slate-800 hover:bg-orange-500/10"
                  )}
                >
                  {plan.id === "enterprise" ? "Əlaqə saxlayın" : "Demo tələb et"}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-[hsl(210,20%,97%)] py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
            Bütün xüsusiyyətləri <span className="text-orange-500">müqayisə edin</span>
          </h2>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[640px]">
              {/* Header */}
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-sm font-medium text-gray-500 w-[40%]">Xüsusiyyət</th>
                  {planNames.map((name, i) => (
                    <th key={name} className="py-4 px-4 text-center">
                      <span className={cn(
                        "text-sm font-bold",
                        i === 2 ? "text-orange-500" : "text-slate-800"
                      )}>{name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <Fragment key={section.title}>
                    <tr className="bg-gray-50/80">
                      <td colSpan={5} className="py-3 px-6 text-sm font-bold text-slate-800">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.label} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-6 text-sm text-gray-700">{row.label}</td>
                        {planKeys.map((key) => (
                          <td key={key} className="py-3 px-4 text-center">
                            {row[key] ? (
                              <Check className="h-4 w-4 text-orange-500 mx-auto" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-300 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
            Tez-tez verilən <span className="text-orange-500">suallar</span>
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ml-4",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#F97316] to-[#FACC15] py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">14 günlük pulsuz sınaq</h2>
          <p className="mt-3 text-white/80">Kredit kartı tələb olunmur. Dəqiqələr ərzində başlayın.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
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
          </div>
        </div>
      </section>
    </div>
  )
}
