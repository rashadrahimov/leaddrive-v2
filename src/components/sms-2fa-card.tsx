"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Phone, ShieldCheck, Loader2 } from "lucide-react"

type Step = "idle" | "sending" | "awaiting_code" | "verifying"

/**
 * Lets a signed-in user verify their phone number by receiving and entering a
 * 6-digit SMS code. Verification succeeds when the backend marks the OtpCode
 * row as used. The caller can then persist `user.phone` / a 2FA flag.
 *
 * This component only handles the verification exchange. Persisting the
 * verified phone is the parent's responsibility — wire it via `onVerified`.
 */
export function Sms2FACard({
  initialPhone,
  onVerified,
}: {
  initialPhone?: string
  onVerified?: (phone: string) => void
}) {
  const t = useTranslations("settings")
  const [phone, setPhone] = useState(initialPhone || "")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)

  const normalizedPhone = phone.replace(/[\s\-()]/g, "")
  const phoneValid = /^\+?[\d]{7,15}$/.test(normalizedPhone)
  const codeValid = /^\d{6}$/.test(code)

  const sendCode = async () => {
    setError(null)
    if (!phoneValid) {
      setError(t("sms2faPhoneInvalid"))
      return
    }
    setStep("sending")
    try {
      const res = await fetch("/api/v1/auth/sms-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, purpose: "2fa" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t("sms2faSendFailed"))
        setStep("idle")
        return
      }
      toast.success(t("sms2faCodeSent"))
      setStep("awaiting_code")
    } catch {
      setError(t("sms2faSendFailed"))
      setStep("idle")
    }
  }

  const verifyCode = async () => {
    setError(null)
    if (!codeValid) {
      setError(t("sms2faCodeInvalid"))
      return
    }
    setStep("verifying")
    try {
      const res = await fetch("/api/v1/auth/sms-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, code, purpose: "2fa" }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t("sms2faVerifyFailed"))
        setStep("awaiting_code")
        return
      }
      toast.success(t("sms2faVerified"))
      onVerified?.(normalizedPhone)
      setStep("idle")
      setCode("")
    } catch {
      setError(t("sms2faVerifyFailed"))
      setStep("awaiting_code")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4 text-primary" />
          {t("sms2faTitle")}
          <Badge variant="outline" className="ml-auto text-[10px] font-normal">
            {t("sms2faBeta")}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">{t("sms2faDescription")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="sms2fa-phone" className="text-xs">{t("sms2faPhoneLabel")}</Label>
          <Input
            id="sms2fa-phone"
            type="tel"
            placeholder="+15551234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={step === "sending" || step === "verifying"}
          />
          <p className="text-[11px] text-muted-foreground">{t("sms2faPhoneHint")}</p>
        </div>

        {step === "awaiting_code" || step === "verifying" ? (
          <div className="space-y-1.5">
            <Label htmlFor="sms2fa-code" className="text-xs">{t("sms2faCodeLabel")}</Label>
            <Input
              id="sms2fa-code"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
        ) : null}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex items-center gap-2">
          {step === "awaiting_code" || step === "verifying" ? (
            <>
              <Button onClick={verifyCode} disabled={!codeValid || step === "verifying"} size="sm">
                {step === "verifying" ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("sms2faVerifying")}</>
                ) : (
                  <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> {t("sms2faVerifyCta")}</>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStep("idle"); setCode(""); setError(null) }}
              >
                {t("sms2faCancel")}
              </Button>
            </>
          ) : (
            <Button onClick={sendCode} disabled={!phoneValid || step === "sending"} size="sm">
              {step === "sending" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> {t("sms2faSending")}</>
              ) : (
                t("sms2faSendCta")
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
