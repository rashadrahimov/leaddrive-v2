"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Phone, PhoneOff, FileText, X, Loader2 } from "lucide-react"

interface CallWidgetProps {
  callLogId: string
  phoneNumber: string
  contactName?: string
  onClose: () => void
}

export function CallWidget({ callLogId, phoneNumber, contactName, onClose }: CallWidgetProps) {
  const [status, setStatus] = useState("initiated")
  const [duration, setDuration] = useState(0)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Poll call status every 2 seconds
    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/v1/calls?limit=1`)
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          const call = data.data.find((c: any) => c.id === callLogId)
          if (call) {
            setStatus(call.status)
            if (call.duration) setDuration(call.duration)
            if (["completed", "busy", "no-answer", "failed", "canceled"].includes(call.status)) {
              if (pollRef.current) clearInterval(pollRef.current)
              if (timerRef.current) clearInterval(timerRef.current)
            }
          }
        }
      } catch { /* ignore */ }
    }

    pollRef.current = setInterval(pollStatus, 2000)
    pollStatus()

    // Duration timer
    timerRef.current = setInterval(() => {
      setDuration(d => d + 1)
    }, 1000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callLogId])

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec.toString().padStart(2, "0")}`
  }

  const handleEndCall = async () => {
    try {
      await fetch(`/api/v1/calls/${callLogId}/end`, { method: "POST" })
    } catch { /* ignore — will be caught by status poll */ }
    setStatus("completed")
    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const handleSaveNotes = async () => {
    if (!notes.trim()) return
    try {
      await fetch(`/api/v1/calls/${callLogId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      setShowNotes(false)
    } catch { /* ignore */ }
  }

  const isActive = ["initiated", "ringing", "in-progress"].includes(status)
  const statusColors: Record<string, string> = {
    initiated: "text-yellow-500",
    ringing: "text-blue-500",
    "in-progress": "text-green-500",
    completed: "text-muted-foreground",
    busy: "text-red-500",
    "no-answer": "text-orange-500",
    failed: "text-red-500",
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-2xl z-50 border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Phone className={`h-5 w-5 ${isActive ? "animate-pulse text-green-500" : "text-muted-foreground"}`} />
            <span className="font-semibold text-sm">
              {isActive ? "Active Call" : "Call Ended"}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {contactName && <div className="font-medium">{contactName}</div>}
          <div className="text-sm text-muted-foreground">{phoneNumber}</div>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium capitalize ${statusColors[status] || ""}`}>
              {status === "in-progress" ? "Connected" : status}
            </span>
            {isActive && (
              <span className="text-sm font-mono">{formatDuration(duration)}</span>
            )}
            {!isActive && duration > 0 && (
              <span className="text-sm text-muted-foreground">{formatDuration(duration)}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {isActive && (
            <Button variant="destructive" size="sm" className="flex-1" onClick={handleEndCall}>
              <PhoneOff className="h-4 w-4 mr-1" /> End
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowNotes(!showNotes)}>
            <FileText className="h-4 w-4 mr-1" /> Note
          </Button>
        </div>

        {showNotes && (
          <div className="mt-3 space-y-2">
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add call notes..."
              className="text-sm"
              rows={3}
            />
            <Button size="sm" onClick={handleSaveNotes} disabled={!notes.trim()}>
              Save Note
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Click-to-call button component
export function ClickToCallButton({ phone, contactId, contactName }: {
  phone: string
  contactId?: string
  contactName?: string
}) {
  const [calling, setCalling] = useState(false)
  const [activeCall, setActiveCall] = useState<{ callLogId: string } | null>(null)

  const handleCall = async () => {
    setCalling(true)
    try {
      const res = await fetch("/api/v1/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toNumber: phone, contactId }),
      })
      const data = await res.json()
      if (data.success) {
        setActiveCall({ callLogId: data.callLogId })
      } else {
        alert(data.error || "Failed to initiate call")
      }
    } catch (e) {
      alert("Failed to initiate call")
    } finally {
      setCalling(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCall}
        disabled={calling}
        title={`Call ${phone}`}
        className="h-8 w-8"
      >
        {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4 text-green-600" />}
      </Button>
      {activeCall && (
        <CallWidget
          callLogId={activeCall.callLogId}
          phoneNumber={phone}
          contactName={contactName}
          onClose={() => setActiveCall(null)}
        />
      )}
    </>
  )
}
