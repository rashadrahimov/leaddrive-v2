"use client"

import { useState, useRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const totpInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const credentials: Record<string, string> = {
      email,
      password,
    }

    if (step === 2 && totpCode) {
      credentials.totpCode = totpCode
    }

    const result = await signIn("credentials", {
      ...credentials,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      if (result.error.includes("2FA_REQUIRED")) {
        // Switch to 2FA step
        setStep(2)
        setError("")
        setTimeout(() => totpInputRef.current?.focus(), 100)
      } else if (result.error.includes("INVALID_2FA_CODE")) {
        setError(t("invalid2faCode"))
        setTotpCode("")
      } else {
        setError(t("invalidCredentials"))
      }
    } else {
      router.push("/")
      router.refresh()
    }
  }

  function handleTotpChange(value: string) {
    if (useBackupCode) {
      // Backup codes are hex strings, allow alphanumeric
      setTotpCode(value.replace(/[^a-fA-F0-9]/g, ""))
    } else {
      // TOTP codes are 6 digits only
      const digits = value.replace(/\D/g, "").slice(0, 6)
      setTotpCode(digits)
    }
  }

  function handleBackToStep1() {
    setStep(1)
    setTotpCode("")
    setError("")
    setUseBackupCode(false)
  }

  // Step 2: 2FA verification
  if (step === 2) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">{t("twoFactorAuth")}</CardTitle>
          <CardDescription>
            {useBackupCode ? t("enterBackupCode") : t("enterAuthCode")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="totpCode" className="text-sm font-medium">
                {useBackupCode ? t("backupCode") : t("verificationCode")}
              </label>
              <Input
                ref={totpInputRef}
                id="totpCode"
                type="text"
                inputMode={useBackupCode ? "text" : "numeric"}
                placeholder={useBackupCode ? "a1b2c3d4" : "000000"}
                value={totpCode}
                onChange={(e) => handleTotpChange(e.target.value)}
                autoComplete="one-time-code"
                autoFocus
                className={useBackupCode ? "" : "text-center text-2xl tracking-[0.5em] font-mono"}
                maxLength={useBackupCode ? 20 : 6}
                required
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode)
                setTotpCode("")
                setError("")
              }}
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              {useBackupCode ? t("useAuthApp") : t("useBackupCode")}
            </button>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading || (!useBackupCode && totpCode.length !== 6) || (useBackupCode && totpCode.length === 0)}>
              {loading ? t("verifying") : t("verify")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBackToStep1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToLogin")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    )
  }

  // Step 1: Email + Password
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">LeadDrive CRM</CardTitle>
        <CardDescription>{t("signInToAccount")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t("email")}
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t("password")}
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>
          <div className="flex justify-between text-sm w-full">
            <Link href="/forgot-password" className="text-muted-foreground hover:text-primary">
              {t("forgotPassword")}
            </Link>
            <Link href="/register" className="text-muted-foreground hover:text-primary">
              {t("createAccount")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
