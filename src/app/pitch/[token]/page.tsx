"use client"

import { useEffect, useState, use } from "react"

export default function PitchViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [status, setStatus] = useState<"loading" | "landing" | "viewing" | "expired" | "not_found">("loading")
  const [guestName, setGuestName] = useState("")
  const [burned, setBurned] = useState(false)
  useEffect(() => {
    fetch(`/api/v1/pitch/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setGuestName(data.guestName)
          setStatus("landing")
        } else {
          setStatus(data.reason === "used" ? "expired" : "not_found")
        }
      })
      .catch(() => setStatus("not_found"))
  }, [token])

  // Burn on tab close
  useEffect(() => {
    if (status !== "viewing") return
    const burn = () => {
      if (!burned) {
        navigator.sendBeacon(`/api/v1/pitch/${token}/burn`, "")
        setBurned(true)
      }
    }
    window.addEventListener("beforeunload", burn)
    return () => window.removeEventListener("beforeunload", burn)
  }, [status, token, burned])

  if (status === "loading") {
    return (
      <div style={{ background: "#030712", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ fontSize: 18, color: "#64748b" }}>Loading...</div>
      </div>
    )
  }

  if (status === "expired" || status === "not_found") {
    return (
      <div style={{ background: "#030712", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>{status === "expired" ? "\ud83d\udd12" : "\u274c"}</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            {status === "expired" ? "Presentation Link Expired" : "Link Not Found"}
          </h1>
          <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, marginBottom: 32 }}>
            {status === "expired"
              ? "This presentation link has already been viewed. For security reasons, each link can only be used once."
              : "This presentation link is invalid or has been revoked."}
          </p>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>To request a new link, please contact us:</p>
          <a href="mailto:info@leaddrivecrm.org?subject=Request%20New%20Presentation%20Link" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0176D3", color: "#fff", padding: "12px 32px", borderRadius: 99, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
            Request New Link
          </a>
        </div>
      </div>
    )
  }

  if (status === "landing") {
    return (
      <div style={{ background: "#030712", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 600 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 4, color: "#ef4444", marginBottom: 16, textTransform: "uppercase" }}>
            \u26a0\ufe0f Confidential Document
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 16, letterSpacing: -1 }}>LeadDrive CRM</h1>
          <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 }}>Executive Platform Briefing</p>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
            Prepared for: <strong style={{ color: "#e2e8f0" }}>{guestName}</strong>
          </p>
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px 24px", marginBottom: 32, fontSize: 13, color: "#fca5a5", lineHeight: 1.6 }}>
            This presentation contains proprietary and confidential information of G\u00fcv\u0259n Technology LLC.
            Unauthorized reproduction or distribution is strictly prohibited.
            This link will expire after you close this page.
          </div>
          <button onClick={() => setStatus("viewing")} style={{ background: "linear-gradient(135deg, #0176D3, #1e3a8a)", color: "#fff", padding: "16px 48px", borderRadius: 99, fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", letterSpacing: 0.5 }}>
            View Presentation \u2192
          </button>
        </div>
      </div>
    )
  }

  // Viewing — redirect to presentation
  useEffect(() => {
    if (status === "viewing") {
      window.location.href = "/pitch-presentation.html"
    }
  }, [status])

  return (
    <div style={{ background: "#030712", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ fontSize: 18, color: "#64748b" }}>Opening presentation...</div>
    </div>
  )
}
