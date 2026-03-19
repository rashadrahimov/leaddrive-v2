import Link from "next/link"
import { Ticket, BookOpen, MessageSquare, LogOut } from "lucide-react"

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-primary">LeadDrive Portal</span>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/portal" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <Ticket className="h-4 w-4" /> My Tickets
              </Link>
              <Link href="/portal/knowledge-base" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <BookOpen className="h-4 w-4" /> Knowledge Base
              </Link>
              <Link href="/portal/chat" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <MessageSquare className="h-4 w-4" /> Chat
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Elvin Mammadov</span>
            <span className="text-xs text-muted-foreground">ZeytunPharma</span>
            <Link href="/portal/login" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
