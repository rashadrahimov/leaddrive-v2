"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  Sparkles,
} from "lucide-react"
import { USER_TIERS, type UserTierId } from "@/lib/modules"
import { PageDescription } from "@/components/page-description"

type Subscription = {
  plan: string
  addons: string[]
  tierInfo: { maxUsers: number; price: number } | null
  hasStripeCustomer: boolean
  subscription: {
    id: string
    status: string | null
    currentPeriodEnd: string | null
    trialEndsAt: string | null
  } | null
  billingConfigured: boolean
}

const TIER_DISPLAY: UserTierId[] = ["tier-5", "tier-10", "tier-25", "tier-50"]

export default function BillingPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || "viewer"
  const canManage = role === "admin" || role === "superadmin"

  const searchParams = useSearchParams()
  const status = searchParams.get("status")

  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const res = await fetch("/api/v1/billing/subscription")
      const json = await res.json()
      if (json.success) setSub(json.data)
    } finally {
      setLoading(false)
    }
  }

  async function startCheckout(tier: UserTierId) {
    setError(null)
    setActioning(tier)
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to start checkout")
        return
      }
      if (json.mode === "updated") {
        await fetchSubscription()
        setError(null)
      } else if (json.url) {
        window.location.href = json.url
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setActioning(null)
    }
  }

  async function openPortal() {
    setError(null)
    setActioning("portal")
    try {
      const res = await fetch("/api/v1/billing/portal", { method: "POST" })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to open billing portal")
        return
      }
      window.location.href = json.url
    } finally {
      setActioning(null)
    }
  }

  const currentTier = sub?.plan as UserTierId | undefined
  const subStatus = sub?.subscription?.status

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Подписка и оплата
        </h1>
        <PageDescription text="Управление тарифным планом и платёжными реквизитами через Stripe. Оплата по карте, автоматическое продление, счета доступны в портале Stripe." />
      </div>

      {status === "success" && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-900 dark:text-emerald-200">Подписка оформлена</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300/80">
              Мы обрабатываем платёж. Обновление плана займёт до минуты — обновите страницу, если статус ещё не изменился.
            </p>
          </div>
        </div>
      )}

      {status === "cancel" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Оплата отменена. Можете выбрать план повторно ниже.
          </p>
        </div>
      )}

      {!loading && sub && !sub.billingConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Приём платежей не настроен на этом инстансе. Обратитесь к администратору, чтобы активировать Stripe-интеграцию.
          </p>
        </div>
      )}

      {subStatus === "past_due" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 p-4">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-medium text-red-900 dark:text-red-200">Неуспешный платёж</p>
            <p className="text-sm text-red-800 dark:text-red-300/80">
              Последний платёж не прошёл. Обновите способ оплаты в портале Stripe — иначе подписка будет приостановлена.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Загрузка…</div>
      ) : sub ? (
        <>
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground tracking-widest">Текущий план</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{displayPlan(sub.plan)}</h2>
                  {subStatus && <StatusBadge status={subStatus} />}
                </div>
                {sub.tierInfo && sub.tierInfo.maxUsers > 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    до {sub.tierInfo.maxUsers} пользователей · ${sub.tierInfo.price}/месяц
                  </p>
                )}
                {sub.subscription?.currentPeriodEnd && (
                  <p className="text-xs text-muted-foreground">
                    Следующее списание: {new Date(sub.subscription.currentPeriodEnd).toLocaleDateString("ru-RU")}
                  </p>
                )}
                {sub.subscription?.trialEndsAt && (
                  <p className="text-xs text-amber-600">
                    Триал заканчивается: {new Date(sub.subscription.trialEndsAt).toLocaleDateString("ru-RU")}
                  </p>
                )}
              </div>
              {canManage && sub.hasStripeCustomer && (
                <Button variant="outline" onClick={openPortal} disabled={actioning === "portal"}>
                  {actioning === "portal" ? "Открываю…" : "Управлять подпиской"}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </Card>

          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Тарифные планы
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TIER_DISPLAY.map((tier) => {
                const info = USER_TIERS[tier]
                const isCurrent = tier === currentTier
                const discount = info.discount
                return (
                  <Card
                    key={tier}
                    className={isCurrent ? "p-5 border-primary ring-2 ring-primary/20" : "p-5"}
                  >
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">до {info.maxUsers} польз.</h4>
                          {discount > 0 && (
                            <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-600">
                              −{discount}%
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1">
                          <span className="text-2xl font-bold">${info.price}</span>
                          <span className="text-xs text-muted-foreground">/мес</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          ${info.pricePerUser} за пользователя
                        </p>
                      </div>

                      {isCurrent ? (
                        <Button disabled variant="outline" className="w-full">
                          Текущий план
                        </Button>
                      ) : canManage ? (
                        <Button
                          className="w-full"
                          disabled={!sub.billingConfigured || actioning === tier}
                          onClick={() => startCheckout(tier)}
                        >
                          {actioning === tier
                            ? "…"
                            : sub.subscription
                              ? "Перейти на этот план"
                              : "Выбрать"}
                        </Button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center">
                          Только администратор может менять план
                        </p>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="p-5 mt-4 bg-muted/30">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="font-semibold">Enterprise</h4>
                  <p className="text-sm text-muted-foreground">
                    Более 50 пользователей, выделенный сервер, кастомные интеграции, SLA, SSO.
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <a href="mailto:sales@leaddrivecrm.org?subject=Enterprise plan">
                    Связаться с продажами
                  </a>
                </Button>
              </div>
            </Card>
          </div>

          {error && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded p-3">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          Не удалось загрузить информацию о подписке.
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:     { label: "активна",    cls: "border-emerald-400 text-emerald-600" },
    trialing:   { label: "триал",       cls: "border-sky-400 text-sky-600" },
    past_due:   { label: "просрочка",   cls: "border-red-400 text-red-600" },
    canceled:   { label: "отменена",    cls: "border-muted-foreground text-muted-foreground" },
    incomplete: { label: "ожидает",     cls: "border-amber-400 text-amber-600" },
  }
  const entry = map[status] || { label: status, cls: "border-muted-foreground text-muted-foreground" }
  return (
    <Badge variant="outline" className={`text-[10px] ${entry.cls}`}>
      {entry.label}
    </Badge>
  )
}

function displayPlan(plan: string): string {
  const labels: Record<string, string> = {
    "tier-5":     "До 5 пользователей",
    "tier-10":    "До 10 пользователей",
    "tier-25":    "До 25 пользователей",
    "tier-50":    "До 50 пользователей",
    "enterprise": "Enterprise",
    "starter":    "Starter (устарел)",
    "business":   "Business (устарел)",
    "professional":"Professional (устарел)",
  }
  return labels[plan] || plan
}
