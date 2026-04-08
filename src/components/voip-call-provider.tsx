"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { IncomingCallPopup } from "./incoming-call-popup"

interface ActiveCall {
  id: string
  direction: string
  status: string
  fromNumber: string
  toNumber: string
  contactId: string | null
  contact: { fullName: string } | null
}

interface VoipContextValue {
  activeCalls: ActiveCall[]
}

const VoipContext = createContext<VoipContextValue>({ activeCalls: [] })

export function useVoip() {
  return useContext(VoipContext)
}

const POLL_INTERVAL = 5000

export function VoipCallProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const fetchActiveCalls = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch("/api/v1/calls/active")
      if (res.ok) {
        const json = await res.json()
        setActiveCalls(json.data || [])
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [session])

  useEffect(() => {
    if (!session?.user) return

    fetchActiveCalls()
    intervalRef.current = setInterval(fetchActiveCalls, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session, fetchActiveCalls])

  const handleDismiss = useCallback((callId: string) => {
    setDismissedIds(prev => new Set(prev).add(callId))
  }, [])

  // Show popup for inbound ringing calls not yet dismissed
  const incomingCall = activeCalls.find(
    c => c.direction === "inbound" && c.status === "ringing" && !dismissedIds.has(c.id)
  )

  return (
    <VoipContext.Provider value={{ activeCalls }}>
      {children}
      {incomingCall && (
        <IncomingCallPopup
          call={incomingCall}
          onDismiss={() => handleDismiss(incomingCall.id)}
        />
      )}
    </VoipContext.Provider>
  )
}
