"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Globe,
  Loader2,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Undo2,
  Redo2,
  Layers,
  Paintbrush,
  LayoutGrid,
  Check,
  ChevronDown,
} from "lucide-react"

interface GrapesEditorProps {
  pageId: string
}

type RightTab = "styles" | "layers"
type Device = "Desktop" | "Tablet" | "Mobile"

export default function GrapesEditor({ pageId }: GrapesEditorProps) {
  const router = useRouter()
  const t = useTranslations("pageEditor")
  const editorRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorInstance = useRef<any>(null)
  const [pageName, setPageName] = useState("...")
  const [pageSlug, setPageSlug] = useState("")
  const [pageStatus, setPageStatus] = useState("draft")
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeDevice, setActiveDevice] = useState<Device>("Desktop")
  const [rightTab, setRightTab] = useState<RightTab>("styles")
  const [saved, setSaved] = useState(false)

  const switchDevice = useCallback((device: Device) => {
    if (!editorInstance.current) return
    editorInstance.current.setDevice(device)
    setActiveDevice(device)
  }, [])

  const handleUndo = useCallback(() => {
    editorInstance.current?.UndoManager?.undo()
  }, [])

  const handleRedo = useCallback(() => {
    editorInstance.current?.UndoManager?.redo()
  }, [])

  useEffect(() => {
    let destroyed = false

    async function init() {
      // @ts-ignore
      await import("grapesjs/dist/css/grapes.min.css")
      const grapesjs = (await import("grapesjs")).default

      if (destroyed || !editorRef.current) return

      const editor = grapesjs.init({
        container: editorRef.current,
        height: "100%",
        width: "auto",
        storageManager: false,
        canvas: {
          styles: [
            "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
            "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
          ],
        },
        panels: { defaults: [] },
        blockManager: {
          appendTo: "#blocks-panel",
        },
        styleManager: {
          appendTo: "#styles-panel",
          sectors: [
            {
              name: "Layout",
              open: true,
              buildProps: ["display", "flex-direction", "justify-content", "align-items", "flex-wrap", "gap"],
            },
            {
              name: "Size",
              open: false,
              buildProps: ["width", "max-width", "min-height", "height", "padding", "margin"],
            },
            {
              name: "Typography",
              open: false,
              buildProps: ["font-family", "font-size", "font-weight", "letter-spacing", "color", "line-height", "text-align", "text-decoration"],
            },
            {
              name: "Background",
              open: false,
              buildProps: ["background-color", "background-image", "background-repeat", "background-position", "background-size"],
            },
            {
              name: "Border",
              open: false,
              buildProps: ["border-radius", "border", "box-shadow"],
            },
          ],
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

      editor.BlockManager.add("lead-form", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg><span>Lead Form</span></div>`,
        category: "Forms",
        content: `
          <form data-gjs-type="lead-form" style="max-width:480px;margin:40px auto;padding:36px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);font-family:Inter,sans-serif;">
            <h3 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">Get in Touch</h3>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;">Fill out the form and we'll get back to you within 24 hours.</p>
            <div style="margin-bottom:18px;">
              <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Name *</label>
              <input type="text" name="name" placeholder="Your full name" required style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;transition:border 0.2s;font-family:inherit;" />
            </div>
            <div style="margin-bottom:18px;">
              <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Email *</label>
              <input type="email" name="email" placeholder="you@company.com" required style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;transition:border 0.2s;font-family:inherit;" />
            </div>
            <div style="margin-bottom:18px;">
              <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Phone</label>
              <input type="tel" name="phone" placeholder="+994 50 123 45 67" style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;transition:border 0.2s;font-family:inherit;" />
            </div>
            <div style="margin-bottom:26px;">
              <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Company</label>
              <input type="text" name="company" placeholder="Company name" style="width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;outline:none;transition:border 0.2s;font-family:inherit;" />
            </div>
            <button type="submit" style="width:100%;padding:13px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;letter-spacing:0.3px;font-family:inherit;">Send Request</button>
          </form>
        `,
      })

      editor.BlockManager.add("hero-section", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg><span>Hero Section</span></div>`,
        category: "Sections",
        content: `
          <section style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#3b82f6 100%);padding:100px 24px;text-align:center;color:#fff;font-family:Inter,sans-serif;">
            <div style="max-width:800px;margin:0 auto;">
              <div style="display:inline-block;padding:6px 16px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:13px;font-weight:500;margin-bottom:24px;backdrop-filter:blur(8px);">Trusted by 500+ companies</div>
              <h1 style="font-size:52px;font-weight:800;margin:0 0 24px;line-height:1.1;letter-spacing:-0.02em;">Build Something<br/>Amazing Today</h1>
              <p style="font-size:20px;opacity:0.85;margin:0 0 40px;line-height:1.6;max-width:600px;display:inline-block;">Transform your business with our powerful platform. Start growing today with tools designed for success.</p>
              <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
                <a href="#contact" style="display:inline-block;padding:15px 36px;background:#fff;color:#1e3a5f;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;transition:transform 0.2s;">Get Started Free</a>
                <a href="#features" style="display:inline-block;padding:15px 36px;background:rgba(255,255,255,0.1);color:#fff;border:1.5px solid rgba(255,255,255,0.3);border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;">Learn More</a>
              </div>
            </div>
          </section>
        `,
      })

      editor.BlockManager.add("features", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg><span>Features</span></div>`,
        category: "Sections",
        content: `
          <section style="padding:80px 24px;background:#f8fafc;font-family:Inter,sans-serif;">
            <div style="max-width:1100px;margin:0 auto;">
              <div style="text-align:center;margin-bottom:56px;">
                <h2 style="font-size:38px;font-weight:700;margin:0 0 16px;color:#0f172a;letter-spacing:-0.01em;">Why Choose Us</h2>
                <p style="font-size:17px;color:#64748b;max-width:550px;margin:0 auto;">Everything you need to grow your business, all in one place.</p>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;">
                <div style="background:#fff;padding:36px 28px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #f1f5f9;">
                  <div style="width:52px;height:52px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:26px;">⚡</div>
                  <h3 style="font-size:19px;font-weight:600;margin:0 0 10px;color:#0f172a;">Lightning Fast</h3>
                  <p style="font-size:15px;color:#64748b;line-height:1.65;margin:0;">Optimized for speed and performance. Get results in milliseconds, not minutes.</p>
                </div>
                <div style="background:#fff;padding:36px 28px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #f1f5f9;">
                  <div style="width:52px;height:52px;background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:26px;">🔒</div>
                  <h3 style="font-size:19px;font-weight:600;margin:0 0 10px;color:#0f172a;">Enterprise Security</h3>
                  <p style="font-size:15px;color:#64748b;line-height:1.65;margin:0;">Bank-grade encryption and compliance built into every layer of the platform.</p>
                </div>
                <div style="background:#fff;padding:36px 28px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #f1f5f9;">
                  <div style="width:52px;height:52px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:26px;">🚀</div>
                  <h3 style="font-size:19px;font-weight:600;margin:0 0 10px;color:#0f172a;">Scale Effortlessly</h3>
                  <p style="font-size:15px;color:#64748b;line-height:1.65;margin:0;">From startup to enterprise, our infrastructure grows seamlessly with you.</p>
                </div>
              </div>
            </div>
          </section>
        `,
      })

      editor.BlockManager.add("testimonials", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg><span>Testimonial</span></div>`,
        category: "Sections",
        content: `
          <section style="padding:80px 24px;background:#fff;font-family:Inter,sans-serif;">
            <div style="max-width:680px;margin:0 auto;text-align:center;">
              <div style="font-size:48px;color:#e5e7eb;margin-bottom:24px;">"</div>
              <blockquote style="font-size:22px;font-weight:500;color:#1e293b;line-height:1.7;margin:0 0 32px;font-style:normal;">This platform completely transformed how we manage our business. The results speak for themselves — 3x growth in just 6 months.</blockquote>
              <div style="display:flex;align-items:center;justify-content:center;gap:14px;">
                <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:600;color:#fff;">JD</div>
                <div style="text-align:left;">
                  <div style="font-weight:600;color:#0f172a;font-size:16px;">Jane Doe</div>
                  <div style="font-size:14px;color:#64748b;">CEO, TechCorp</div>
                </div>
              </div>
            </div>
          </section>
        `,
      })

      editor.BlockManager.add("cta-section", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" /></svg><span>CTA Banner</span></div>`,
        category: "Sections",
        content: `
          <section style="padding:80px 24px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);text-align:center;color:#fff;font-family:Inter,sans-serif;position:relative;overflow:hidden;">
            <div style="position:absolute;inset:0;background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22 width=%2232%22 height=%2232%22 fill=%22none%22 stroke=%22rgba(255,255,255,0.07)%22><path d=%22M0 .5H31.5V32%22/></svg>');"></div>
            <div style="max-width:700px;margin:0 auto;position:relative;">
              <h2 style="font-size:40px;font-weight:700;margin:0 0 16px;letter-spacing:-0.01em;">Ready to Get Started?</h2>
              <p style="font-size:19px;opacity:0.9;margin:0 0 36px;line-height:1.6;">Join thousands of businesses already using our platform to grow faster.</p>
              <a href="#contact" style="display:inline-block;padding:15px 40px;background:#fff;color:#4f46e5;border-radius:10px;font-size:16px;font-weight:600;text-decoration:none;">Start Free Trial</a>
            </div>
          </section>
        `,
      })

      editor.BlockManager.add("footer", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" /></svg><span>Footer</span></div>`,
        category: "Sections",
        content: `
          <footer style="padding:64px 24px 32px;background:#0f172a;color:#94a3b8;font-family:Inter,sans-serif;">
            <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr;gap:40px;">
              <div>
                <h4 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 12px;">YourBrand</h4>
                <p style="font-size:14px;line-height:1.8;margin:0;max-width:300px;">Building the future of business software. Trusted by companies worldwide.</p>
              </div>
              <div>
                <h4 style="color:#fff;font-size:15px;font-weight:600;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">Links</h4>
                <ul style="list-style:none;padding:0;margin:0;font-size:14px;line-height:2.4;">
                  <li><a href="#" style="color:#94a3b8;text-decoration:none;">About</a></li>
                  <li><a href="#" style="color:#94a3b8;text-decoration:none;">Features</a></li>
                  <li><a href="#" style="color:#94a3b8;text-decoration:none;">Pricing</a></li>
                  <li><a href="#" style="color:#94a3b8;text-decoration:none;">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 style="color:#fff;font-size:15px;font-weight:600;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.05em;">Contact</h4>
                <ul style="list-style:none;padding:0;margin:0;font-size:14px;line-height:2.4;">
                  <li>hello@company.com</li>
                  <li>+994 12 345 67 89</li>
                  <li>Baku, Azerbaijan</li>
                </ul>
              </div>
            </div>
            <div style="max-width:1100px;margin:40px auto 0;padding-top:24px;border-top:1px solid #1e293b;text-align:center;font-size:13px;color:#64748b;">
              &copy; 2026 YourBrand. All rights reserved.
            </div>
          </footer>
        `,
      })

      // Text block
      editor.BlockManager.add("text-block", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg><span>Text</span></div>`,
        category: "Basic",
        content: `<div style="padding:20px;font-family:Inter,sans-serif;"><p style="font-size:16px;color:#374151;line-height:1.7;">Insert your text here. Click to edit this paragraph and add your own content.</p></div>`,
      })

      // Image
      editor.BlockManager.add("image-block", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg><span>Image</span></div>`,
        category: "Basic",
        content: { type: "image" },
      })

      // Button
      editor.BlockManager.add("button-block", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672z" /></svg><span>Button</span></div>`,
        category: "Basic",
        content: `<a href="#" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;font-family:Inter,sans-serif;">Click Me</a>`,
      })

      // Divider
      editor.BlockManager.add("divider-block", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5" /></svg><span>Divider</span></div>`,
        category: "Basic",
        content: `<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />`,
      })

      // Spacer
      editor.BlockManager.add("spacer-block", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg><span>Spacer</span></div>`,
        category: "Basic",
        content: `<div style="height:60px;"></div>`,
      })

      // Two columns
      editor.BlockManager.add("two-columns", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg><span>2 Columns</span></div>`,
        category: "Layout",
        content: `
          <div style="display:flex;gap:24px;padding:24px;flex-wrap:wrap;">
            <div style="flex:1;min-width:250px;padding:24px;background:#f8fafc;border-radius:12px;">
              <p style="color:#64748b;font-family:Inter,sans-serif;">Column 1 — drag content here</p>
            </div>
            <div style="flex:1;min-width:250px;padding:24px;background:#f8fafc;border-radius:12px;">
              <p style="color:#64748b;font-family:Inter,sans-serif;">Column 2 — drag content here</p>
            </div>
          </div>
        `,
      })

      // Three columns
      editor.BlockManager.add("three-columns", {
        label: `<div class="block-thumb"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" /></svg><span>3 Columns</span></div>`,
        category: "Layout",
        content: `
          <div style="display:flex;gap:20px;padding:24px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;padding:24px;background:#f8fafc;border-radius:12px;">
              <p style="color:#64748b;font-family:Inter,sans-serif;">Column 1</p>
            </div>
            <div style="flex:1;min-width:200px;padding:24px;background:#f8fafc;border-radius:12px;">
              <p style="color:#64748b;font-family:Inter,sans-serif;">Column 2</p>
            </div>
            <div style="flex:1;min-width:200px;padding:24px;background:#f8fafc;border-radius:12px;">
              <p style="color:#64748b;font-family:Inter,sans-serif;">Column 3</p>
            </div>
          </div>
        `,
      })

      editorInstance.current = editor

      // Load saved page data
      try {
        const res = await fetch(`/api/v1/pages/${pageId}`)
        if (res.ok) {
          const page = await res.json()
          setPageName(page.name || "Untitled Page")
          setPageSlug(page.slug || "")
          setPageStatus(page.status || "draft")

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
    setSaved(false)

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
      setSaved(true)
      toast.success(t("saved"))
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("Save error:", err)
      toast.error(t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    await handleSave()
    setPublishing(true)

    try {
      const res = await fetch(`/api/v1/pages/${pageId}/publish`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Publish failed")
      setPageStatus("published")
      toast.success(t("published"))
    } catch (err) {
      console.error("Publish error:", err)
      toast.error(t("publishFailed"))
    } finally {
      setPublishing(false)
    }
  }

  const handlePreview = () => {
    if (pageSlug) {
      window.open(`/p/${pageSlug}`, "_blank")
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [loaded])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ── Top Toolbar ── */}
      <div className="h-[52px] border-b flex items-center justify-between px-3 bg-background/95 backdrop-blur shrink-0 z-50">
        {/* Left: back + name */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/pages")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate max-w-[200px]">
              {pageName}
            </span>
            {pageStatus === "published" && (
              <span className="text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-1.5 py-0.5 rounded-full">{t("live")}</span>
            )}
            {pageStatus === "draft" && (
              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-1.5 py-0.5 rounded-full">{t("draft")}</span>
            )}
          </div>
        </div>

        {/* Center: device switcher + undo/redo */}
        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-0.5">
          <button
            onClick={handleUndo}
            className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title={t("undo")}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRedo}
            className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title={t("redo")}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={() => switchDevice("Desktop")}
            className={`p-1.5 rounded-md transition-colors ${activeDevice === "Desktop" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => switchDevice("Tablet")}
            className={`p-1.5 rounded-md transition-colors ${activeDevice === "Tablet" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            title="Tablet"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => switchDevice("Mobile")}
            className={`p-1.5 rounded-md transition-colors ${activeDevice === "Mobile" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {pageSlug && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handlePreview}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {t("preview")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={saving || !loaded}
          >
            {saving && !publishing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            {saved ? t("saved") : t("save")}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handlePublish}
            disabled={saving || publishing || !loaded}
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Globe className="h-3.5 w-3.5 mr-1.5" />
            )}
            {t("publish")}
          </Button>
        </div>
      </div>

      {/* ── Editor Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — blocks */}
        <div className="w-[220px] border-r overflow-y-auto bg-muted/20 shrink-0">
          <div className="p-3 border-b bg-background/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("blocks")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("dragHint")}</p>
          </div>
          <div id="blocks-panel" />
        </div>

        {/* GrapesJS canvas */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          <div ref={editorRef} className="h-full" />
        </div>

        {/* Right sidebar — styles & layers with tabs */}
        <div className="w-[260px] border-l overflow-y-auto bg-background shrink-0 flex flex-col">
          <div className="flex border-b shrink-0">
            <button
              onClick={() => setRightTab("styles")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                rightTab === "styles"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              {t("styles")}
            </button>
            <button
              onClick={() => setRightTab("layers")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                rightTab === "layers"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {t("layers")}
            </button>
          </div>
          <div className={`flex-1 overflow-y-auto ${rightTab !== "styles" ? "hidden" : ""}`}>
            <div id="styles-panel" />
          </div>
          <div className={`flex-1 overflow-y-auto ${rightTab !== "layers" ? "hidden" : ""}`}>
            <div id="layers-panel" />
          </div>
        </div>
      </div>

      {/* ── Inject custom GrapesJS styles ── */}
      <style jsx global>{`
        /* Block thumbnails */
        .gjs-block {
          width: calc(50% - 6px) !important;
          min-height: 76px !important;
          border: 1.5px solid hsl(var(--border)) !important;
          border-radius: 10px !important;
          padding: 10px 6px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: hsl(var(--background)) !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04) !important;
          transition: all 0.15s ease !important;
          cursor: grab !important;
        }
        .gjs-block:hover {
          border-color: hsl(var(--primary)) !important;
          background: hsl(var(--primary) / 0.04) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
          transform: translateY(-1px);
        }
        .gjs-block:active {
          cursor: grabbing !important;
          transform: scale(0.97);
        }
        .gjs-block .block-thumb {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: hsl(var(--muted-foreground));
        }
        .gjs-block .block-thumb span {
          font-size: 11px;
          font-weight: 500;
          text-align: center;
          line-height: 1.2;
        }
        .gjs-block:hover .block-thumb {
          color: hsl(var(--foreground));
        }
        .gjs-blocks-cs {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 6px !important;
          padding: 10px !important;
        }
        .gjs-block-category .gjs-title {
          font-size: 11px !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: hsl(var(--muted-foreground)) !important;
          padding: 10px 12px 6px !important;
          background: transparent !important;
          border: none !important;
        }

        /* Canvas */
        .gjs-cv-canvas {
          background: hsl(var(--muted)) !important;
        }
        .gjs-frame-wrapper {
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        }

        /* Selected element */
        .gjs-selected {
          outline: 2px solid hsl(var(--primary)) !important;
          outline-offset: -2px;
        }
        .gjs-highlighter {
          outline: 2px dashed hsl(var(--primary) / 0.5) !important;
        }

        /* Toolbar for selected */
        .gjs-toolbar {
          background: hsl(var(--popover)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
          padding: 2px !important;
        }
        .gjs-toolbar-item {
          padding: 4px 6px !important;
          border-radius: 4px !important;
          color: hsl(var(--foreground)) !important;
        }
        .gjs-toolbar-item:hover {
          background: hsl(var(--muted)) !important;
        }

        /* Style manager */
        .gjs-sm-sector .gjs-sm-sector-title {
          font-size: 12px !important;
          font-weight: 600 !important;
          padding: 10px 12px !important;
          color: hsl(var(--foreground)) !important;
          background: transparent !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        .gjs-sm-property {
          padding: 6px 12px !important;
        }
        .gjs-sm-label {
          font-size: 11px !important;
          color: hsl(var(--muted-foreground)) !important;
          font-weight: 500 !important;
        }
        .gjs-field {
          background: hsl(var(--background)) !important;
          border: 1.5px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          color: hsl(var(--foreground)) !important;
          font-size: 12px !important;
        }
        .gjs-field:focus-within {
          border-color: hsl(var(--primary)) !important;
        }

        /* Layer manager */
        .gjs-layer {
          font-size: 12px !important;
          border-bottom: 1px solid hsl(var(--border) / 0.5) !important;
        }
        .gjs-layer-name {
          color: hsl(var(--foreground)) !important;
          padding: 6px 8px !important;
        }
        .gjs-layer:hover {
          background: hsl(var(--muted) / 0.5) !important;
        }
        .gjs-layer.gjs-selected .gjs-layer-name {
          background: hsl(var(--primary) / 0.1) !important;
        }

        /* Clean up GrapesJS defaults */
        .gjs-one-bg { background: transparent !important; }
        .gjs-two-color { color: hsl(var(--foreground)) !important; }
        .gjs-three-bg { background: hsl(var(--primary)) !important; }
        .gjs-four-color, .gjs-four-color-h:hover { color: hsl(var(--primary)) !important; }

        /* Badge */
        .gjs-badge {
          background: hsl(var(--primary)) !important;
          color: white !important;
          font-size: 10px !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
        }

        /* Resizer */
        .gjs-resizer-c {
          border-color: hsl(var(--primary)) !important;
        }
      `}</style>
    </div>
  )
}

export { GrapesEditor }
