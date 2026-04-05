"use client"

import { AnimateIn } from "@/components/marketing/animate-in"
import Link from "next/link"
import { Building2, Target, Users, Globe, Zap, Shield } from "lucide-react"
import { useTranslations } from "next-intl"

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Güvən Technology LLC",
  url: "https://leaddrivecrm.org",
  logo: "https://leaddrivecrm.org/apple-touch-icon.png",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+994-10-531-30-65",
    contactType: "sales",
    availableLanguage: ["az", "ru", "en"],
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bakı",
    addressCountry: "AZ",
  },
  sameAs: [],
}

export default function AboutPage() {
  const t = useTranslations("marketing.about")
  const tContact = useTranslations("marketing.contact")
  const tNav = useTranslations("marketing.nav")
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero */}
      <section className="relative pt-32 pb-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <AnimateIn>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#001E3C] tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-[#001E3C]/60 leading-relaxed">
              {t("subtitle")}
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Mission */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimateIn delay={0.1}>
              <div className="rounded-2xl border border-[#001E3C]/10 bg-[#F3F4F7] p-8">
                <div className="rounded-lg bg-[#0176D3]/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-[#0176D3]" />
                </div>
                <h2 className="text-2xl font-bold text-[#001E3C] mb-4">Missiyamız</h2>
                <p className="text-[#001E3C]/60 leading-relaxed">
                  Hər ölçüdə bizneslərə güclü, Da Vinci-dəstəkli alətlər təqdim etmək — satışdan dəstəyə,
                  maliyyədən analitikaya qədər hər şeyi bir platformada birləşdirmək.
                </p>
              </div>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <div className="rounded-2xl border border-[#001E3C]/10 bg-[#F3F4F7] p-8">
                <div className="rounded-lg bg-[#0176D3]/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-[#0176D3]" />
                </div>
                <h2 className="text-2xl font-bold text-[#001E3C] mb-4">Nə edirik</h2>
                <p className="text-[#001E3C]/60 leading-relaxed">
                  LeadDrive CRM — 128+ funksiya, 16 Da Vinci inteqrasiya, 11 modul.
                  CRM, marketinq avtomatlaşdırması, dəstək, maliyyə və ERP — hamısı bir yerdə.
                </p>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="text-2xl font-bold text-[#001E3C] text-center mb-12">Dəyərlərimiz</h2>
          </AnimateIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Təhlükəsizlik", desc: "Məlumatlarınız şifrələnmiş, izolə edilmiş mühitdə saxlanılır. GDPR uyğunluq." },
              { icon: Users, title: "Müştəri fokus", desc: "Hər qərar müştəri ehtiyaclarına əsaslanır. 24 saat dəstək." },
              { icon: Globe, title: "Yerli və qlobal", desc: "Azərbaycanda yaradılıb, qlobal standartlara uyğun. AZ/RU/EN dil dəstəyi." },
              { icon: Zap, title: "İnnovasiya", desc: "Da Vinci ilə — intellekt platformanın əsasıdır, əlavə deyil." },
              { icon: Building2, title: "Şəffaflıq", desc: "Gizli ödənişlər yoxdur. Nə görürsünüz — onu alırsınız." },
              { icon: Target, title: "Nəticə", desc: "Müştərilərimiz ortalama 34% mənfəət artımı və 60% cavab müddəti azalması əldə edir." },
            ].map((v) => (
              <AnimateIn key={v.title} delay={0.1}>
                <div className="rounded-2xl border border-[#001E3C]/10 bg-[#F3F4F7] p-6 h-full">
                  <v.icon className="h-6 w-6 text-[#0176D3] mb-3" />
                  <h3 className="text-lg font-semibold text-[#001E3C] mb-2">{v.title}</h3>
                  <p className="text-sm text-[#001E3C]/60 leading-relaxed">{v.desc}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <AnimateIn>
            <h2 className="text-3xl font-bold text-[#001E3C] mb-4">{tContact("title")}</h2>
            <p className="text-[#001E3C]/60 mb-8">{tContact("subtitle")}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-[#0176D3] hover:bg-[#0176D3]/90 px-8 py-3 text-sm font-semibold text-white transition-colors"
              >
                {tContact("title")}
              </Link>
              <Link
                href="/demo"
                className="rounded-full border border-[#001E3C]/10 hover:border-[#001E3C]/20 px-8 py-3 text-sm font-semibold text-[#001E3C] transition-colors"
              >
                {tNav("cta")}
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>
    </div>
  )
}
