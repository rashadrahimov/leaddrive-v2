"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "Этот email уже зарегистрирован другим способом. Войдите по email/паролю.",
  AccessDenied: "Доступ запрещён. Попробуйте войти по email/паролю или откройте сайт в обычном браузере (Safari/Chrome).",
  OAuthCallbackError: "Ошибка авторизации. Попробуйте ещё раз.",
  Default: "Ошибка входа. Попробуйте другой способ.",
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("auth")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const oauthError = searchParams.get("error")
  const [error, setError] = useState(oauthError ? (OAUTH_ERRORS[oauthError] || OAUTH_ERRORS.Default) : "")
  const [loading, setLoading] = useState(false)
  const [authMethods, setAuthMethods] = useState<{ google: boolean; microsoft: boolean }>({ google: false, microsoft: false })
  const [isWebView, setIsWebView] = useState(false)

  useEffect(() => {
    fetch("/api/v1/settings/auth-methods")
      .then(r => r.json())
      .then(j => { if (j.success) setAuthMethods(j.data) })
      .catch(() => {})
    // Detect embedded WebView browsers (Messenger, Instagram, etc.)
    const ua = navigator.userAgent || ""
    const webview = /FBAN|FBAV|Instagram|Line\/|Twitter|Snapchat|BytedanceWebview|MicroMessenger|WeChat/i.test(ua)
      || (/wv\)/.test(ua) && /Android/.test(ua))
    setIsWebView(webview)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError(t("invalidCredentials"))
    } else {
      router.push("/")
      router.refresh()
    }
  }

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
              minLength={8}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("signIn")}
          </Button>

          {(authMethods.google || authMethods.microsoft) && (
            <>
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">{t("or") || "или"}</span>
                </div>
              </div>

              <div className="grid gap-2 w-full">
                {authMethods.google && !isWebView && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    {t("signInWithGoogle") || "Войти через Google"}
                  </Button>
                )}
                {authMethods.google && isWebView && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium text-center">
                      Google вход недоступен из встроенного браузера
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 text-center">
                      Откройте в Safari или Chrome:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + "/login")
                          .then(() => {
                            const btn = document.getElementById("copy-link-btn")
                            if (btn) btn.textContent = "Скопировано!"
                            setTimeout(() => { if (btn) btn.textContent = "Скопировать ссылку" }, 2000)
                          })
                      }}
                      id="copy-link-btn"
                      className="w-full text-xs font-medium py-2 px-3 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 hover:bg-amber-200 transition-colors"
                    >
                      Скопировать ссылку
                    </button>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 text-center">
                      или войдите по email/паролю выше
                    </p>
                  </div>
                )}
                {authMethods.microsoft && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/dashboard" })}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    {t("signInWithMicrosoft") || "Войти через Microsoft"}
                  </Button>
                )}
              </div>
            </>
          )}

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
