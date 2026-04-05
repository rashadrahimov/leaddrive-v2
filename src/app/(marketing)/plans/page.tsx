"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { APP_URL } from "@/lib/domains"
import { plans, faqs } from "@/lib/marketing-data"
import { Check, Minus, ArrowRight, ChevronDown } from "lucide-react"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

/* ─── full feature comparison matrix ─── */
type FeatureRow = { label: string; starter: boolean; business: boolean; professional: boolean; enterprise: boolean; custom?: boolean }

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
    title: "Da Vinci",
    rows: [
      { label: "Da Vinci skorinqi", starter: false, business: false, professional: true, enterprise: true },
      { label: "Da Vinci Satış Köməkçisi", starter: false, business: false, professional: false, enterprise: true },
      { label: "Da Vinci Komanda Mərkəzi", starter: false, business: false, professional: false, enterprise: true },
      { label: "Da Vinci Dəstək Agenti", starter: false, business: false, professional: false, enterprise: true },
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

const planNames = ["Starter", "Business", "Professional", "Enterprise", "50+"] as const
const planKeys = ["starter", "business", "professional", "enterprise", "custom"] as const

export default function PricingPage() {
  const tp = useTranslations("marketing.pricing")
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")
  const isAnnual = billing === "annual"

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-white via-[#F3F4F7] to-white pt-20 pb-16">
        <div className="mx-auto max-w-5xl px-4 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-[#001E3C]">
            Şəffaf <span className="text-[#0176D3]">qiymətlər</span>
          </h1>
          <p className="mt-4 text-lg text-[#001E3C]/60 max-w-2xl mx-auto">
            Pulsuz sınaq ilə başlayın. Gizli ödənişlər yoxdur. İstədiyiniz zaman yüksəldin.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white rounded-full border border-[#001E3C]/10 p-1 shadow-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                !isAnnual
                  ? "bg-[#0176D3] text-white shadow-sm"
                  : "text-[#001E3C]/60 hover:text-[#001E3C]"
              )}
            >
              Aylıq
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                isAnnual
                  ? "bg-[#0176D3] text-white shadow-sm"
                  : "text-[#001E3C]/60 hover:text-[#001E3C]"
              )}
            >
              İllik
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isAnnual
                  ? "bg-white/20 text-white"
                  : "bg-green-50 text-green-600"
              )}>
                -10%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16 -mt-4">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {plans.map((plan) => {
              const perUser = isAnnual ? plan.pricePerUserAnnual : plan.pricePerUser
              const total = perUser !== null && plan.maxUsers !== null
                ? perUser * plan.maxUsers
                : null

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-xl border p-6 flex flex-col bg-white",
                    plan.popular
                      ? "border-[#0176D3] shadow-lg shadow-[#0176D3]/10 ring-1 ring-[#0176D3]"
                      : "border-[#001E3C]/10"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#0176D3] text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Ən Populyar
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-[#001E3C]">{plan.name}</h3>
                  <p className="text-sm text-[#001E3C]/60 mt-1 mb-4">{plan.tagline}</p>

                  {/* Price — per-user focused */}
                  <div className="mb-1">
                    {perUser !== null ? (
                      <div className="flex items-baseline gap-1.5">
                        {isAnnual && plan.pricePerUser !== null && (
                          <span className="text-base text-[#001E3C]/30 line-through">{plan.pricePerUser}</span>
                        )}
                        <span className="text-2xl font-semibold text-[#001E3C]">{perUser}</span>
                        <span className="text-xs text-[#001E3C]/40">AZN / istifadəçi / ay</span>
                      </div>
                    ) : (
                      <span className="text-lg font-semibold text-[#001E3C]">Fərdi qiymət</span>
                    )}
                  </div>

                  {/* Total cost — subtle */}
                  {total !== null && plan.maxUsers !== null ? (
                    <p className="text-xs text-[#001E3C]/40 mb-4">
                      {plan.maxUsers} istifadəçi: {total.toLocaleString()} AZN/ay
                    </p>
                  ) : (
                    <p className="text-xs text-[#001E3C]/40 mb-4">Danışıqla müəyyən edilir</p>
                  )}

                  <ul className="space-y-2 flex-1">
                    {plan.features.map((fKey) => (
                      <li key={fKey} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-[#0176D3] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-[#001E3C]/80">{tp(`features.${fKey}`)}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className={cn(
                      "mt-6 block text-center py-2.5 px-4 rounded-full text-sm font-semibold transition-colors",
                      plan.popular
                        ? "bg-[#0176D3] text-white hover:bg-[#0176D3]/90"
                        : "bg-[#0176D3]/5 text-[#001E3C] hover:bg-[#0176D3]/10"
                    )}
                  >
                    {plan.id === "custom" ? "Əlaqə saxlayın" : "Demo tələb et"}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-[#F3F4F7] py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="text-3xl font-bold text-[#001E3C] text-center mb-12">
            Bütün xüsusiyyətləri <span className="text-[#0176D3]">müqayisə edin</span>
          </h2>

          <div className="bg-white rounded-xl border border-[#001E3C]/10 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[640px]">
              {/* Header */}
              <thead>
                <tr className="border-b border-[#001E3C]/10">
                  <th className="text-left py-4 px-6 text-sm font-medium text-[#001E3C]/60 w-[30%]">Xüsusiyyət</th>
                  {planNames.map((name, i) => (
                    <th key={name} className="py-4 px-4 text-center">
                      <span className={cn(
                        "text-sm font-bold",
                        i === 2 ? "text-[#0176D3]" : "text-[#001E3C]"
                      )}>{name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <Fragment key={section.title}>
                    <tr className="bg-[#F3F4F7]/60">
                      <td colSpan={6} className="py-3 px-6 text-sm font-bold text-[#001E3C]">
                        {section.title}
                      </td>
                    </tr>
                    {section.rows.map((row) => (
                      <tr key={row.label} className="border-b border-[#001E3C]/5 last:border-0">
                        <td className="py-3 px-6 text-sm text-[#001E3C]/80">{row.label}</td>
                        {planKeys.map((key) => {
                          // custom (50+) inherits enterprise features
                          const value = key === "custom" ? (row.custom ?? row.enterprise) : row[key]
                          return (
                            <td key={key} className="py-3 px-4 text-center">
                              {value ? (
                                <Check className="h-4 w-4 text-[#0176D3] mx-auto" />
                              ) : (
                                <Minus className="h-4 w-4 text-[#001E3C]/20 mx-auto" />
                              )}
                            </td>
                          )
                        })}
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
          <h2 className="text-3xl font-bold text-[#001E3C] text-center mb-12">
            Tez-tez verilən <span className="text-[#0176D3]">suallar</span>
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-[#001E3C]/10 rounded-lg bg-white overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-[#001E3C]">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[#001E3C]/40 transition-transform flex-shrink-0 ml-4",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-[#001E3C]/60 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#0176D3] to-[#014486] py-16">
        <div className="mx-auto max-w-4xl px-4 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">14 günlük pulsuz sınaq</h2>
          <p className="mt-3 text-white/80">Kredit kartı tələb olunmur. Dəqiqələr ərzində başlayın.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={`${APP_URL}/register`}>
              <ShimmerButton
                background="rgba(255,255,255,0.15)"
                shimmerColor="rgba(255,255,255,0.4)"
                borderRadius="9999px"
                className="text-base font-semibold px-8 py-3.5 border-white/30"
              >
                Pulsuz sınaq başlat
                <ArrowRight className="ml-2 h-4 w-4" />
              </ShimmerButton>
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-full hover:bg-white/10 transition-all"
            >
              Satışla danışın
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
