"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Phone, Save, Loader2, TestTube, CheckCircle, XCircle } from "lucide-react"
import { PageDescription } from "@/components/page-description"

export default function VoipSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [configId, setConfigId] = useState<string | null>(null)
  const [accountSid, setAccountSid] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [twilioNumber, setTwilioNumber] = useState("")
  const [recordCalls, setRecordCalls] = useState(false)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/channels?type=voip")
      const data = await res.json()
      if (data.success && data.data?.length > 0) {
        const config = data.data[0]
        setConfigId(config.id)
        setIsActive(config.isActive)
        const settings = config.settings || {}
        setAccountSid(settings.accountSid || "")
        setAuthToken(settings.authToken || "")
        setTwilioNumber(settings.twilioNumber || config.phoneNumber || "")
        setRecordCalls(settings.recordCalls || false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        channelType: "voip",
        configName: "Twilio VoIP",
        phoneNumber: twilioNumber,
        isActive,
        settings: { accountSid, authToken, twilioNumber, recordCalls },
      }

      if (configId) {
        await fetch(`/api/v1/channels/${configId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        const res = await fetch("/api/v1/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.success) setConfigId(data.data?.id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Simple validation — check if Twilio credentials work
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`
      const twilioAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
      const res = await fetch(twilioUrl, {
        headers: { "Authorization": `Basic ${twilioAuth}` },
      })
      if (res.ok) {
        setTestResult({ success: true, message: "Connection successful! Twilio credentials are valid." })
      } else {
        setTestResult({ success: false, message: "Invalid credentials. Please check your Account SID and Auth Token." })
      }
    } catch {
      setTestResult({ success: false, message: "Connection failed. Please check your credentials." })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <PageDescription
        title="VoIP Configuration"
        description="Configure Twilio for click-to-call, call recording, and automatic call logging."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Twilio Configuration
            {configId && (
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Account SID</Label>
              <Input
                value={accountSid}
                onChange={e => setAccountSid(e.target.value)}
                placeholder="AC..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Auth Token</Label>
              <Input
                type="password"
                value={authToken}
                onChange={e => setAuthToken(e.target.value)}
                placeholder="Your Twilio Auth Token"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Twilio Phone Number</Label>
            <Input
              value={twilioNumber}
              onChange={e => setTwilioNumber(e.target.value)}
              placeholder="+1234567890"
            />
            <p className="text-xs text-muted-foreground">Your Twilio phone number for outbound calls</p>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={recordCalls} onCheckedChange={setRecordCalls} />
            <Label>Record Calls</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Enable VoIP</Label>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
              {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleTest} disabled={testing || !accountSid || !authToken}>
              {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
              Test Connection
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
