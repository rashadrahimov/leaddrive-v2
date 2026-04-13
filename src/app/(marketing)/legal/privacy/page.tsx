import { AnimateIn } from "@/components/marketing/animate-in"
import type { Metadata } from "next"
import { COMPANY_EMAIL } from "@/lib/constants"
import { getTranslations } from "next-intl/server"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "LeadDrive CRM privacy policy — how your data is collected, used and protected.",
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy")
  return (
    <div className="min-h-screen bg-white">
      <section className="pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <AnimateIn>
            <h1 className="text-4xl font-bold text-[#001E3C] tracking-tight mb-2">{t("title")}</h1>
            <p className="text-sm text-[#001E3C]/40 mb-12">{t("lastUpdated")}</p>
          </AnimateIn>

          <div className="prose max-w-none space-y-8 text-[#001E3C]/70 text-sm leading-relaxed">
            <AnimateIn delay={0.1}>
              <section>
                <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s1")}</h2>
                <p>{t("p1")}</p>
              </section>
            </AnimateIn>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s2")}</h2>
              <p>{t("p2")}</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>{t("p2_l1")}</li>
                <li>{t("p2_l2")}</li>
                <li>{t("p2_l3")}</li>
                <li>{t("p2_l4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s3")}</h2>
              <p>{t("p3")}</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>{t("p3_l1")}</li>
                <li>{t("p3_l2")}</li>
                <li>{t("p3_l3")}</li>
                <li>{t("p3_l4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s4")}</h2>
              <p>{t("p4")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s5")}</h2>
              <p>{t("p5")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s6")}</h2>
              <p>{t("p6")}</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s7")}</h2>
              <p>{t("p7")}</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>{t("p7_l1")}</li>
                <li>{t("p7_l2")}</li>
                <li>{t("p7_l3")}</li>
                <li>{t("p7_l4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s8")}</h2>
              <p>{t("p8")}</p>
              <p className="mt-2">
                {COMPANY_EMAIL}<br />
                LeadDrive Inc., Warsaw, Poland
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
