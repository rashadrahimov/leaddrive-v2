import { MarketingNavbar } from "@/components/marketing/navbar"
import { MarketingFooter } from "@/components/marketing/footer"

export const metadata = {
  title: "LeadDrive CRM — Sales, Marketing, Support & Analytics in One Platform",
  description:
    "AI-native CRM with cost model engine, 7-channel inbox, budgeting & P&L, and dynamic pricing. See your real margins. Close deals with AI.",
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
