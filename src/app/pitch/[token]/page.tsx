"use client"

import { useEffect, useState, use } from "react"
import { useTranslations } from "next-intl"

export default function PitchViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const t = useTranslations("pitch")
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
        <div style={{ fontSize: 18, color: "#64748b" }}>{t("loading")}</div>
      </div>
    )
  }

  if (status === "expired" || status === "not_found") {
    return (
      <div style={{ background: "#030712", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 500 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>{status === "expired" ? "\ud83d\udd12" : "\u274c"}</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>
            {status === "expired" ? t("linkExpired") : t("linkNotFound")}
          </h1>
          <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, marginBottom: 32 }}>
            {status === "expired"
              ? t("linkExpiredDesc")
              : t("linkNotFoundDesc")}
          </p>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>{t("requestNewContact")}</p>
          <a href="mailto:info@leaddrivecrm.org?subject=Request%20New%20Presentation%20Link" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0176D3", color: "#fff", padding: "12px 32px", borderRadius: 99, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>
            {t("requestNewLink")}
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
            {t("confidentialDocument")}
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, marginBottom: 16, letterSpacing: -1 }}>LeadDrive CRM</h1>
          <p style={{ fontSize: 16, color: "#94a3b8", lineHeight: 1.6, marginBottom: 8 }}>{t("executiveBriefing")}</p>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
            {t("preparedFor")} <strong style={{ color: "#e2e8f0" }}>{guestName}</strong>
          </p>
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px 24px", marginBottom: 32, fontSize: 13, color: "#fca5a5", lineHeight: 1.6 }}>
            {t("confidentialNotice")}
          </div>
          <button onClick={() => setStatus("viewing")} style={{ background: "linear-gradient(135deg, #0176D3, #1e3a8a)", color: "#fff", padding: "16px 48px", borderRadius: 99, fontSize: 17, fontWeight: 800, border: "none", cursor: "pointer", letterSpacing: 0.5 }}>
            {t("viewPresentation")}
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
      <div style={{ fontSize: 18, color: "#64748b" }}>{t("openingPresentation")}</div>
    </div>
  )
}
