import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"

export const dynamic = "force-dynamic"

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const t = await getTranslations("publicPage")

  // Find published page by slug (across all orgs for public access)
  const page = await prisma.landingPage.findFirst({
    where: {
      slug,
      status: "published",
    },
  })

  if (!page) {
    return notFound()
  }

  // Track page view
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  const userAgent = headersList.get("user-agent") || null
  const referrer = headersList.get("referer") || null

  // Parse UTM params from referrer or current URL
  const utmSource = null
  const utmMedium = null
  const utmCampaign = null

  // Fire-and-forget: create page view + increment counter
  prisma.pageView
    .create({
      data: {
        landingPageId: page.id,
        visitorIp: ip,
        userAgent,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
      },
    })
    .catch(() => {})

  prisma.landingPage
    .update({
      where: { id: page.id },
      data: { totalViews: { increment: 1 } },
    })
    .catch(() => {})

  const title = page.metaTitle || page.name
  const description = page.metaDescription || ""
  const ogImage = page.ogImage || ""

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        {description && <meta name="description" content={description} />}
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:title" content={title} />
        {description && (
          <meta property="og:description" content={description} />
        )}
        <link
          href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
          rel="stylesheet"
        />
        {page.cssContent && <style dangerouslySetInnerHTML={{ __html: page.cssContent }} />}
      </head>
      <body>
        {page.htmlContent && (
          <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
        )}

        {/* Form submission handler */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                var forms = document.querySelectorAll('[data-gjs-type="lead-form"]');
                forms.forEach(function(form) {
                  form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    var formData = {};
                    var inputs = form.querySelectorAll('input, textarea, select');
                    inputs.forEach(function(input) {
                      if (input.name) {
                        formData[input.name] = input.value;
                      }
                    });

                    var submitBtn = form.querySelector('button[type="submit"]');
                    if (submitBtn) {
                      submitBtn.disabled = true;
                      submitBtn.textContent = '${t("sending")}';
                    }

                    fetch('/api/v1/public/form-submit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        pageSlug: '${slug}',
                        pageId: '${page.id}',
                        organizationId: '${page.organizationId}',
                        formData: formData
                      })
                    })
                    .then(function(res) {
                      if (res.ok) {
                        form.innerHTML = '<div style="text-align:center;padding:32px;"><h3 style="font-size:24px;font-weight:700;color:#059669;margin:0 0 8px;">${t("thankYou")}</h3><p style="color:#6b7280;margin:0;">${t("submissionReceived")}</p></div>';
                      } else {
                        throw new Error('Submit failed');
                      }
                    })
                    .catch(function() {
                      if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '${t("submit")}';
                      }
                      alert('${t("somethingWentWrong")}');
                    });
                  });
                });
              });
            `,
          }}
        />
      </body>
    </html>
  )
}
