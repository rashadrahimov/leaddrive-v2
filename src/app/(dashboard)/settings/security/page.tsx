"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, ArrowLeft, Smartphone } from "lucide-react"
import Link from "next/link"

export default function SecuritySettingsPage() {
  const t = useTranslations("settings")
  const tc = useTranslations("common")
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<"status" | "setup" | "verify" | "backup" | "disable">("status")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/v1/auth/2fa")
      .then(r => r.json())
      .then(j => {
        if (j.success) setEnabled(j.data.enabled)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSetup = async () => {
    setProcessing(true)
    setError("")
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      })
      const json = await res.json()
      if (json.success) {
        setQrCode(json.data.qrCode)
        setSecret(json.data.secret)
        setBackupCodes(json.data.backupCodes)
        setStep("setup")
      } else {
        setError(json.error)
      }
    } catch { setError("Failed to setup 2FA") }
    finally { setProcessing(false) }
  }

  const handleVerify = async () => {
    if (code.length !== 6) { setError("Enter 6-digit code"); return }
    setProcessing(true)
    setError("")
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code }),
      })
      const json = await res.json()
      if (json.success) {
        setEnabled(true)
        setStep("backup")
      } else {
        setError(json.error || "Invalid code")
      }
    } catch { setError("Verification failed") }
    finally { setProcessing(false) }
  }

  const handleDisable = async () => {
    if (code.length !== 6) { setError("Enter 6-digit code"); return }
    setProcessing(true)
    setError("")
    try {
      const res = await fetch("/api/v1/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code }),
      })
      const json = await res.json()
      if (json.success) {
        setEnabled(false)
        setStep("status")
        setCode("")
      } else {
        setError(json.error || "Invalid code")
      }
    } catch { setError("Failed to disable") }
    finally { setProcessing(false) }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("security")}</h1>
          <p className="text-sm text-muted-foreground">{t("securityDesc")}</p>
        </div>
      </div>

      {/* Status card */}
      {step === "status" && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${enabled ? "bg-green-100" : "bg-orange-100"}`}>
                {enabled ? <ShieldCheck className="h-7 w-7 text-green-600" /> : <ShieldOff className="h-7 w-7 text-orange-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold">{enabled ? "2FA Enabled" : "2FA Not Enabled"}</h2>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? "Your account is protected with two-factor authentication."
                    : "Add an extra layer of security to your account."}
                </p>
              </div>
              <Badge className={`ml-auto ${enabled ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {enabled ? tc("active") : tc("inactive")}
              </Badge>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">How it works</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    After enabling 2FA, you'll need to enter a 6-digit code from your authenticator app
                    (Google Authenticator, Authy, Microsoft Authenticator) every time you sign in.
                  </p>
                </div>
              </div>
            </div>

            {enabled ? (
              <Button variant="destructive" onClick={() => { setStep("disable"); setCode(""); setError("") }}>
                <ShieldOff className="h-4 w-4 mr-2" /> Disable 2FA
              </Button>
            ) : (
              <Button onClick={handleSetup} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Enable 2FA
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup step — QR code */}
      {step === "setup" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Scan QR Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>

            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl shadow-inner border">
                {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />}
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground mb-1">Can't scan? Enter this key manually:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-background rounded px-2 py-1 flex-1 overflow-hidden text-ellipsis">
                  {secret}
                </code>
                <Button variant="ghost" size="sm" onClick={copySecret}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Step 2: Enter verification code</p>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl font-mono tracking-[0.5em] border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={6}
                autoFocus
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("status"); setCode(""); setError("") }}>Cancel</Button>
              <Button onClick={handleVerify} disabled={processing || code.length !== 6} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Verify & Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup codes */}
      {step === "backup" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              2FA Enabled Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Save your backup codes!</p>
              <p className="text-xs text-amber-700">
                Store these codes safely. If you lose your authenticator app, you can use these codes to sign in.
                Each code can only be used once.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((bc, i) => (
                <div key={i} className="font-mono text-sm bg-muted/50 rounded-lg px-3 py-2 text-center">
                  {bc}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(backupCodes.join("\n"))
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied!" : "Copy All Codes"}
            </Button>

            <Button onClick={() => setStep("status")} className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Disable step */}
      {step === "disable" && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Disable 2FA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your current 6-digit code from the authenticator app to disable 2FA.
            </p>

            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
              maxLength={6}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("status"); setCode(""); setError("") }}>Cancel</Button>
              <Button variant="destructive" onClick={handleDisable} disabled={processing || code.length !== 6} className="flex-1">
                {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                Disable 2FA
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
