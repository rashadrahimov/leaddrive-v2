"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Save, Send } from "lucide-react"

export default function SmtpSettingsPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId

  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState("587")
  const [smtpUsername, setSmtpUsername] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [fromName, setFromName] = useState("")
  const [testEmail, setTestEmail] = useState("")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMTP Settings</h1>
        <p className="text-muted-foreground mt-1">
          Настройки SMTP для отправки email
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Параметры SMTP-сервера</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP Host</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.example.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">Port</Label>
              <Input
                id="smtp-port"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-username">Username</Label>
              <Input
                id="smtp-username"
                placeholder="user@example.com"
                value={smtpUsername}
                onChange={(e) => setSmtpUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-password">Password</Label>
              <Input
                id="smtp-password"
                type="password"
                placeholder="••••••••"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email</Label>
              <Input
                id="from-email"
                placeholder="noreply@yourdomain.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from-name">From Name</Label>
              <Input
                id="from-name"
                placeholder="LeadDrive CRM"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button disabled>
              <Save className="mr-2 h-4 w-4" />
              Сохранить настройки
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Тестовое письмо</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-email">Email для тестового письма</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button disabled>
              <Send className="mr-2 h-4 w-4" />
              Отправить тестовое письмо
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Сначала сохраните настройки SMTP, затем отправьте тестовое письмо для проверки
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
