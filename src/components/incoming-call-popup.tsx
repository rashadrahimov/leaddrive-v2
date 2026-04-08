"use client"

import { PhoneIncoming, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface IncomingCallData {
  id: string
  fromNumber: string
  contactId: string | null
  contact: { fullName: string } | null
  status: string
}

interface IncomingCallPopupProps {
  call: IncomingCallData
  onDismiss: () => void
}

export function IncomingCallPopup({ call, onDismiss }: IncomingCallPopupProps) {
  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="bg-card border-2 border-violet-500/50 rounded-xl shadow-2xl p-4 w-80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <PhoneIncoming className="h-4 w-4 text-violet-600 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-medium text-violet-600">Incoming Call</p>
              <p className="text-xs text-muted-foreground">{call.status === "ringing" ? "Ringing..." : "Connected"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <User className="h-5 w-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {call.contact?.fullName || "Unknown Caller"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{call.fromNumber}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {call.contactId ? (
            <Link href={`/contacts/${call.contactId}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <User className="h-3 w-3" /> View Contact
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
              No matching contact
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs" onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}
