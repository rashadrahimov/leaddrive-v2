"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations("auth")
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Registration failed")
      }
      router.push("/login?registered=true")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("createAccount")}</CardTitle>
        <CardDescription>Start your free trial of LeadDrive CRM</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">{t("yourName")}</label>
            <Input id="name" placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">{t("companyName")}</label>
            <Input id="company" placeholder="Acme Inc." value={form.company} onChange={(e) => update("company", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">{t("email")}</label>
            <Input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">{t("password")}</label>
            <Input id="password" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("signingIn") : t("createAccount")}
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
            {t("hasAccount")} {t("signIn")}
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
