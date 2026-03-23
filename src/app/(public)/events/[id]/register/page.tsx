"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

const TYPE_EMOJI: Record<string, string> = {
  conference: "🎤", webinar: "💻", workshop: "🔧", meetup: "☕", exhibition: "🏛️", other: "📋",
}

export default function EventRegistrationPage() {
  const params = useParams()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", notes: "",
  })

  useEffect(() => {
    fetch(`/api/v1/public/events/${params.id}/register`)
      .then(r => r.json())
      .then(json => { if (json.success) setEvent(json.data) })
      .finally(() => setLoading(false))
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return setError("Name and email are required")
    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/v1/public/events/${params.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Registration failed")
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally { setSubmitting(false) }
  }

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800">Event Not Found</h1>
          <p className="text-gray-500 mt-2">This event doesn't exist or has been removed.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Attendance Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you! Your attendance for <strong>{event.name}</strong> is confirmed. See you there!
          </p>
          <div className="bg-white rounded-2xl shadow-lg p-6 text-left space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-xs text-gray-500 uppercase">Date</p>
                <p className="font-semibold">{new Date(event.startDate).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}</p>
              </div>
            </div>
            {event.location && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Location</p>
                  <p className="font-semibold">{event.location}</p>
                </div>
              </div>
            )}
            {event.isOnline && event.meetingUrl && (
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔗</span>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Join Online</p>
                  <a href={event.meetingUrl} className="font-semibold text-indigo-600 hover:underline" target="_blank">{event.meetingUrl}</a>
                </div>
              </div>
            )}
          </div>

          {/* Calendar note */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
            <p className="font-semibold mb-1">📅 Check your email!</p>
            <p className="text-amber-700 text-xs">We've sent a confirmation email with a calendar invitation attached. Open the .ics file to add this event to your calendar automatically.</p>
          </div>
        </div>
      </div>
    )
  }

  const canRegister = event.canRegister && !event.isFull
  const spotsLeft = event.maxParticipants ? event.maxParticipants - event.registeredCount : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white">
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 text-center">
          <div className="text-5xl mb-4">{TYPE_EMOJI[event.type] || "📋"}</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{event.name}</h1>
          <div className="flex items-center justify-center gap-4 text-sm opacity-90 flex-wrap">
            <span className="flex items-center gap-1.5">
              📅 {new Date(event.startDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            {event.location && <span className="flex items-center gap-1.5">📍 {event.location}</span>}
            {event.isOnline && <span className="flex items-center gap-1.5">🌐 Online</span>}
          </div>
          {spotsLeft !== null && spotsLeft > 0 && (
            <div className="mt-4 inline-block bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              {spotsLeft} spots remaining
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-5 gap-6">
          {/* Registration Form */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Register Now</h2>
              <p className="text-sm text-gray-500 mb-6">Fill in your details to secure your spot</p>

              {!canRegister ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">{event.isFull ? "😔" : "🔒"}</div>
                  <h3 className="text-lg font-bold text-gray-700">
                    {event.isFull ? "Event is Full" : "Registration Closed"}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {event.isFull ? "All spots have been taken." : "Registration is not available at this time."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text" required value={form.name} onChange={e => set("name", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email" required value={form.email} onChange={e => set("email", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder="+994..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text" value={form.company} onChange={e => set("company", e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                        placeholder="Your company"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                      placeholder="Dietary requirements, accessibility needs..."
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={submitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-60"
                  >
                    {submitting ? "Registering..." : "Register for Event"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Event Info Sidebar */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h3 className="font-bold text-gray-800 mb-3">Event Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="text-gray-500 text-xs">Date & Time</p>
                    <p className="font-medium">{new Date(event.startDate).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}</p>
                    {event.endDate && (
                      <p className="text-gray-500 text-xs mt-0.5">
                        to {new Date(event.endDate).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" })}
                      </p>
                    )}
                  </div>
                </div>
                {event.location && (
                  <div className="flex gap-3">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="text-gray-500 text-xs">Location</p>
                      <p className="font-medium">{event.location}</p>
                    </div>
                  </div>
                )}
                {event.isOnline && (
                  <div className="flex gap-3">
                    <span className="text-lg">🌐</span>
                    <div>
                      <p className="text-gray-500 text-xs">Format</p>
                      <p className="font-medium">Online Event</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <span className="text-lg">👥</span>
                  <div>
                    <p className="text-gray-500 text-xs">Registered</p>
                    <p className="font-medium">
                      {event.registeredCount} participants
                      {event.maxParticipants ? ` / ${event.maxParticipants} max` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {event.description && (
              <div className="bg-white rounded-2xl shadow-lg p-5">
                <h3 className="font-bold text-gray-800 mb-2">About</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {event.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag: string) => (
                  <span key={tag} className="bg-white shadow-sm px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-8 text-xs text-gray-400">
          Powered by LeadDrive CRM
        </div>
      </div>
    </div>
  )
}
