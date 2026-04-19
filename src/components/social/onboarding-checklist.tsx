"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Circle, ChevronDown, ChevronUp, ExternalLink, Link as LinkIcon } from "lucide-react"

interface Props {
  hasFacebook: boolean
  hasInstagram: boolean
  defaultOpen?: boolean
}

export function SocialOnboardingChecklist({ hasFacebook, hasInstagram, defaultOpen }: Props) {
  const t = useTranslations("socialMonitoring")
  // If both already connected, hide the checklist entirely — onboarding done.
  const fullyDone = hasFacebook && hasInstagram
  const [open, setOpen] = useState(defaultOpen ?? !fullyDone)

  if (fullyDone && !open) {
    return (
      <div className="rounded-lg border bg-card p-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {t("onboardingDoneShort")}
        </span>
        <button onClick={() => setOpen(true)} className="text-primary hover:underline">
          {t("onboardingShowSteps")}
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40"
      >
        <div className="text-left">
          <h3 className="text-sm font-semibold">{t("onboardingTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("onboardingSubtitle")}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-3">
          <Step
            done
            title={t("onboardingStep1")}
            help={
              <>
                You manage at least one Facebook Page where you're an admin. If not,{" "}
                <a href="https://www.facebook.com/pages/create" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">
                  create one <ExternalLink className="h-3 w-3" />
                </a>
                .
              </>
            }
          />
          <Step
            done={hasInstagram}
            title={t("onboardingStep2")}
            help={
              <>
                In Instagram app: <b>Edit profile → Page → Connect or create</b>. You can only link Business/Creator accounts. Personal accounts won't show up.{" "}
                <a href="https://help.instagram.com/176235449218188" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">
                  Help <ExternalLink className="h-3 w-3" />
                </a>
              </>
            }
          />
          <Step
            done={hasFacebook}
            title={t("onboardingStep3")}
            help={
              <>
                Click <b>+ Monitor handle → Facebook → Connect Facebook Page</b>. Pick the Pages you want to monitor. Linked Instagram accounts are detected automatically.
              </>
            }
            action={
              !hasFacebook ? (
                <a
                  href="/api/v1/social/oauth/facebook/start"
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  <LinkIcon className="h-3 w-3" /> {t("connectFacebookPage")}
                </a>
              ) : null
            }
          />
          <Step
            done={hasFacebook}
            title={t("onboardingStep4")}
            help={
              <>
                Once connected, each handle gets a <b>↻ Poll now</b> icon — click to fetch new comments. We poll automatically every 15 min once you're past testing mode.
              </>
            }
          />

          <div className="pt-2 mt-1 border-t text-[11px] text-muted-foreground">
            {t("onboardingNote")}
          </div>
        </div>
      )}
    </div>
  )
}

function Step({
  done,
  title,
  help,
  action,
}: {
  done: boolean
  title: string
  help: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        {done ? (
          <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="h-3 w-3 text-emerald-600" />
          </div>
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`text-sm ${done ? "text-muted-foreground line-through" : "font-medium"}`}>{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{help}</p>
        {action && <div className="pt-1.5">{action}</div>}
      </div>
    </div>
  )
}
