"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  )
}

function SetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const t = useTranslations("portal")

  const [verifying, setVerifying] = useState(true)
  const [valid, setValid] = useState(false)
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [tokenError, setTokenError] = useState("")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenError(t("invalidLink"))
      setVerifying(false)
      return
    }
    fetch(`/api/v1/public/portal-auth/set-password?token=${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setValid(true)
          setContactName(json.data.fullName)
          setContactEmail(json.data.email)
        } else {
          setTokenError(json.error || t("linkExpired"))
        }
      })
      .catch(() => setTokenError(t("linkExpired")))
      .finally(() => setVerifying(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { setError(t("minChars", { count: 6 })); return }
    if (password !== confirmPassword) { setError(t("passwordsMismatch")); return }
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/v1/public/portal-auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Error")

      localStorage.setItem("portal-user", JSON.stringify(json.data))
      setSuccess(true)
      setTimeout(() => router.push("/portal/tickets"), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-2">{t("invalidLink")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{tokenError}</p>
            <Link href="/portal/register" className="text-sm text-primary hover:underline">
              {t("sendLink")}
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-1">{t("registrationComplete")}</h2>
            <p className="text-sm text-muted-foreground">{t("redirecting")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("createPassword")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {contactName}, {t("createPasswordSubtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={contactEmail} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("minChars", { count: 6 })}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t("confirmPassword")}</label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t("repeatPassword")}
                className="mt-1"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{t("passwordsMismatch")}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? t("savingPassword") : t("createPasswordBtn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
