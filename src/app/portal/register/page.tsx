"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, CheckCircle } from "lucide-react"

export default function PortalRegisterPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/v1/public/portal-auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Ошибка")
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-10 text-center">
            <Mail className="h-12 w-12 text-blue-500 mx-auto mb-3" />
            <h2 className="text-xl font-semibold mb-2">Проверьте почту</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Мы отправили письмо на <strong>{email}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Перейдите по ссылке в письме, чтобы создать пароль и получить доступ к порталу.
            </p>
            <p className="text-xs text-muted-foreground mt-4">Ссылка действительна 24 часа</p>
            <div className="mt-6">
              <Link href="/portal/login" className="text-sm text-primary hover:underline">
                Вернуться ко входу
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <p className="text-sm text-muted-foreground">Введите email для получения ссылки на регистрацию</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@company.com" className="mt-1" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправка..." : "Отправить ссылку"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <Link href="/portal/login" className="text-sm text-primary hover:underline">
              Уже есть аккаунт? Войти
            </Link>
            <p className="text-xs text-muted-foreground">
              Ваш email должен быть в базе контактов с активированным доступом к порталу
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
