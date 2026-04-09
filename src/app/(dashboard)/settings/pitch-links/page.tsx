"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Copy, Trash2, Check, Link2, Eye, Clock } from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

interface PitchToken {
  id: string
  token: string
  guestName: string
  used: boolean
  viewedAt: string | null
  createdAt: string
}

export default function PitchLinksPage() {
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [tokens, setTokens] = useState<PitchToken[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState("")

  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/v1/pitch-tokens", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const data = await res.json()
      if (data.success) setTokens(data.data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { if (orgId) fetchTokens() }, [session])

  const handleCreate = async () => {
    if (!guestName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/v1/pitch-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ guestName: guestName.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedUrl(data.data.url)
        setGuestName("")
        fetchTokens()
      }
    } catch {}
    finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/pitch-tokens/${id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchTokens()
  }

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/pitch/${token}`
    navigator.clipboard.writeText(url)
    setCopiedId(token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pitch Links</h1>
          <p className="text-muted-foreground">Birdəfəlik prezentasiya linkləri yaradın və idarə edin</p>
        </div>
        <Button className="gap-2" onClick={() => { setShowCreate(true); setGeneratedUrl("") }}>
          <Plus className="h-4 w-4" /> Link yarat
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Bütün linklər</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Yüklənir...</p>
          ) : tokens.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Hələ heç bir link yaradılmayıb</p>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.guestName}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      /pitch/{t.token.slice(0, 8)}...
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.used ? (
                      <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> Baxılıb</Badge>
                    ) : t.viewedAt ? (
                      <Badge className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20"><Clock className="h-3 w-3" /> Açıq</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-500/30">Aktiv</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString("az")}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copyUrl(t.token)} disabled={t.used}>
                      {copiedId === t.token ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni prezentasiya linki</DialogTitle>
          </DialogHeader>
          {generatedUrl ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Link hazırdır! Kopyalayın və göndərin:</p>
              <div className="flex gap-2">
                <Input value={generatedUrl} readOnly className="font-mono text-xs" />
                <Button onClick={() => { navigator.clipboard.writeText(generatedUrl); setCopiedId("new") }} variant="outline">
                  {copiedId === "new" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-500">⚠ Bu link yalnız bir dəfə istifadə oluna bilər. Səhifə bağlandıqda link avtomatik deaktiv olacaq.</p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowCreate(false)}>Bağla</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Qonaq adı</label>
                <Input
                  placeholder="Məs: Əli Həsənov (TechCorp)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!guestName.trim() || creating} className="gap-2">
                  <Link2 className="h-4 w-4" /> {creating ? "Yaradılır..." : "Link yarat"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
