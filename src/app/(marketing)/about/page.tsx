import { AnimateIn } from "@/components/marketing/animate-in"
import Link from "next/link"
import { Building2, Target, Users, Globe, Zap, Shield } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Haqqımızda",
  description: "Güvən Technology LLC — Bakıda yerləşən texnologiya şirkəti. LeadDrive CRM-in yaradıcıları.",
  openGraph: {
    title: "Haqqımızda | LeadDrive CRM",
    description: "Güvən Technology LLC — Bakıda yerləşən texnologiya şirkəti.",
  },
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Güvən Technology LLC",
  url: "https://leaddrive.cloud",
  logo: "https://leaddrive.cloud/apple-touch-icon.png",
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
  return (
    <div className="min-h-screen bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero */}
      <section className="relative pt-32 pb-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <AnimateIn>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              Haqqımızda
            </h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">
              Güvən Technology LLC — Bakıda yerləşən texnologiya şirkəti.
              Biznesin rəqəmsal transformasiyasını sürətləndiririk.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Mission */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimateIn delay={0.1}>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
                <div className="rounded-lg bg-orange-500/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Missiyamız</h2>
                <p className="text-slate-400 leading-relaxed">
                  Hər ölçüdə bizneslərə güclü, AI-dəstəkli alətlər təqdim etmək — satışdan dəstəyə,
                  maliyyədən analitikaya qədər hər şeyi bir platformada birləşdirmək.
                </p>
              </div>
            </AnimateIn>
            <AnimateIn delay={0.2}>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
                <div className="rounded-lg bg-orange-500/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Nə edirik</h2>
                <p className="text-slate-400 leading-relaxed">
                  LeadDrive CRM — 128+ funksiya, 16 AI inteqrasiya, 11 modul.
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
            <h2 className="text-2xl font-bold text-white text-center mb-12">Dəyərlərimiz</h2>
          </AnimateIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Təhlükəsizlik", desc: "Məlumatlarınız şifrələnmiş, izolə edilmiş mühitdə saxlanılır. GDPR uyğunluq." },
              { icon: Users, title: "Müştəri fokus", desc: "Hər qərar müştəri ehtiyaclarına əsaslanır. 24 saat dəstək." },
              { icon: Globe, title: "Yerli və qlobal", desc: "Azərbaycanda yaradılıb, qlobal standartlara uyğun. AZ/RU/EN dil dəstəyi." },
              { icon: Zap, title: "İnnovasiya", desc: "Da Vinci AI ilə süni intellekt platformanın əsasıdır, əlavə deyil." },
              { icon: Building2, title: "Şəffaflıq", desc: "Gizli ödənişlər yoxdur. Nə görürsünüz — onu alırsınız." },
              { icon: Target, title: "Nəticə", desc: "Müştərilərimiz ortalama 34% mənfəət artımı və 60% cavab müddəti azalması əldə edir." },
            ].map((v) => (
              <AnimateIn key={v.title} delay={0.1}>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 h-full">
                  <v.icon className="h-6 w-6 text-orange-400 mb-3" />
                  <h3 className="text-lg font-semibold text-white mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{v.desc}</p>
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
            <h2 className="text-3xl font-bold text-white mb-4">Bizimlə əlaqə saxlayın</h2>
            <p className="text-slate-400 mb-8">Suallarınız var? Komandamız kömək etməyə hazırdır.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-orange-500 hover:bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition-colors"
              >
                Əlaqə saxlayın
              </Link>
              <Link
                href="/demo"
                className="rounded-full border border-slate-700 hover:border-slate-500 px-8 py-3 text-sm font-semibold text-white transition-colors"
              >
                Demo tələb edin
              </Link>
            </div>
          </AnimateIn>
        </div>
      </section>
    </div>
  )
}
