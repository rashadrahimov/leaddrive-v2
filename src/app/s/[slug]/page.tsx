import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { SurveyForm } from "./survey-form"

export const dynamic = "force-dynamic"

export default async function PublicSurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const survey = await prisma.survey.findUnique({
    where: { publicSlug: slug },
    include: { organization: { select: { name: true, branding: true, logo: true } } },
  })
  if (!survey || survey.status !== "active") notFound()

  // If the link includes ?e=email or ?p=phone, look up a prior response so
  // we can pre-fill the form instead of showing a "already submitted" wall.
  const lookupEmail = sp.e?.toLowerCase().trim() || null
  const lookupPhone = sp.p || null
  let priorResponse: { score: number | null; comment: string | null } | null = null
  if (lookupEmail || lookupPhone) {
    const or: any[] = []
    if (lookupEmail) or.push({ email: lookupEmail })
    if (lookupPhone) or.push({ phone: lookupPhone })
    priorResponse = await prisma.surveyResponse.findFirst({
      where: { surveyId: survey.id, OR: or },
      orderBy: { completedAt: "desc" },
      select: { score: true, comment: true },
    })
  }

  const branding = (survey.organization.branding as any) || {}
  const primaryColor: string = branding.primaryColor || "#0176D3"
  const companyName: string = branding.companyName || survey.organization.name
  const logo: string | null = survey.organization.logo || branding.logo || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card rounded-2xl shadow-xl border p-8">
        <div className="mb-6 flex items-start gap-3">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={companyName} className="h-10 w-10 object-contain rounded" />
          )}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{companyName}</p>
            <h1 className="text-2xl font-bold mt-1">{survey.name}</h1>
            {survey.description && <p className="text-sm text-muted-foreground mt-2">{survey.description}</p>}
          </div>
        </div>
        <SurveyForm
          slug={slug}
          type={survey.type}
          questions={(survey.questions as any[]) || []}
          thankYouText={survey.thankYouText}
          primaryColor={primaryColor}
          initialScore={priorResponse?.score ?? null}
          initialComment={priorResponse?.comment ?? null}
          initialEmail={lookupEmail}
          initialPhone={lookupPhone}
        />
      </div>
    </div>
  )
}
