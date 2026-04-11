import { AnimateIn } from "@/components/marketing/animate-in"
import type { Metadata } from "next"
import { COMPANY_EMAIL, COMPANY_PHONE_FORMATTED } from "@/lib/constants"
import { getTranslations } from "next-intl/server"

export const metadata: Metadata = {
  title: "İstifadə Şərtləri",
  description: "LeadDrive CRM istifadə şərtləri — platformadan istifadə qaydaları və şərtlər.",
}

export default async function TermsPage() {
  const t = await getTranslations("terms")
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
                <p>
                  Bu İstifadə Şərtləri Güvən Technology LLC (&quot;Şirkət&quot;) tərəfindən təqdim olunan LeadDrive CRM
                  platformasından (&quot;Xidmət&quot;) istifadə şərtlərini müəyyən edir. Xidmətdən istifadə etməklə
                  siz bu şərtləri qəbul edirsiniz.
                </p>
              </section>
            </AnimateIn>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s2")}</h2>
              <p>
                LeadDrive CRM bulud əsaslı müştəri münasibətləri idarəetmə platformasıdır. Xidmət satış,
                marketinq, dəstək, maliyyə və analitika modullarını əhatə edir.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s3")}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Qeydiyyat zamanı doğru və aktual məlumatlar təqdim etməlisiniz</li>
                <li>Hesab təhlükəsizliyinə görə siz məsuliyyət daşıyırsınız</li>
                <li>Hesabınızı üçüncü tərəflərə ötürə bilməzsiniz</li>
                <li>18 yaşdan kiçik şəxslər xidmətdən istifadə edə bilməz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s4")}</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Ödəniş bank köçürməsi ilə həyata keçirilir</li>
                <li>Abunə aylıq və ya illik olaraq yenilənir</li>
                <li>14 günlük pulsuz sınaq müddəti təqdim olunur</li>
                <li>Ləğv etmə növbəti hesablama dövrünün sonunda qüvvəyə minir</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s5")}</h2>
              <p>
                Platformada yaratdığınız bütün məlumatlar (şirkətlər, kontaktlar, sövdələşmələr, fakturalar və s.)
                sizin mülkiyyətinizdədir. Abunəliyi ləğv etdikdə məlumatlarınızı ixrac edə bilərsiniz.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s6")}</h2>
              <p>Aşağıdakılar qadağandır:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Platformanın qeyri-qanuni məqsədlərlə istifadəsi</li>
                <li>Xidmətin təhlükəsizliyini pozmaq cəhdləri</li>
                <li>Digər istifadəçilərin məlumatlarına icazəsiz giriş</li>
                <li>Platformanın reverse engineering və ya kopyalanması</li>
                <li>Avtomatlaşdırılmış scraping və ya həddindən artıq yükləmə</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s7")}</h2>
              <p>
                99.9% uptime hədəfləyirik, lakin texniki xidmət və ya fövqəladə hallar zamanı
                qısamüddətli fasilələr ola bilər. Planlaşdırılmış texniki xidmət haqqında əvvəlcədən
                xəbərdarlıq edilir.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s8")}</h2>
              <p>
                Şirkət xidmətdən istifadə nəticəsində yarana biləcək dolayı zərərlərə görə məsuliyyət
                daşımır. Birbaşa zərərlər üçün məsuliyyət ödənilmiş abunə haqqı ilə məhdudlaşdırılır.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s9")}</h2>
              <p>
                Bu şərtlər vaxtaşırı yenilənə bilər. Əhəmiyyətli dəyişikliklər haqqında e-poçt vasitəsilə
                xəbərdarlıq ediləcək. Dəyişikliklərdən sonra xidmətdən istifadəyə davam etmək yeni şərtlərin
                qəbulu deməkdir.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#001E3C] mb-3">{t("s10")}</h2>
              <p>
                Bu şərtlərlə bağlı suallarınız üçün:
              </p>
              <p className="mt-2">
                {COMPANY_EMAIL}<br />
                {COMPANY_PHONE_FORMATTED}<br />
                Güvən Technology LLC, Bakı, Azərbaycan
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
