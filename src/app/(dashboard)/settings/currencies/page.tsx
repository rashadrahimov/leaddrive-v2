"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { CurrencyForm } from "@/components/currency-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useAutoTour } from "@/components/tour/tour-provider"
import { TourReplayButton } from "@/components/tour/tour-replay-button"

interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBase: boolean
  isActive: boolean
}

export default function CurrenciesPage() {
  const { data: session } = useSession()
  const t = useTranslations("settings")
  useAutoTour("currencies")
  const tc = useTranslations("common")
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<Currency | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const orgId = session?.user?.organizationId

  const fetchCurrencies = async () => {
    try {
      const res = await fetch("/api/v1/currencies", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
      })
      if (res.ok) {
        const result = await res.json()
        setCurrencies(result.data || [])
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchCurrencies() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await fetch(`/api/v1/currencies/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {} as Record<string, string>,
    })
    if (!res.ok) throw new Error("Failed to delete")
    fetchCurrencies()
  }

  const columns = [
    {
      key: "code", label: "Code", sortable: true,
      render: (item: any) => (
        <div className="font-medium flex items-center gap-2">
          {item.code}
          {item.isBase && <Badge variant="default" className="text-xs">Base</Badge>}
        </div>
      ),
    },
    {
      key: "name", label: tc("name"), sortable: true,
      render: (item: any) => <div>{item.name}</div>,
    },
    {
      key: "symbol", label: "Symbol", sortable: true,
      render: (item: any) => <Badge variant="outline">{item.symbol}</Badge>,
    },
    {
      key: "exchangeRate", label: "Exchange Rate", sortable: true,
      render: (item: any) => <div className="font-mono text-sm">{item.exchangeRate}</div>,
    },
    {
      key: "isActive", label: tc("status"), sortable: true,
      render: (item: any) => <Badge variant={item.isActive ? "default" : "secondary"}>{item.isActive ? tc("active") : tc("inactive")}</Badge>,
    },
    {
      key: "edit", label: "", sortable: false,
      render: (item: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditData(item); setShowForm(true) }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setDeleteId(item.id); setDeleteName(item.code) }}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 data-tour-id="currencies-header" className="text-2xl font-bold tracking-tight flex items-center gap-2">{t("currencies")} <TourReplayButton tourId="currencies" /></h1>
          <p className="text-muted-foreground">{t("currenciesDesc")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("hintCurrencies")}</p>
        </div>
        <Button className="gap-2" onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> {tc("add")} Currency
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("currencies")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{tc("loading")}</p>
          ) : (
            <DataTable columns={columns} data={currencies} searchPlaceholder={tc("search")} searchKey="code" pageSize={10} />
          )}
        </CardContent>
      </Card>

      <CurrencyForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchCurrencies}
        initialData={editData}
        orgId={orgId}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={`${tc("delete")} Currency`}
        itemName={deleteName}
      />
    </div>
  )
}
