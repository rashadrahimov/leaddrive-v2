"use client"

import { useState } from "react"
import { AnimateIn } from "@/components/marketing/animate-in"
import { Mail, Phone, MapPin, Send, Building2, Clock } from "lucide-react"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative pt-32 pb-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <AnimateIn>
            <h1 className="text-4xl sm:text-5xl font-bold text-[#001E3C] tracking-tight">
              Bizimlə əlaqə saxlayın
            </h1>
            <p className="mt-4 text-lg text-[#001E3C]/60">
              Suallarınız var? Komandamız 24 saat ərzində cavab verir.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Content */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-8">
              <AnimateIn delay={0.1}>
                <div className="rounded-2xl border border-[#001E3C]/10 bg-[#F3F4F7] p-8 space-y-6">
                  <h2 className="text-lg font-semibold text-[#001E3C]">Əlaqə məlumatları</h2>
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-lg bg-[#0176D3]/10 p-2">
                        <Mail className="h-5 w-5 text-[#0176D3]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#001E3C]">E-poçt</p>
                        <a href="mailto:info@leaddrivecrm.org" className="text-sm text-[#001E3C]/60 hover:text-[#0176D3] transition-colors">
                          info@leaddrivecrm.org
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-lg bg-[#0176D3]/10 p-2">
                        <Phone className="h-5 w-5 text-[#0176D3]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#001E3C]">Telefon</p>
                        <a href="tel:+994105313065" className="text-sm text-[#001E3C]/60 hover:text-[#0176D3] transition-colors">
                          +994 10 531 30 65
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-lg bg-[#0176D3]/10 p-2">
                        <MapPin className="h-5 w-5 text-[#0176D3]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#001E3C]">Ünvan</p>
                        <p className="text-sm text-[#001E3C]/60">Bakı, Azərbaycan</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 rounded-lg bg-[#0176D3]/10 p-2">
                        <Clock className="h-5 w-5 text-[#0176D3]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#001E3C]">İş saatları</p>
                        <p className="text-sm text-[#001E3C]/60">B.e — Cümə: 09:00 — 18:00</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimateIn>

              <AnimateIn delay={0.2}>
                <div className="rounded-2xl border border-[#001E3C]/10 bg-[#F3F4F7] p-8">
                  <h2 className="text-lg font-semibold text-[#001E3C] mb-4">Tez-tez verilən suallar</h2>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-[#001E3C]">Demo tələb edə bilərəm?</p>
                      <p className="text-[#001E3C]/60 mt-1">Bəli! <a href="/demo" className="text-[#0176D3] hover:underline">Demo səhifəsinə</a> keçin.</p>
                    </div>
                    <div>
                      <p className="font-medium text-[#001E3C]">Pulsuz sınaq var?</p>
                      <p className="text-[#001E3C]/60 mt-1">14 günlük pulsuz sınaq, kredit kartı tələb olunmur.</p>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <AnimateIn delay={0.15}>
                <div className="rounded-2xl border border-[#001E3C]/10 bg-[#F3F4F7] p-8">
                  {submitted ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <Send className="h-6 w-6 text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-[#001E3C]">Mesajınız göndərildi!</h3>
                      <p className="mt-2 text-[#001E3C]/60">24 saat ərzində sizinlə əlaqə saxlayacağıq.</p>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-[#001E3C] mb-6">Mesaj göndərin</h2>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          setLoading(true)
                          const form = e.target as HTMLFormElement
                          const data = Object.fromEntries(new FormData(form))
                          try {
                            await fetch("/api/v1/demo-request", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(data),
                            })
                          } catch {}
                          setSubmitted(true)
                        }}
                        className="space-y-5"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#001E3C] mb-1.5">Ad, Soyad *</label>
                            <input
                              name="name"
                              required
                              className="w-full rounded-lg border border-[#001E3C]/10 bg-white px-4 py-2.5 text-sm text-[#001E3C] placeholder-[#001E3C]/40 focus:border-[#0176D3] focus:outline-none focus:ring-1 focus:ring-[#0176D3]/20"
                              placeholder="Adınız"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#001E3C] mb-1.5">Şirkət</label>
                            <input
                              name="company"
                              className="w-full rounded-lg border border-[#001E3C]/10 bg-white px-4 py-2.5 text-sm text-[#001E3C] placeholder-[#001E3C]/40 focus:border-[#0176D3] focus:outline-none focus:ring-1 focus:ring-[#0176D3]/20"
                              placeholder="Şirkət adı"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#001E3C] mb-1.5">E-poçt *</label>
                            <input
                              name="email"
                              type="email"
                              required
                              className="w-full rounded-lg border border-[#001E3C]/10 bg-white px-4 py-2.5 text-sm text-[#001E3C] placeholder-[#001E3C]/40 focus:border-[#0176D3] focus:outline-none focus:ring-1 focus:ring-[#0176D3]/20"
                              placeholder="email@example.com"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#001E3C] mb-1.5">Telefon</label>
                            <input
                              name="phone"
                              type="tel"
                              className="w-full rounded-lg border border-[#001E3C]/10 bg-white px-4 py-2.5 text-sm text-[#001E3C] placeholder-[#001E3C]/40 focus:border-[#0176D3] focus:outline-none focus:ring-1 focus:ring-[#0176D3]/20"
                              placeholder="+994 XX XXX XX XX"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#001E3C] mb-1.5">Mesajınız *</label>
                          <textarea
                            name="message"
                            required
                            rows={5}
                            className="w-full rounded-lg border border-[#001E3C]/10 bg-white px-4 py-2.5 text-sm text-[#001E3C] placeholder-[#001E3C]/40 focus:border-[#0176D3] focus:outline-none focus:ring-1 focus:ring-[#0176D3]/20 resize-none"
                            placeholder="Sizə necə kömək edə bilərik?"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full rounded-full bg-[#0176D3] hover:bg-[#0176D3]/90 px-6 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Göndər
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </AnimateIn>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
