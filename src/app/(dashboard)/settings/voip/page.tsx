"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select } from "@/components/ui/select"
import { Phone, Save, Loader2, TestTube, CheckCircle, XCircle } from "lucide-react"
import { PageDescription } from "@/components/page-description"

type Provider = "twilio" | "threecx" | "asterisk" | "custom-sip"

export default function VoipSettingsPage() {
  const t = useTranslations("voipSettings")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const [configId, setConfigId] = useState<string | null>(null)
  const [provider, setProvider] = useState<Provider>("twilio")
  const [recordCalls, setRecordCalls] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Twilio fields
  const [accountSid, setAccountSid] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [twilioNumber, setTwilioNumber] = useState("")

  // 3CX fields
  const [serverUrl, setServerUrl] = useState("")
  const [extension, setExtension] = useState("")
  const [apiKey, setApiKey] = useState("")

  // Asterisk fields
  const [ariHost, setAriHost] = useState("")
  const [ariPort, setAriPort] = useState("8088")
  const [ariUsername, setAriUsername] = useState("")
  const [ariPassword, setAriPassword] = useState("")
  const [ariContext, setAriContext] = useState("from-internal")
  const [callerExtension, setCallerExtension] = useState("")

  // Custom SIP fields
  const [sipServer, setSipServer] = useState("")
  const [sipPort, setSipPort] = useState("5060")
  const [sipDomain, setSipDomain] = useState("")
  const [sipTransport, setSipTransport] = useState<"udp" | "tcp" | "tls" | "wss">("wss")
  const [sipUsername, setSipUsername] = useState("")
  const [sipSecret, setSipSecret] = useState("")

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
        const s = config.settings || {}
        const p = s.provider || "twilio"
        setProvider(p)
        setRecordCalls(s.recordCalls || false)

        // Load provider-specific fields
        if (p === "twilio") {
          setAccountSid(s.accountSid || "")
          setAuthToken(s.authToken || "")
          setTwilioNumber(s.twilioNumber || config.phoneNumber || "")
        } else if (p === "threecx") {
          setServerUrl(s.serverUrl || "")
          setExtension(s.extension || "")
          setApiKey(s.apiKey || "")
        } else if (p === "asterisk") {
          setAriHost(s.ariHost || "")
          setAriPort(String(s.ariPort || 8088))
          setAriUsername(s.username || "")
          setAriPassword(s.password || "")
          setAriContext(s.context || "from-internal")
          setCallerExtension(s.callerExtension || "")
        } else if (p === "custom-sip") {
          setSipServer(s.sipServer || "")
          setSipPort(String(s.sipPort || 5060))
          setSipDomain(s.sipDomain || "")
          setSipTransport(s.transport || "wss")
          setSipUsername(s.username || "")
          setSipSecret(s.secret || "")
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const buildSettings = () => {
    switch (provider) {
      case "twilio":
        return { provider: "twilio", accountSid, authToken, twilioNumber, recordCalls }
      case "threecx":
        return { provider: "threecx", serverUrl, extension, apiKey, recordCalls }
      case "asterisk":
        return {
          provider: "asterisk",
          ariHost,
          ariPort: parseInt(ariPort) || 8088,
          username: ariUsername,
          password: ariPassword,
          context: ariContext,
          callerExtension,
          recordCalls,
        }
      case "custom-sip":
        return {
          provider: "custom-sip",
          sipServer,
          sipPort: parseInt(sipPort) || 5060,
          sipDomain,
          transport: sipTransport,
          username: sipUsername,
          secret: sipSecret,
          recordCalls,
        }
    }
  }

  const providerConfigName: Record<Provider, string> = {
    twilio: "Twilio VoIP",
    threecx: "3CX VoIP",
    asterisk: "Asterisk VoIP",
    "custom-sip": "Custom SIP",
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        channelType: "voip",
        configName: providerConfigName[provider],
        phoneNumber: provider === "twilio" ? twilioNumber : "",
        isActive,
        settings: buildSettings(),
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
      setTestResult({ success: true, message: t("configSaved") })
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
      const res = await fetch("/api/v1/calls/test", { method: "POST" })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.success ? t("testSuccess") : (data.message || data.error || t("testFailed")),
      })
    } catch {
      setTestResult({ success: false, message: t("testFailed") })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const providerDescriptions: Record<Provider, string> = {
    twilio: t("twilioDesc"),
    threecx: t("threecxDesc"),
    asterisk: t("asteriskDesc"),
    "custom-sip": t("customSipDesc"),
  }

  return (
    <div className="space-y-6">
      <PageDescription
        title={t("title")}
        description={t("description")}
      />

      {/* Provider Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            {t("provider")}
            {configId && (
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? t("active") : t("inactive")}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{t("selectProvider")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={provider}
            onChange={(e) => { setProvider(e.target.value as Provider); setTestResult(null) }}
            className="w-full sm:w-[300px]"
          >
            <option value="twilio">{t("twilio")}</option>
            <option value="threecx">{t("threecx")}</option>
            <option value="asterisk">{t("asterisk")}</option>
            <option value="custom-sip">{t("customSip")}</option>
          </Select>

          <p className="text-sm text-muted-foreground">{providerDescriptions[provider]}</p>
        </CardContent>
      </Card>

      {/* Provider-specific fields */}
      <Card>
        <CardHeader>
          <CardTitle>{providerConfigName[provider]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Twilio fields */}
          {provider === "twilio" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("accountSid")}</Label>
                  <Input value={accountSid} onChange={e => setAccountSid(e.target.value)} placeholder="AC..." />
                </div>
                <div className="grid gap-2">
                  <Label>{t("authToken")}</Label>
                  <Input type="password" value={authToken} onChange={e => setAuthToken(e.target.value)} placeholder="Your Twilio Auth Token" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t("twilioNumber")}</Label>
                <Input value={twilioNumber} onChange={e => setTwilioNumber(e.target.value)} placeholder="+1234567890" />
                <p className="text-xs text-muted-foreground">{t("twilioNumberHint")}</p>
              </div>
            </>
          )}

          {/* 3CX fields */}
          {provider === "threecx" && (
            <>
              <div className="grid gap-2">
                <Label>{t("serverUrl")}</Label>
                <Input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="https://mycompany.3cx.eu" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("extension")}</Label>
                  <Input value={extension} onChange={e => setExtension(e.target.value)} placeholder="101" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("apiKey")}</Label>
                  <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="3CX API Key" />
                </div>
              </div>
            </>
          )}

          {/* Asterisk fields */}
          {provider === "asterisk" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("ariHost")}</Label>
                  <Input value={ariHost} onChange={e => setAriHost(e.target.value)} placeholder="192.168.1.10" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("ariPort")}</Label>
                  <Input value={ariPort} onChange={e => setAriPort(e.target.value)} placeholder="8088" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("username")}</Label>
                  <Input value={ariUsername} onChange={e => setAriUsername(e.target.value)} placeholder="ari_user" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("password")}</Label>
                  <Input type="password" value={ariPassword} onChange={e => setAriPassword(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("context")}</Label>
                  <Input value={ariContext} onChange={e => setAriContext(e.target.value)} placeholder="from-internal" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("callerExtension")}</Label>
                  <Input value={callerExtension} onChange={e => setCallerExtension(e.target.value)} placeholder="100" />
                </div>
              </div>
            </>
          )}

          {/* Custom SIP fields */}
          {provider === "custom-sip" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("sipServer")}</Label>
                  <Input value={sipServer} onChange={e => setSipServer(e.target.value)} placeholder="sip.example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("sipPort")}</Label>
                  <Input value={sipPort} onChange={e => setSipPort(e.target.value)} placeholder="5060" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("sipDomain")}</Label>
                  <Input value={sipDomain} onChange={e => setSipDomain(e.target.value)} placeholder="example.com" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("transport")}</Label>
                  <Select
                    value={sipTransport}
                    onChange={(e) => setSipTransport(e.target.value as any)}
                  >
                    <option value="wss">WSS (WebSocket Secure)</option>
                    <option value="tls">TLS</option>
                    <option value="tcp">TCP</option>
                    <option value="udp">UDP</option>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("username")}</Label>
                  <Input value={sipUsername} onChange={e => setSipUsername(e.target.value)} placeholder="sip_user" />
                </div>
                <div className="grid gap-2">
                  <Label>{t("secret")}</Label>
                  <Input type="password" value={sipSecret} onChange={e => setSipSecret(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* Common toggles */}
          <div className="flex items-center gap-3">
            <Switch checked={recordCalls} onCheckedChange={setRecordCalls} />
            <Label>{t("recordCalls")}</Label>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>{t("enableVoip")}</Label>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
              {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleTest} disabled={testing || !configId}>
              {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TestTube className="h-4 w-4 mr-1" />}
              {testing ? t("testing") : t("testConnection")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
