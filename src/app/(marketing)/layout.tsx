import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"

export const metadata = {
  title: "LeadDrive CRM — Satış, Marketinq, Dəstək və Analitika Bir Platformada",
  description:
    "Xərc modeli mühərriki, 7 kanallı gələn qutusu, büdcələşdirmə və P&L, dinamik qiymətləndirmə ilə süni intellektli CRM. Real marjalarınızı görün.",
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="light min-h-screen bg-white text-foreground" style={{ colorScheme: "light" }}>
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  )
}
