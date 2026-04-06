"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Save, Globe, Loader2 } from "lucide-react"
// CSS imported dynamically in useEffect to avoid SSR issues

interface GrapesEditorProps {
  pageId: string
}

export default function GrapesEditor({ pageId }: GrapesEditorProps) {
  const router = useRouter()
  const editorRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorInstance = useRef<any>(null)
  const [pageName, setPageName] = useState("Loading...")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let destroyed = false

    async function init() {
      // Load CSS dynamically
      await import("grapesjs/dist/css/grapes.min.css")
      const grapesjs = (await import("grapesjs")).default

      if (destroyed || !editorRef.current) return

      const editor = grapesjs.init({
        container: editorRef.current,
        height: "100vh",
        width: "auto",
        storageManager: false,
        canvas: {
          styles: [
            "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
          ],
        },
        panels: { defaults: [] },
        blockManager: {
          appendTo: "#blocks-panel",
        },
        styleManager: {
          appendTo: "#styles-panel",
        },
        layerManager: {
          appendTo: "#layers-panel",
        },
        deviceManager: {
          devices: [
            { name: "Desktop", width: "" },
            { name: "Tablet", width: "768px", widthMedia: "992px" },
            { name: "Mobile", width: "375px", widthMedia: "480px" },
          ],
        },
      })

      // --- Custom Blocks ---

      // Lead Form
      editor.BlockManager.add("lead-form", {
        label: "Lead Form",
        category: "Forms",
        content: `
          <form data-gjs-type="lead-form" style="max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <h3 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111;">Get in Touch</h3>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px;">Name</label>
              <input type="text" name="name" placeholder="Your name" required style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;" />
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px;">Email</label>
              <input type="email" name="email" placeholder="you@company.com" required style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;" />
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px;">Phone</label>
              <input type="tel" name="phone" placeholder="+1 (555) 000-0000" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;" />
            </div>
            <div style="margin-bottom:24px;">
              <label style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:4px;">Company</label>
              <input type="text" name="company" placeholder="Company name" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;outline:none;" />
            </div>
            <button type="submit" style="width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">Submit</button>
          </form>
        `,
        attributes: { class: "fa fa-wpforms" },
      })

      // Hero Section
      editor.BlockManager.add("hero-section", {
        label: "Hero Section",
        category: "Sections",
        content: `
          <section style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:96px 24px;text-align:center;color:#fff;">
            <div style="max-width:800px;margin:0 auto;">
              <h1 style="font-size:48px;font-weight:800;margin:0 0 24px;line-height:1.1;">Build Something Amazing</h1>
              <p style="font-size:20px;opacity:0.9;margin:0 0 40px;line-height:1.6;">Transform your business with our powerful platform. Start growing today with tools designed for success.</p>
              <a href="#contact" style="display:inline-block;padding:16px 40px;background:#fff;color:#2563eb;border-radius:8px;font-size:18px;font-weight:600;text-decoration:none;">Get Started</a>
            </div>
          </section>
        `,
        attributes: { class: "fa fa-header" },
      })

      // Features
      editor.BlockManager.add("features", {
        label: "Features Grid",
        category: "Sections",
        content: `
          <section style="padding:80px 24px;background:#f9fafb;">
            <div style="max-width:1100px;margin:0 auto;">
              <h2 style="text-align:center;font-size:36px;font-weight:700;margin:0 0 48px;color:#111;">Why Choose Us</h2>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;">
                <div style="background:#fff;padding:32px;border-radius:12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                  <div style="width:56px;height:56px;background:#dbeafe;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">&#9889;</div>
                  <h3 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#111;">Lightning Fast</h3>
                  <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0;">Optimized for speed and performance. Get results in milliseconds.</p>
                </div>
                <div style="background:#fff;padding:32px;border-radius:12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                  <div style="width:56px;height:56px;background:#dcfce7;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">&#128274;</div>
                  <h3 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#111;">Enterprise Security</h3>
                  <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0;">Bank-grade encryption and compliance built into every layer.</p>
                </div>
                <div style="background:#fff;padding:32px;border-radius:12px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
                  <div style="width:56px;height:56px;background:#fef3c7;border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">&#128640;</div>
                  <h3 style="font-size:20px;font-weight:600;margin:0 0 12px;color:#111;">Scale Effortlessly</h3>
                  <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0;">From startup to enterprise, our platform grows with you.</p>
                </div>
              </div>
            </div>
          </section>
        `,
        attributes: { class: "fa fa-th-large" },
      })

      // Testimonials
      editor.BlockManager.add("testimonials", {
        label: "Testimonial",
        category: "Sections",
        content: `
          <section style="padding:64px 24px;background:#fff;">
            <div style="max-width:640px;margin:0 auto;text-align:center;">
              <blockquote style="font-size:20px;font-style:italic;color:#374151;line-height:1.7;margin:0 0 24px;">"This platform completely transformed how we manage our business. The results speak for themselves — 3x growth in just 6 months."</blockquote>
              <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
                <div style="width:48px;height:48px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:#6b7280;">JD</div>
                <div style="text-align:left;">
                  <div style="font-weight:600;color:#111;">Jane Doe</div>
                  <div style="font-size:14px;color:#6b7280;">CEO, TechCorp</div>
                </div>
              </div>
            </div>
          </section>
        `,
        attributes: { class: "fa fa-quote-right" },
      })

      // CTA Section
      editor.BlockManager.add("cta-section", {
        label: "CTA Banner",
        category: "Sections",
        content: `
          <section style="padding:80px 24px;background:#2563eb;text-align:center;color:#fff;">
            <div style="max-width:700px;margin:0 auto;">
              <h2 style="font-size:36px;font-weight:700;margin:0 0 16px;">Ready to Get Started?</h2>
              <p style="font-size:18px;opacity:0.9;margin:0 0 32px;">Join thousands of businesses already using our platform.</p>
              <a href="#contact" style="display:inline-block;padding:14px 36px;background:#fff;color:#2563eb;border-radius:8px;font-size:16px;font-weight:600;text-decoration:none;">Start Free Trial</a>
            </div>
          </section>
        `,
        attributes: { class: "fa fa-bullhorn" },
      })

      // Footer
      editor.BlockManager.add("footer", {
        label: "Footer",
        category: "Sections",
        content: `
          <footer style="padding:64px 24px 32px;background:#111827;color:#9ca3af;">
            <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:32px;">
              <div>
                <h4 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 16px;">Company</h4>
                <p style="font-size:14px;line-height:1.8;margin:0;">Building the future of business software. Trusted by 10,000+ companies worldwide.</p>
              </div>
              <div>
                <h4 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 16px;">Links</h4>
                <ul style="list-style:none;padding:0;margin:0;font-size:14px;line-height:2.2;">
                  <li><a href="#" style="color:#9ca3af;text-decoration:none;">About</a></li>
                  <li><a href="#" style="color:#9ca3af;text-decoration:none;">Features</a></li>
                  <li><a href="#" style="color:#9ca3af;text-decoration:none;">Pricing</a></li>
                  <li><a href="#" style="color:#9ca3af;text-decoration:none;">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 16px;">Contact</h4>
                <ul style="list-style:none;padding:0;margin:0;font-size:14px;line-height:2.2;">
                  <li>hello@company.com</li>
                  <li>+1 (555) 123-4567</li>
                  <li>San Francisco, CA</li>
                </ul>
              </div>
            </div>
            <div style="max-width:1100px;margin:32px auto 0;padding-top:24px;border-top:1px solid #374151;text-align:center;font-size:13px;">
              &copy; 2026 Company. All rights reserved.
            </div>
          </footer>
        `,
        attributes: { class: "fa fa-columns" },
      })

      editorInstance.current = editor

      // Load saved page data
      try {
        const res = await fetch(`/api/v1/pages/${pageId}`)
        if (res.ok) {
          const page = await res.json()
          setPageName(page.name || "Untitled Page")

          if (page.gjsData) {
            editor.loadProjectData(
              typeof page.gjsData === "string"
                ? JSON.parse(page.gjsData)
                : page.gjsData
            )
          } else if (page.htmlContent) {
            editor.setComponents(page.htmlContent)
            if (page.cssContent) {
              editor.setStyle(page.cssContent)
            }
          }
        }
      } catch (err) {
        console.error("Failed to load page data:", err)
      }

      setLoaded(true)
    }

    init()

    return () => {
      destroyed = true
      if (editorInstance.current) {
        editorInstance.current.destroy()
        editorInstance.current = null
      }
    }
  }, [pageId])

  const handleSave = async () => {
    if (!editorInstance.current) return
    setSaving(true)

    try {
      const editor = editorInstance.current
      const gjsData = editor.getProjectData()
      const html = editor.getHtml()
      const css = editor.getCss()

      const res = await fetch(`/api/v1/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gjsData, htmlContent: html, cssContent: css }),
      })

      if (!res.ok) throw new Error("Save failed")
    } catch (err) {
      console.error("Save error:", err)
      alert("Failed to save page")
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setSaving(true)
    // Save first, then publish
    await handleSave()
    setPublishing(true)

    try {
      const res = await fetch(`/api/v1/pages/${pageId}/publish`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Publish failed")
      alert("Page published successfully!")
    } catch (err) {
      console.error("Publish error:", err)
      alert("Failed to publish page")
    } finally {
      setPublishing(false)
      setSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header bar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/pages")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm truncate max-w-[200px]">
            {pageName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || !loaded}
          >
            {saving && !publishing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            onClick={handlePublish}
            disabled={saving || publishing || !loaded}
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* Editor layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — blocks */}
        <div className="w-[240px] border-r overflow-y-auto bg-background shrink-0">
          <div className="p-3 border-b">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Blocks
            </h3>
          </div>
          <div id="blocks-panel" />
        </div>

        {/* GrapesJS canvas */}
        <div className="flex-1 overflow-hidden">
          <div ref={editorRef} className="h-full" />
        </div>

        {/* Right sidebar — styles & layers */}
        <div className="w-[260px] border-l overflow-y-auto bg-background shrink-0">
          <div className="p-3 border-b">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Styles
            </h3>
          </div>
          <div id="styles-panel" />
          <div className="p-3 border-b border-t">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Layers
            </h3>
          </div>
          <div id="layers-panel" />
        </div>
      </div>
    </div>
  )
}

export { GrapesEditor }
