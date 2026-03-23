"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Loader2 } from "lucide-react"

export default function Verify2FAPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const { data: session, update } = useSession()
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // If user doesn't need 2FA, redirect to dashboard
  useEffect(() => {
    if (session && !(session.user as any)?.needs2fa) {
      router.push("/")
    }
  }, [session, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/v1/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || t("invalidCode"))
        setLoading(false)
        return
      }

      // Update session to clear needs2fa flag
      await update({ needs2fa: false })

      // Redirect to dashboard
      router.push("/")
      router.refresh()
    } catch {
      setError(t("invalidCode"))
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl font-bold">{t("verify2faTitle")}</CardTitle>
        <CardDescription>{t("verify2faSubtitle")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              {t("enterCode")}
            </label>
            <Input
              ref={inputRef}
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 8))}
              required
              className="text-center text-2xl tracking-[0.5em] font-mono"
            />
            <p className="text-xs text-muted-foreground">{t("backupCodeHint")}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full gap-2" disabled={loading || code.length < 6}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> {t("verifying")}</>
            ) : (
              t("verifyCode")
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
