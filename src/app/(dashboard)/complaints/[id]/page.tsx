"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle, AlertCircle, Play, Trash2 } from "lucide-react"

const riskColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
}

type Complaint = {
  id: string
  ticketNumber: string
  subject: string
  description: string | null
  status: string
  priority: string
  source: string | null
  createdAt: string
  assignedTo: string | null
  assigneeName: string | null
  contact: { id: string; fullName: string | null; phone: string | null; email: string | null } | null
  complaintMeta: {
    externalRegistryNumber: number | null
    complaintType: string
    brand: string | null
    productionArea: string | null
    productCategory: string | null
    complaintObject: string | null
    complaintObjectDetail: string | null
    responsibleDepartment: string | null
    riskLevel: string | null
  } | null
  comments: Array<{
    id: string
    comment: string
    isInternal: boolean
    createdAt: string
    userName: string | null
  }>
  timeline?: Array<{
    id: string
    action: string
    createdAt: string
    actor: string
    oldValue: Record<string, unknown> | null
    newValue: Record<string, unknown> | null
  }>
}

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const orgId = session?.user?.organizationId
  const [data, setData] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState("")
  const [posting, setPosting] = useState(false)

  const fetchOne = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/complaints/${id}`, {
        headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [id, orgId])

  useEffect(() => {
    void fetchOne()
  }, [fetchOne])

  async function changeStatus(newStatus: string) {
    await fetch(`/api/v1/complaints/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(orgId ? { "x-organization-id": String(orgId) } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    })
    await fetchOne()
  }

  async function postResponse() {
    if (!response.trim()) return
    setPosting(true)
    try {
      // Reuse tickets comments endpoint — TicketComment is shared
      await fetch(`/api/v1/tickets/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": String(orgId) } : {}),
        },
        body: JSON.stringify({ comment: response, isInternal: false }),
      })
      setResponse("")
      await fetchOne()
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Удалить эту запись безвозвратно?")) return
    await fetch(`/api/v1/complaints/${id}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : ({} as Record<string, string>),
    })
    router.push("/complaints")
  }

  if (loading) return <div className="container mx-auto p-6">Загрузка…</div>
  if (!data) return <div className="container mx-auto p-6">Запись не найдена</div>
  const m = data.complaintMeta

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <Link href="/complaints" className="text-sm text-muted-foreground flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-4 h-4" /> К реестру
      </Link>

      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <div className="text-sm text-muted-foreground font-mono">
            #{m?.externalRegistryNumber ?? data.ticketNumber}
          </div>
          <h1 className="text-2xl font-bold mt-1">{data.subject}</h1>
          <div className="flex gap-2 mt-2 items-center">
            <Badge>{data.status}</Badge>
            {m?.riskLevel && <Badge className={riskColors[m.riskLevel]}>риск: {m.riskLevel}</Badge>}
            {m?.complaintType === "suggestion" && <Badge variant="outline">предложение</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          {data.status !== "in_progress" && data.status !== "resolved" && (
            <Button variant="outline" size="sm" onClick={() => changeStatus("in_progress")}>
              <Play className="w-4 h-4 mr-1" /> В работу
            </Button>
          )}
          {data.status !== "resolved" && (
            <Button size="sm" onClick={() => changeStatus("resolved")}>
              <CheckCircle className="w-4 h-4 mr-1" /> Закрыть ok
            </Button>
          )}
          {data.status !== "escalated" && (
            <Button variant="outline" size="sm" onClick={() => changeStatus("escalated")}>
              <AlertCircle className="w-4 h-4 mr-1" /> not ok
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <InfoCard title="Клиент">
          <Row label="ФИО" value={data.contact?.fullName} />
          <Row label="Телефон" value={data.contact?.phone} />
          <Row label="E-mail" value={data.contact?.email} />
        </InfoCard>
        <InfoCard title="Обращение">
          <Row label="Источник" value={data.source} />
          <Row label="Дата" value={new Date(data.createdAt).toLocaleString("ru-RU")} />
          <Row label="Ответственный" value={data.assigneeName} />
        </InfoCard>
        <InfoCard title="Продукт">
          <Row label="Бренд" value={m?.brand} />
          <Row label="Область производства" value={m?.productionArea} />
          <Row label="Категория" value={m?.productCategory} />
          <Row label="Объект" value={m?.complaintObject} />
          <Row label="Объект 2" value={m?.complaintObjectDetail} />
        </InfoCard>
        <InfoCard title="Распределение">
          <Row label="Отдел" value={m?.responsibleDepartment} />
          <Row label="Приоритет" value={data.priority} />
          <Row label="Риск" value={m?.riskLevel} />
        </InfoCard>
      </div>

      <InfoCard title="Содержание (Şikayət məzmunu)">
        <div className="whitespace-pre-wrap text-sm">{data.description || "—"}</div>
      </InfoCard>

      {data.timeline && data.timeline.length > 0 && (
        <InfoCard title={`История изменений (${data.timeline.length})`}>
          <ol className="space-y-2 text-xs">
            {data.timeline.map((ev) => (
              <li key={ev.id} className="flex gap-3 border-l-2 border-muted pl-3">
                <span className="text-muted-foreground min-w-32">
                  {new Date(ev.createdAt).toLocaleString("ru-RU")}
                </span>
                <span className="flex-1">
                  <span className="font-medium">{ev.actor}</span>{" "}
                  <span className="text-muted-foreground">{ev.action === "create" ? "создал" : "обновил"}</span>
                  {ev.action === "update" && ev.newValue && (
                    <TimelineDiff oldValue={ev.oldValue} newValue={ev.newValue} />
                  )}
                </span>
              </li>
            ))}
          </ol>
        </InfoCard>
      )}

      <InfoCard title={`Ответ (Cavab) — ${data.comments.filter((c) => !c.isInternal).length}`}>
        <div className="space-y-3">
          {data.comments
            .filter((c) => !c.isInternal)
            .map((c) => (
              <div key={c.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{c.userName || "Система"}</span>
                  <span>{new Date(c.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <div className="whitespace-pre-wrap">{c.comment}</div>
              </div>
            ))}
          {data.comments.filter((c) => !c.isInternal).length === 0 && (
            <div className="text-sm text-muted-foreground">Пока нет ответов</div>
          )}
        </div>
        <div className="mt-4 space-y-2">
          <Textarea
            placeholder="Написать ответ…"
            rows={4}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
          <div className="flex justify-end">
            <Button size="sm" disabled={posting || !response.trim()} onClick={postResponse}>
              {posting ? "Отправка…" : "Отправить"}
            </Button>
          </div>
        </div>
      </InfoCard>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-dashed last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  )
}

function TimelineDiff({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown>
}) {
  const flatNew = flatten(newValue)
  const flatOld = flatten(oldValue || {})
  const changes = Object.entries(flatNew).filter(([k, v]) => flatOld[k] !== v && v !== undefined)
  if (changes.length === 0) return null
  return (
    <span className="block mt-1 text-muted-foreground">
      {changes.map(([k, v]) => (
        <span key={k} className="inline-block mr-3">
          <span className="text-foreground/70">{k}:</span>{" "}
          {flatOld[k] !== undefined && (
            <>
              <span className="line-through">{String(flatOld[k] ?? "—")}</span>{" "}→{" "}
            </>
          )}
          <span className="font-medium text-foreground">{String(v ?? "—")}</span>
        </span>
      ))}
    </span>
  )
}

function flatten(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        out[`${k}.${k2}`] = v2
      }
    } else {
      out[k] = v
    }
  }
  return out
}
