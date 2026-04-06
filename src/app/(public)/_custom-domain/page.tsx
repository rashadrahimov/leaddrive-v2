import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

export default async function CustomDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ host?: string; slug?: string }>
}) {
  const { host, slug } = await searchParams

  if (!host) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Domain Not Configured</title>
        </head>
        <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", margin: 0, background: "#f9fafb" }}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Domain Not Configured</h1>
            <p style={{ color: "#6b7280", fontSize: "16px" }}>This domain is not connected to any organization.</p>
          </div>
        </body>
      </html>
    )
  }

  // Find custom domain record
  const customDomain = await prisma.customDomain.findUnique({
    where: { domain: host },
  })

  if (!customDomain || (customDomain.status !== "dns_verified" && customDomain.status !== "ssl_active")) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Domain Not Configured</title>
        </head>
        <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", margin: 0, background: "#f9fafb" }}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>Domain Not Configured</h1>
            <p style={{ color: "#6b7280", fontSize: "16px" }}>This domain is not properly configured. Please contact the site administrator.</p>
            {customDomain?.status === "pending" && (
              <p style={{ color: "#9ca3af", fontSize: "14px", marginTop: "8px" }}>DNS verification is pending.</p>
            )}
            {customDomain?.status === "error" && (
              <p style={{ color: "#ef4444", fontSize: "14px", marginTop: "8px" }}>There was a configuration error. Please check your DNS settings.</p>
            )}
          </div>
        </body>
      </html>
    )
  }

  const organizationId = customDomain.organizationId

  // No slug — show index of available pages or a simple branded page
  if (!slug) {
    const pages = await prisma.landingPage.findMany({
      where: { organizationId, status: "published" },
      select: { name: true, slug: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{host}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        </head>
        <body className="bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="max-w-md w-full mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">{host}</h1>
            {pages.length > 0 ? (
              <div className="space-y-3">
                {pages.map((p: { name: string; slug: string }) => (
                  <a
                    key={p.slug}
                    href={`/${p.slug}`}
                    className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                  >
                    <span className="text-blue-600 font-medium">{p.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No pages available yet.</p>
            )}
            <p className="text-xs text-gray-400 text-center mt-8">
              Powered by{" "}
              <a href="https://leaddrivecrm.org" className="text-blue-500 hover:underline">
                LeadDrive CRM
              </a>
            </p>
          </div>
        </body>
      </html>
    )
  }

  // Find the specific landing page by slug
  const page = await prisma.landingPage.findFirst({
    where: {
      organizationId,
      slug,
      status: "published",
    },
  })

  if (!page) {
    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Page Not Found</title>
        </head>
        <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", margin: 0, background: "#f9fafb" }}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <h1 style={{ fontSize: "48px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>404</h1>
            <p style={{ color: "#6b7280", fontSize: "16px" }}>Page not found.</p>
            <a href="/" style={{ color: "#3b82f6", textDecoration: "underline", marginTop: "16px", display: "inline-block" }}>Go to homepage</a>
          </div>
        </body>
      </html>
    )
  }

  // Track page view
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  const userAgent = headersList.get("user-agent") || null
  const referrer = headersList.get("referer") || null

  // Fire-and-forget: create page view + increment counter
  prisma.pageView
    .create({
      data: {
        landingPageId: page.id,
        visitorIp: ip,
        userAgent,
        referrer,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
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
                      submitBtn.textContent = 'Sending...';
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
                        form.innerHTML = '<div style="text-align:center;padding:32px;"><h3 style="font-size:24px;font-weight:700;color:#059669;margin:0 0 8px;">Thank you!</h3><p style="color:#6b7280;margin:0;">Your submission has been received. We will get back to you shortly.</p></div>';
                      } else {
                        throw new Error('Submit failed');
                      }
                    })
                    .catch(function() {
                      if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit';
                      }
                      alert('Something went wrong. Please try again.');
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
