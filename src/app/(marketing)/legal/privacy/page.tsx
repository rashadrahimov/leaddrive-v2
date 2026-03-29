import { AnimateIn } from "@/components/marketing/animate-in"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Məxfilik Siyasəti",
  description: "LeadDrive CRM məxfilik siyasəti — məlumatlarınızın necə toplandığı, istifadə edildiyi və qorunduğu haqqında.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <section className="pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <AnimateIn>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Məxfilik Siyasəti</h1>
            <p className="text-sm text-slate-500 mb-12">Son yenilənmə: 29 Mart 2026</p>
          </AnimateIn>

          <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
            <AnimateIn delay={0.1}>
              <section>
                <h2 className="text-lg font-semibold text-white mb-3">1. Giriş</h2>
                <p>
                  Güvən Technology LLC (&quot;Şirkət&quot;, &quot;biz&quot;) olaraq, LeadDrive CRM platformasından istifadə edən
                  istifadəçilərin (&quot;siz&quot;) məxfiliyinə hörmət edirik. Bu Məxfilik Siyasəti sizin şəxsi məlumatlarınızın
                  necə toplandığını, istifadə edildiyini və qorunduğunu izah edir.
                </p>
              </section>
            </AnimateIn>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. Toplanan məlumatlar</h2>
              <p>Platformadan istifadə zamanı aşağıdakı məlumatlar toplanır:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Qeydiyyat məlumatları: ad, soyad, e-poçt, telefon, şirkət adı</li>
                <li>İstifadə məlumatları: giriş vaxtı, istifadə olunan funksiyalar, brauzer növü</li>
                <li>Biznes məlumatları: platforma daxilində yaradılan məlumatlar (şirkətlər, kontaktlar, sövdələşmələr)</li>
                <li>Texniki məlumatlar: IP ünvanı, cihaz növü, əməliyyat sistemi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Məlumatların istifadəsi</h2>
              <p>Topladığımız məlumatlar aşağıdakı məqsədlərlə istifadə olunur:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Xidmətlərimizin təqdim edilməsi və təkmilləşdirilməsi</li>
                <li>Hesabınızın idarə edilməsi və dəstək göstərilməsi</li>
                <li>Texniki problemlərin həlli</li>
                <li>Qanuni öhdəliklərimizin yerinə yetirilməsi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Məlumatların qorunması</h2>
              <p>
                Bütün məlumatlar şifrələnmiş PostgreSQL verilənlər bazasında saxlanılır. Hər təşkilat üçün
                tam məlumat izolyasiyası təmin edilir (multi-tenant arxitektura). Rol əsaslı giriş nəzarəti
                və audit jurnalı ilə hər dəyişiklik qeydə alınır.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. Üçüncü tərəflər</h2>
              <p>
                Şəxsi məlumatlarınız üçüncü tərəflərə satılmır və ya icarəyə verilmir. Məlumatlar yalnız
                xidmətin təqdim edilməsi üçün zəruri olan hallarda (hosting, e-poçt xidməti) etibarlı
                tərəfdaşlarla paylaşılır.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. Cookies</h2>
              <p>
                Platformamız funksional cookies istifadə edir (giriş sessiyası, dil seçimi). Analitik cookies
                yalnız sizin razılığınızla aktivləşdirilir.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. Hüquqlarınız</h2>
              <p>Siz aşağıdakı hüquqlara maliksiniz:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Şəxsi məlumatlarınıza giriş tələb etmək</li>
                <li>Məlumatlarınızın düzəldilməsini və ya silinməsini tələb etmək</li>
                <li>Məlumatların emalına etiraz etmək</li>
                <li>Məlumatlarınızın daşınmasını tələb etmək</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. Əlaqə</h2>
              <p>
                Məxfilik ilə bağlı suallarınız üçün bizimlə əlaqə saxlayın:
              </p>
              <p className="mt-2">
                📧 info@leaddrivecrm.org<br />
                📱 +994 10 531 30 65<br />
                📍 Bakı, Azərbaycan
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  )
}
