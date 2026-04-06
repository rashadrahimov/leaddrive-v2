"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Globe, Plus, Trash2, RefreshCw, Copy, CheckCircle2, AlertCircle, Clock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageDescription } from "@/components/page-description"

interface CustomDomain {
  id: string
  domain: string
  status: string
  dnsVerifiedAt: string | null
  sslIssuedAt: string | null
  lastCheckedAt: string | null
  errorMessage: string | null
  createdAt: string
}

const CNAME_TARGET = "pages.leaddrivecrm.org"

export default function CustomDomainsPage() {
  const t = useTranslations("customDomains")
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [domainInput, setDomainInput] = useState("")
  const [adding, setAdding] = useState(false)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingDomain, setDeletingDomain] = useState<CustomDomain | null>(null)
  const [showInstructions, setShowInstructions] = useState<string | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/custom-domains")
      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])

  const handleAdd = async () => {
    if (!domainInput.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/v1/custom-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(t("domainAdded"))
        setAddOpen(false)
        setDomainInput("")
        setShowInstructions(data.domain.id)
        fetchDomains()
      } else {
        toast.error(data.error || "Failed to add domain")
      }
    } catch {
      toast.error("Failed to add domain")
    } finally {
      setAdding(false)
    }
  }

  const handleVerify = async (id: string) => {
    setVerifyingId(id)
    try {
      const res = await fetch(`/api/v1/custom-domains/${id}/verify`, { method: "POST" })
      const data = await res.json()
      if (data.verified) {
        toast.success(t("dnsVerifySuccess"))
      } else {
        toast.error(t("dnsVerifyFailed"))
      }
      fetchDomains()
    } catch {
      toast.error("Verification failed")
    } finally {
      setVerifyingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deletingDomain) return
    try {
      const res = await fetch(`/api/v1/custom-domains/${deletingDomain.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(t("domainDeleted"))
        setDeleteOpen(false)
        setDeletingDomain(null)
        fetchDomains()
      } else {
        toast.error("Failed to delete domain")
      }
    } catch {
      toast.error("Failed to delete domain")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied!")
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />{t("pending")}</Badge>
      case "dns_verified":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CheckCircle2 className="h-3 w-3 mr-1" />{t("dnsVerified")}</Badge>
      case "ssl_active":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><ShieldCheck className="h-3 w-3 mr-1" />{t("sslActive")}</Badge>
      case "error":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />{t("error")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
          <PageDescription text={t("subtitle")} />
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addDomain")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : domains.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">{t("noDomains")}</h3>
          <p className="text-muted-foreground mt-1 mb-4">{t("noDomainsHint")}</p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addDomain")}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">{t("domain")}</th>
                  <th className="text-left p-3 font-medium">{t("status")}</th>
                  <th className="text-left p-3 font-medium">{t("added")}</th>
                  <th className="text-right p-3 font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <span className="font-mono text-sm">{d.domain}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        {statusBadge(d.status)}
                        {d.errorMessage && (
                          <span className="text-xs text-red-500">{d.errorMessage}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        {(d.status === "pending" || d.status === "error") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerify(d.id)}
                            disabled={verifyingId === d.id}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${verifyingId === d.id ? "animate-spin" : ""}`} />
                            {verifyingId === d.id ? t("verifying") : t("verifyDns")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeletingDomain(d)
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DNS Instructions for newly added or pending domains */}
      {domains.some((d) => d.status === "pending" || d.status === "error" || d.id === showInstructions) && (
        <div className="rounded-lg border bg-blue-50/50 p-6 space-y-4">
          <h3 className="font-semibold text-blue-900">{t("setupInstructions")}</h3>
          <div className="bg-white rounded-md border p-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("step1")}</p>
              <p className="text-sm text-muted-foreground mb-1">{t("step2")}</p>
              <p className="text-sm text-muted-foreground">{t("step3")}</p>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("cnameRecord")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("host")}</p>
                  <p className="font-mono text-sm">your-subdomain</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("pointsTo")}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-blue-700">{CNAME_TARGET}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(CNAME_TARGET)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("waitDns")}</p>
          </div>
        </div>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addDomainTitle")}</DialogTitle>
            <DialogDescription>{t("setupInstructions")} <span className="font-mono text-blue-600">{CNAME_TARGET}</span></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="domain">{t("domain")}</Label>
              <Input
                id="domain"
                placeholder={t("domainPlaceholder")}
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleAdd} disabled={adding || !domainInput.trim()}>
              {adding ? "..." : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirm")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmHint")}
              {deletingDomain && (
                <span className="block font-mono mt-2">{deletingDomain.domain}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
