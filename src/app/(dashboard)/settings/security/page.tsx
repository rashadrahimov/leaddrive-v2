"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, ArrowLeft, Smartphone, Key, Plus, Trash2, Eye, EyeOff, Link2, Unlink, ToggleLeft, ToggleRight } from "lucide-react"
import { signIn } from "next-auth/react"
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

  // Linked OAuth accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [unlinking, setUnlinking] = useState<string | null>(null)

  // Auth methods toggle state
  const [authMethods, setAuthMethods] = useState<{ google: boolean; microsoft: boolean; googleConfigured?: boolean; microsoftConfigured?: boolean }>({ google: true, microsoft: true })
  const [savingAuthMethods, setSavingAuthMethods] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [showNewKey, setShowNewKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read:companies", "read:contacts", "read:deals"])
  const [newKeyExpiry, setNewKeyExpiry] = useState("90")
  const [generatedKey, setGeneratedKey] = useState("")
  const [keyCopied, setKeyCopied] = useState(false)
  const [keyLoading, setKeyLoading] = useState(false)

  const fetchApiKeys = () => {
    fetch("/api/v1/api-keys").then(r => r.json()).then(j => {
      if (j.success) setApiKeys(j.data)
    })
  }

  const fetchLinkedAccounts = () => {
    fetch("/api/v1/auth/linked-accounts").then(r => r.json()).then(j => {
      if (j.success) setLinkedAccounts(j.data)
    })
  }

  const handleUnlink = async (accountId: string) => {
    setUnlinking(accountId)
    try {
      const res = await fetch("/api/v1/auth/linked-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      })
      const json = await res.json()
      if (json.success) {
        fetchLinkedAccounts()
      } else {
        alert(json.error || "Failed to unlink account")
      }
    } catch {
      alert("Failed to unlink account")
    } finally {
      setUnlinking(null)
    }
  }

  useEffect(() => {
    fetch("/api/v1/auth/2fa")
      .then(r => r.json())
      .then(j => {
        if (j.success) setEnabled(j.data.enabled)
      })
      .finally(() => setLoading(false))
    fetchApiKeys()
    fetchLinkedAccounts()
    fetch("/api/v1/settings/auth-methods").then(r => r.json()).then(j => {
      if (j.success) setAuthMethods(j.data)
    })
  }, [])

  const toggleAuthMethod = async (method: "google" | "microsoft", value: boolean) => {
    setSavingAuthMethods(true)
    const updated = { ...authMethods, [method]: value }
    try {
      const res = await fetch("/api/v1/settings/auth-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
      const json = await res.json()
      if (json.success) setAuthMethods(updated)
    } catch {} finally { setSavingAuthMethods(false) }
  }

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
    } catch { setError(tc("errorGeneric")) }
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
    } catch { setError(tc("errorVerification")) }
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
    } catch { setError(tc("errorGeneric")) }
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
          <p className="text-sm text-muted-foreground">{t("hintSecurity")}</p>
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
              <div className="bg-card p-4 rounded-xl shadow-inner border">
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
      {/* ═══ Authentication Methods ═══ */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Методы авторизации</h2>
            <p className="text-sm text-muted-foreground">Включение и отключение способов входа на странице логина</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Google OAuth toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Google OAuth</span>
                      {authMethods.googleConfigured
                        ? <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Настроено</Badge>
                        : <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Не настроено</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Вход через аккаунт Google</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAuthMethod("google", !authMethods.google)}
                  disabled={savingAuthMethods || !authMethods.googleConfigured}
                  className="focus:outline-none disabled:opacity-40"
                >
                  {authMethods.google && authMethods.googleConfigured
                    ? <ToggleRight className="h-8 w-8 text-green-500" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>
              {!authMethods.googleConfigured && (
                <p className="text-[11px] text-amber-600 mt-2 ml-8">GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET не заданы в .env на сервере</p>
              )}
            </CardContent>
          </Card>

          {/* Microsoft OAuth toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Microsoft OAuth</span>
                      {authMethods.microsoftConfigured
                        ? <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Настроено</Badge>
                        : <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Не настроено</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Вход через аккаунт Microsoft</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAuthMethod("microsoft", !authMethods.microsoft)}
                  disabled={savingAuthMethods || !authMethods.microsoftConfigured}
                  className="focus:outline-none disabled:opacity-40"
                >
                  {authMethods.microsoft && authMethods.microsoftConfigured
                    ? <ToggleRight className="h-8 w-8 text-green-500" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>
              {!authMethods.microsoftConfigured && (
                <p className="text-[11px] text-amber-600 mt-2 ml-8">MICROSOFT_CLIENT_ID и MICROSOFT_CLIENT_SECRET не заданы в .env на сервере</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Linked OAuth Accounts ═══ */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Привязанные аккаунты</h2>
            <p className="text-sm text-muted-foreground">Вход через Google или Microsoft</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Google */}
          {(() => {
            const google = linkedAccounts.find(a => a.provider === "google")
            return (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium">Google</span>
                      {google && (
                        <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">Connected</Badge>
                      )}
                    </div>
                  </div>
                  {google ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                      disabled={unlinking === google.id}
                      onClick={() => handleUnlink(google.id)}
                    >
                      {unlinking === google.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signIn("google", { callbackUrl: "/settings/security" })}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {/* Microsoft */}
          {(() => {
            const ms = linkedAccounts.find(a => a.provider === "microsoft-entra-id")
            return (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    <div>
                      <span className="text-sm font-medium">Microsoft</span>
                      {ms && (
                        <Badge className="ml-2 bg-green-100 text-green-700 text-[10px]">Connected</Badge>
                      )}
                    </div>
                  </div>
                  {ms ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                      disabled={unlinking === ms.id}
                      onClick={() => handleUnlink(ms.id)}
                    >
                      {unlinking === ms.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/settings/security" })}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </div>

      {/* ═══ API Keys Section ═══ */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Key className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">API Keys</h2>
              <p className="text-sm text-muted-foreground">Manage API keys for external integrations</p>
            </div>
          </div>
          <Button onClick={() => { setShowNewKey(true); setGeneratedKey(""); setNewKeyName("") }} className="gap-2">
            <Plus className="h-4 w-4" /> New API Key
          </Button>
        </div>

        {/* Generate new key form */}
        {showNewKey && (
          <Card className="border-amber-200 bg-amber-50/50 mb-4">
            <CardContent className="p-4 space-y-3">
              {generatedKey ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-800 mb-1">Key created! Copy it now — it won't be shown again.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs font-mono bg-card rounded px-2 py-1.5 flex-1 overflow-hidden text-ellipsis border">
                        {generatedKey}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(generatedKey)
                        setKeyCopied(true)
                        setTimeout(() => setKeyCopied(false), 2000)
                      }}>
                        {keyCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => { setShowNewKey(false); setGeneratedKey("") }} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">Key Name</Label>
                    <Input value={newKeyName} onChange={(e: any) => setNewKeyName(e.target.value)} placeholder="e.g. My Integration" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Scopes</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {["read:companies", "write:companies", "read:contacts", "write:contacts", "read:deals", "write:deals", "read:leads", "write:leads", "read:invoices", "write:invoices", "read:tasks", "write:tasks"].map(scope => (
                        <button
                          key={scope}
                          onClick={() => setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${newKeyScopes.includes(scope) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 hover:bg-muted"}`}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Expires in</Label>
                    <select value={newKeyExpiry} onChange={(e: any) => setNewKeyExpiry(e.target.value)} className="mt-1 w-full border rounded-md p-2 text-sm">
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="365">1 year</option>
                      <option value="">Never</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowNewKey(false)}>Cancel</Button>
                    <Button
                      disabled={!newKeyName || newKeyScopes.length === 0 || keyLoading}
                      onClick={async () => {
                        setKeyLoading(true)
                        try {
                          const res = await fetch("/api/v1/api-keys", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes, expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : null }),
                          })
                          const json = await res.json()
                          if (json.success) {
                            setGeneratedKey(json.data.key)
                            fetchApiKeys()
                          }
                        } catch {} finally { setKeyLoading(false) }
                      }}
                      className="flex-1 gap-2"
                    >
                      {keyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      Generate Key
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Existing keys list */}
        {apiKeys.length === 0 && !showNewKey ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No API keys yet. Create one to integrate with external systems.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(key => (
              <Card key={key.id} className={!key.isActive ? "opacity-50" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{key.name}</span>
                      <Badge variant={key.isActive ? "default" : "secondary"} className="text-[10px]">
                        {key.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <code className="bg-muted rounded px-1.5 py-0.5">{key.keyPrefix}...</code>
                      <span>{key.scopes?.length || 0} scopes</span>
                      {key.expiresAt && <span>Expires: {new Date(key.expiresAt).toLocaleDateString()}</span>}
                      {key.lastUsedAt && <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {key.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (!confirm("Revoke this API key? This cannot be undone.")) return
                        await fetch(`/api/v1/api-keys/${key.id}`, { method: "DELETE" })
                        fetchApiKeys()
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
