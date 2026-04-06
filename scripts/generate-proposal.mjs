import PptxGenJS from "pptxgenjs"

const pptx = new PptxGenJS()

// ─── BRIGHT Brand Colors ───
const PRIMARY = "0066FF"       // Vibrant blue
const PRIMARY_DARK = "0044CC"
const SECONDARY = "7C3AED"     // Purple
const ACCENT = "06B6D4"        // Cyan
const SUCCESS = "10B981"       // Green
const WARNING = "F59E0B"       // Amber
const DANGER = "EF4444"        // Red
const PINK = "EC4899"          // Pink
const ORANGE = "F97316"        // Orange
const WHITE = "FFFFFF"
const LIGHT = "F8FAFC"
const CARD_BG = "FFFFFF"
const DARK = "0F172A"
const TEXT = "1E293B"
const MUTED = "64748B"
const BORDER = "E2E8F0"
const BLUE_LIGHT = "EFF6FF"
const PURPLE_LIGHT = "F5F3FF"
const GREEN_LIGHT = "ECFDF5"
const AMBER_LIGHT = "FFFBEB"
const CYAN_LIGHT = "ECFEFF"

pptx.author = "Guven Technology LLC"
pptx.company = "Guven Technology LLC"
pptx.title = "LeadDrive CRM — Kommersiya Teklifi"
pptx.subject = "CRM Platformasi"
pptx.layout = "LAYOUT_WIDE" // 13.33 x 7.5

// Helper: gradient header bar
function addHeader(slide, title, subtitle, bgColor) {
  // Full-width gradient header
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.4, fill: { color: bgColor || PRIMARY } })
  // Decorative circles
  slide.addShape(pptx.ShapeType.ellipse, { x: 11.5, y: -0.5, w: 2.5, h: 2.5, fill: { color: WHITE, transparency: 90 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: 10.0, y: -1.0, w: 3.5, h: 3.5, fill: { color: WHITE, transparency: 95 } })
  slide.addText(title, { x: 0.8, y: 0.2, w: 10, h: 0.6, fontSize: 26, color: WHITE, fontFace: "Arial", bold: true })
  if (subtitle) {
    slide.addText(subtitle, { x: 0.8, y: 0.75, w: 10, h: 0.4, fontSize: 13, color: WHITE, fontFace: "Arial", transparency: 20 })
  }
}

// Helper: mock window frame
function addMockWindow(slide, x, y, w, h, title) {
  // Window shadow
  slide.addShape(pptx.ShapeType.roundRect, { x: x + 0.04, y: y + 0.04, w, h, fill: { color: "000000", transparency: 85 }, rectRadius: 0.12 })
  // Window body
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: WHITE }, rectRadius: 0.12, line: { color: BORDER, width: 1 } })
  // Title bar
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.4, fill: { color: LIGHT }, rectRadius: 0.12 })
  slide.addShape(pptx.ShapeType.rect, { x, y: y + 0.2, w, h: 0.2, fill: { color: LIGHT } })
  // Traffic lights
  slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.2, y: y + 0.12, w: 0.16, h: 0.16, fill: { color: "FF5F57" } })
  slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.42, y: y + 0.12, w: 0.16, h: 0.16, fill: { color: "FEBC2E" } })
  slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.64, y: y + 0.12, w: 0.16, h: 0.16, fill: { color: "28C840" } })
  if (title) {
    slide.addText(title, { x: x + 1.0, y: y + 0.05, w: w - 1.5, h: 0.3, fontSize: 9, color: MUTED, fontFace: "Arial", align: "center" })
  }
}

// Helper: sidebar in mock screenshot
function addMockSidebar(slide, x, y, h, items) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 1.8, h, fill: { color: DARK } })
  // Logo
  slide.addText("LD", { x: x + 0.15, y: y + 0.15, w: 0.4, h: 0.3, fontSize: 11, color: PRIMARY, fontFace: "Arial", bold: true })
  slide.addText("LeadDrive", { x: x + 0.55, y: y + 0.15, w: 1.2, h: 0.3, fontSize: 9, color: WHITE, fontFace: "Arial", bold: true })
  for (let i = 0; i < items.length; i++) {
    const isActive = items[i].active
    if (isActive) {
      slide.addShape(pptx.ShapeType.roundRect, { x: x + 0.1, y: y + 0.6 + i * 0.32, w: 1.6, h: 0.28, fill: { color: PRIMARY }, rectRadius: 0.06 })
    }
    slide.addText(items[i].label, {
      x: x + 0.25, y: y + 0.6 + i * 0.32, w: 1.4, h: 0.28,
      fontSize: 7.5, color: isActive ? WHITE : "94A3B8", fontFace: "Arial",
    })
  }
}

// Helper: stat card
function addStatCard(slide, x, y, w, h, value, label, color) {
  slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: WHITE }, rectRadius: 0.08, line: { color: BORDER, width: 0.5 } })
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.05, fill: { color } })
  slide.addText(value, { x: x + 0.12, y: y + 0.12, w: w - 0.24, h: 0.35, fontSize: 16, color: DARK, fontFace: "Arial", bold: true })
  slide.addText(label, { x: x + 0.12, y: y + 0.45, w: w - 0.24, h: 0.22, fontSize: 8, color: MUTED, fontFace: "Arial" })
}

// ═══════════════════════════════════════════════════
// SLIDE 1: Cover — Bright gradient
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  // Gradient-like: top part blue, bottom part purple
  slide.background = { fill: PRIMARY }
  // Purple overlay bottom half
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.5, w: 13.33, h: 4.0, fill: { color: SECONDARY, transparency: 40 } })
  // Decorative shapes
  slide.addShape(pptx.ShapeType.ellipse, { x: -2, y: -2, w: 7, h: 7, fill: { color: WHITE, transparency: 92 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: 9, y: 4, w: 6, h: 6, fill: { color: WHITE, transparency: 92 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: 5, y: -3, w: 4, h: 4, fill: { color: ACCENT, transparency: 85 } })

  // Logo
  slide.addText("LeadDrive CRM", {
    x: 0.8, y: 0.8, w: 6, h: 0.5,
    fontSize: 18, color: WHITE, fontFace: "Arial", bold: true, transparency: 10,
  })

  // Main title
  slide.addText("Muasir Biznesiniz ucun\nAgilli CRM Platformasi", {
    x: 0.8, y: 2.0, w: 6.5, h: 1.8,
    fontSize: 40, color: WHITE, fontFace: "Arial", bold: true, lineSpacingMultiple: 1.15,
  })

  // Subtitle
  slide.addText("Satis, Marketinq, Destek ve Maliyye — hamisi bir platformada.\nSuni intellekt ile guclendirilmis.", {
    x: 0.8, y: 4.0, w: 6, h: 0.9,
    fontSize: 15, color: WHITE, fontFace: "Arial", lineSpacingMultiple: 1.4, transparency: 15,
  })

  // CTA badge
  slide.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 5.2, w: 3.0, h: 0.55, fill: { color: WHITE }, rectRadius: 0.28 })
  slide.addText("Demo Sifaris Edin  ->", { x: 0.8, y: 5.2, w: 3.0, h: 0.55, fontSize: 13, color: PRIMARY, fontFace: "Arial", bold: true, align: "center", valign: "middle" })

  // Company
  slide.addText("Guven Technology LLC  |  Baki, Azerbaycan  |  leaddrivecrm.org", {
    x: 0.8, y: 6.7, w: 7, h: 0.35, fontSize: 11, color: WHITE, fontFace: "Arial", transparency: 30,
  })

  // Right side: floating mock dashboard card
  addMockWindow(slide, 7.5, 1.0, 5.2, 5.3, "app.leaddrivecrm.org")

  // Mini sidebar
  slide.addShape(pptx.ShapeType.rect, { x: 7.5, y: 1.4, w: 1.1, h: 4.9, fill: { color: DARK } })
  slide.addText("LD", { x: 7.6, y: 1.5, w: 0.9, h: 0.25, fontSize: 9, color: PRIMARY, fontFace: "Arial", bold: true })
  const sideItems = ["Idare Paneli", "Sirketler", "Sovdelesmeler", "Lidler", "Tapshiriqlar", "Inbox", "Hesabatlar"]
  for (let i = 0; i < sideItems.length; i++) {
    const active = i === 0
    if (active) slide.addShape(pptx.ShapeType.roundRect, { x: 7.57, y: 1.88 + i * 0.28, w: 0.96, h: 0.24, fill: { color: PRIMARY }, rectRadius: 0.04 })
    slide.addText(sideItems[i], { x: 7.65, y: 1.88 + i * 0.28, w: 0.85, h: 0.24, fontSize: 6, color: active ? WHITE : "94A3B8", fontFace: "Arial" })
  }

  // Dashboard content area
  const cx = 8.75, cy = 1.5
  // KPI cards row
  const kpis = [
    { v: "$847K", l: "Gelir", c: SUCCESS },
    { v: "1,234", l: "Lidler", c: PRIMARY },
    { v: "89", l: "Sovdelesmeler", c: SECONDARY },
    { v: "34%", l: "Konversiya", c: WARNING },
  ]
  for (let i = 0; i < kpis.length; i++) {
    const kx = cx + 0.15 + i * 0.95
    slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: cy, w: 0.85, h: 0.6, fill: { color: LIGHT }, rectRadius: 0.05 })
    slide.addText(kpis[i].v, { x: kx + 0.05, y: cy + 0.05, w: 0.75, h: 0.3, fontSize: 10, color: kpis[i].c, fontFace: "Arial", bold: true })
    slide.addText(kpis[i].l, { x: kx + 0.05, y: cy + 0.35, w: 0.75, h: 0.2, fontSize: 6, color: MUTED, fontFace: "Arial" })
  }

  // Mock chart area
  slide.addShape(pptx.ShapeType.roundRect, { x: cx + 0.15, y: cy + 0.75, w: 3.7, h: 1.8, fill: { color: LIGHT }, rectRadius: 0.06 })
  slide.addText("Satis Pipeline", { x: cx + 0.3, y: cy + 0.82, w: 2, h: 0.2, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })
  // Bars
  const bars = [
    { h: 0.4, c: PRIMARY }, { h: 0.7, c: SECONDARY }, { h: 1.1, c: SUCCESS },
    { h: 0.85, c: ACCENT }, { h: 0.55, c: WARNING }, { h: 0.95, c: PINK },
  ]
  for (let i = 0; i < bars.length; i++) {
    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx + 0.4 + i * 0.55, y: cy + 2.35 - bars[i].h, w: 0.35, h: bars[i].h,
      fill: { color: bars[i].c }, rectRadius: 0.04,
    })
  }

  // Recent table
  slide.addShape(pptx.ShapeType.roundRect, { x: cx + 0.15, y: cy + 2.7, w: 3.7, h: 1.8, fill: { color: LIGHT }, rectRadius: 0.06 })
  slide.addText("Son Sovdelesmeler", { x: cx + 0.3, y: cy + 2.78, w: 2, h: 0.2, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })
  const rows = [
    ["Acme Corp", "$45,000", "Danisiq"],
    ["Beta LLC", "$23,000", "Teklif"],
    ["Delta Ltd", "$67,000", "Uduldu"],
    ["Echo Co", "$12,500", "Lead"],
  ]
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < 3; c++) {
      slide.addText(rows[r][c], {
        x: cx + 0.3 + c * 1.2, y: cy + 3.1 + r * 0.32, w: 1.1, h: 0.28,
        fontSize: 6, color: c === 2 ? PRIMARY : TEXT, fontFace: "Arial", bold: c === 2,
      })
    }
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 2: Platform Overview
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "Platforma Haqqinda", "LeadDrive CRM — IT autsorsing sirketleri ucun tam funksional SaaS CRM", PRIMARY)

  // Stats row with bright cards
  const stats = [
    { value: "94+", label: "Sehife", color: PRIMARY, bg: BLUE_LIGHT },
    { value: "330+", label: "API endpoint", color: SECONDARY, bg: PURPLE_LIGHT },
    { value: "41", label: "DB Model", color: SUCCESS, bg: GREEN_LIGHT },
    { value: "5+", label: "AI xususiyyeti", color: WARNING, bg: AMBER_LIGHT },
    { value: "8+", label: "Kanal (Inbox)", color: ACCENT, bg: CYAN_LIGHT },
  ]
  for (let i = 0; i < stats.length; i++) {
    const x = 0.6 + i * 2.5
    slide.addShape(pptx.ShapeType.roundRect, { x, y: 1.7, w: 2.2, h: 1.2, fill: { color: stats[i].bg }, rectRadius: 0.12 })
    slide.addText(stats[i].value, { x, y: 1.8, w: 2.2, h: 0.55, fontSize: 28, color: stats[i].color, fontFace: "Arial", bold: true, align: "center" })
    slide.addText(stats[i].label, { x, y: 2.35, w: 2.2, h: 0.35, fontSize: 11, color: MUTED, fontFace: "Arial", align: "center" })
  }

  // Module grid — 2x4
  const modules = [
    { title: "CRM & Satis", desc: "Lidler, kontaktlar, sirketler, sovdelesmeler, kanban, coxlu pipeline", color: PRIMARY, icon: "CRM" },
    { title: "Marketinq", desc: "Kampaniyalar, seqmentler, journey builder, A/B test, email sablonlar", color: SECONDARY, icon: "MKT" },
    { title: "Destek & Inbox", desc: "Tiketler, SLA, bilik bazasi, WhatsApp, Telegram, Facebook, Email", color: ACCENT, icon: "SUP" },
    { title: "Maliyye", desc: "Fakturalar, muqavileler, budceleme, rentabellik, xerc modeli", color: WARNING, icon: "FIN" },
    { title: "AI & Da Vinci", desc: "AI agentler, lid skorinq, proqnozlasdirma, next best action", color: PINK, icon: "AI" },
    { title: "Platforma", desc: "SSO, API keys, webhooks, RBAC, audit log, custom fields", color: SUCCESS, icon: "PLT" },
    { title: "Hesabatlar", desc: "Pipeline, funnel, CSAT, SLA, gelir trendi, 10+ hazir hesabat", color: ORANGE, icon: "RPT" },
    { title: "Avtomatlasma", desc: "Workflow engine, rule-based triggers, 7 emeliyyat novu", color: DANGER, icon: "AUT" },
  ]

  for (let i = 0; i < modules.length; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = 0.6 + col * 3.15
    const y = 3.2 + row * 2.1

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.9, h: 1.85, fill: { color: WHITE }, rectRadius: 0.12,
      shadow: { type: "outer", blur: 8, offset: 2, color: "000000", opacity: 0.06 },
    })
    // Color badge
    slide.addShape(pptx.ShapeType.roundRect, { x: x + 0.2, y: y + 0.2, w: 0.55, h: 0.55, fill: { color: modules[i].color }, rectRadius: 0.12 })
    slide.addText(modules[i].icon, { x: x + 0.2, y: y + 0.2, w: 0.55, h: 0.55, fontSize: 9, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
    slide.addText(modules[i].title, { x: x + 0.2, y: y + 0.85, w: 2.5, h: 0.3, fontSize: 12, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(modules[i].desc, { x: x + 0.2, y: y + 1.15, w: 2.5, h: 0.55, fontSize: 8.5, color: MUTED, fontFace: "Arial", lineSpacingMultiple: 1.3 })
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 3: CRM & Sales — with mock screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "CRM & Satis Idareetmesi", "Lidlerden sovdelesmelere — butun satis prosesi bir yerde", PRIMARY)

  // Feature list on left
  const features = [
    { t: "Idare Paneli", d: "KPI, gelir trendi, pipeline, AI tovsiyeler" },
    { t: "Sirketler & Kontaktlar", d: "Profil, tarixce, CSV idxali, engagement skor" },
    { t: "Sovdelesmeler", d: "Kanban + cedvel, coxlu pipeline, weighted probability" },
    { t: "Lidler & AI Skorinq", d: "A-F derece, konversiya ehtimali %, auto-assignment" },
    { t: "Tapshiriqlar", d: "Siyahi + Kanban + teqvim, prioritet, son tarix" },
    { t: "Muqavileler & Teklifler", d: "PDF generasiya, bitme xeberdarligi, e-poctle gondermek" },
    { t: "Mehsullar", d: "Kataloq, qiymet tarixi, sovdelesmeye baglama" },
    { t: "Proqnozlasdirma", d: "Weighted pipeline, kvota izleme, AI proqnoz" },
  ]

  for (let i = 0; i < features.length; i++) {
    const y = 1.65 + i * 0.7
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 5.5, h: 0.6, fill: { color: WHITE }, rectRadius: 0.08 })
    slide.addShape(pptx.ShapeType.rect, { x: 0.5, y, w: 0.06, h: 0.6, fill: { color: PRIMARY } })
    slide.addText(features[i].t, { x: 0.75, y: y + 0.02, w: 5, h: 0.28, fontSize: 10, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(features[i].d, { x: 0.75, y: y + 0.3, w: 5, h: 0.25, fontSize: 8.5, color: MUTED, fontFace: "Arial" })
  }

  // MOCK SCREENSHOT: Kanban pipeline on right
  addMockWindow(slide, 6.3, 1.55, 6.6, 5.5, "Sovdelesmeler — Kanban")
  // Sidebar mini
  slide.addShape(pptx.ShapeType.rect, { x: 6.3, y: 1.95, w: 1.0, h: 5.1, fill: { color: DARK } })
  slide.addText("LD", { x: 6.4, y: 2.05, w: 0.8, h: 0.2, fontSize: 7, color: PRIMARY, fontFace: "Arial", bold: true })
  const sItems = ["Panel", "Sirketler", "Kontaktlar", "Sovdeles..", "Lidler", "Tasks"]
  for (let i = 0; i < sItems.length; i++) {
    const active = i === 3
    if (active) slide.addShape(pptx.ShapeType.roundRect, { x: 6.35, y: 2.35 + i * 0.26, w: 0.9, h: 0.22, fill: { color: PRIMARY }, rectRadius: 0.04 })
    slide.addText(sItems[i], { x: 6.42, y: 2.35 + i * 0.26, w: 0.8, h: 0.22, fontSize: 6, color: active ? WHITE : "94A3B8", fontFace: "Arial" })
  }

  // Kanban columns
  const kanbanCols = [
    { title: "Yeni Lead", count: "5", cards: [{ name: "Azercell MMC", amount: "$45,000", prob: "20%" }, { name: "SOCAR Trading", amount: "$120,000", prob: "15%" }], color: MUTED },
    { title: "Teklif", count: "3", cards: [{ name: "Pasha Bank", amount: "$85,000", prob: "50%" }], color: WARNING },
    { title: "Danisiq", count: "4", cards: [{ name: "Kapital Bank", amount: "$67,000", prob: "70%" }, { name: "ABB Sigorta", amount: "$34,000", prob: "65%" }], color: SECONDARY },
    { title: "Uduldu", count: "7", cards: [{ name: "AzerGold", amount: "$156,000", prob: "100%" }], color: SUCCESS },
  ]

  const contentX = 7.45
  // Column headers
  for (let c = 0; c < kanbanCols.length; c++) {
    const kx = contentX + c * 1.35
    slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 2.1, w: 1.25, h: 0.28, fill: { color: LIGHT }, rectRadius: 0.06 })
    slide.addShape(pptx.ShapeType.ellipse, { x: kx + 0.05, y: 2.15, w: 0.18, h: 0.18, fill: { color: kanbanCols[c].color } })
    slide.addText(kanbanCols[c].title, { x: kx + 0.27, y: 2.1, w: 0.7, h: 0.28, fontSize: 6.5, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(kanbanCols[c].count, { x: kx + 0.98, y: 2.1, w: 0.22, h: 0.28, fontSize: 6, color: MUTED, fontFace: "Arial", align: "center" })

    // Cards
    for (let r = 0; r < kanbanCols[c].cards.length; r++) {
      const ky = 2.5 + r * 0.9
      slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: ky, w: 1.25, h: 0.8, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
      slide.addText(kanbanCols[c].cards[r].name, { x: kx + 0.08, y: ky + 0.05, w: 1.1, h: 0.2, fontSize: 6.5, color: DARK, fontFace: "Arial", bold: true })
      slide.addText(kanbanCols[c].cards[r].amount, { x: kx + 0.08, y: ky + 0.28, w: 0.7, h: 0.2, fontSize: 8, color: PRIMARY, fontFace: "Arial", bold: true })
      slide.addText(kanbanCols[c].cards[r].prob, { x: kx + 0.78, y: ky + 0.28, w: 0.4, h: 0.2, fontSize: 7, color: SUCCESS, fontFace: "Arial" })
      // Progress bar
      slide.addShape(pptx.ShapeType.roundRect, { x: kx + 0.08, y: ky + 0.55, w: 1.08, h: 0.08, fill: { color: BORDER }, rectRadius: 0.04 })
      const prob = parseInt(kanbanCols[c].cards[r].prob) / 100
      slide.addShape(pptx.ShapeType.roundRect, { x: kx + 0.08, y: ky + 0.55, w: 1.08 * prob, h: 0.08, fill: { color: kanbanCols[c].color }, rectRadius: 0.04 })
    }
  }

  // Pipeline totals
  slide.addShape(pptx.ShapeType.roundRect, { x: contentX, y: 5.9, w: 5.3, h: 0.95, fill: { color: BLUE_LIGHT }, rectRadius: 0.08 })
  slide.addText("Pipeline Xulasesi", { x: contentX + 0.15, y: 5.95, w: 2, h: 0.2, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })
  const totals = [
    { l: "Umumi", v: "$507,000", c: DARK },
    { l: "Weighted", v: "$289,350", c: PRIMARY },
    { l: "Udulmus", v: "$156,000", c: SUCCESS },
    { l: "Konversiya", v: "37%", c: SECONDARY },
  ]
  for (let t = 0; t < totals.length; t++) {
    slide.addText(totals[t].v, { x: contentX + 0.15 + t * 1.3, y: 6.2, w: 1.2, h: 0.22, fontSize: 10, color: totals[t].c, fontFace: "Arial", bold: true })
    slide.addText(totals[t].l, { x: contentX + 0.15 + t * 1.3, y: 6.42, w: 1.2, h: 0.18, fontSize: 7, color: MUTED, fontFace: "Arial" })
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 4: Marketing — with mock screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "Marketinq Avtomatlasması", "Kampaniyalardan seqmentlere — musteri seferi tam idareetme", SECONDARY)

  // MOCK SCREENSHOT: Campaign dashboard
  addMockWindow(slide, 0.5, 1.65, 7.0, 5.5, "Kampaniyalar")

  // Mini sidebar
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.05, w: 1.0, h: 5.1, fill: { color: DARK } })
  slide.addText("LD", { x: 0.6, y: 2.15, w: 0.8, h: 0.2, fontSize: 7, color: PRIMARY, fontFace: "Arial", bold: true })
  const mSide = ["Kampaniyalar", "Seqmentler", "Sablonlar", "Journeys", "ROI", "Skorinq"]
  for (let i = 0; i < mSide.length; i++) {
    const active = i === 0
    if (active) slide.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: 2.45 + i * 0.26, w: 0.9, h: 0.22, fill: { color: SECONDARY }, rectRadius: 0.04 })
    slide.addText(mSide[i], { x: 0.62, y: 2.45 + i * 0.26, w: 0.8, h: 0.22, fontSize: 5.5, color: active ? WHITE : "94A3B8", fontFace: "Arial" })
  }

  // Campaign content area
  const mcx = 1.65
  // Stats row
  const campStats = [
    { v: "12", l: "Aktiv", c: SUCCESS },
    { v: "45,230", l: "Gonderildi", c: PRIMARY },
    { v: "38.2%", l: "Acilma %", c: SECONDARY },
    { v: "12.5%", l: "Klik %", c: WARNING },
  ]
  for (let i = 0; i < campStats.length; i++) {
    const sx = mcx + 0.1 + i * 1.3
    slide.addShape(pptx.ShapeType.roundRect, { x: sx, y: 2.15, w: 1.2, h: 0.65, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
    slide.addText(campStats[i].v, { x: sx + 0.08, y: 2.18, w: 1.04, h: 0.32, fontSize: 12, color: campStats[i].c, fontFace: "Arial", bold: true })
    slide.addText(campStats[i].l, { x: sx + 0.08, y: 2.48, w: 1.04, h: 0.2, fontSize: 6.5, color: MUTED, fontFace: "Arial" })
  }

  // Campaign list table
  slide.addShape(pptx.ShapeType.roundRect, { x: mcx + 0.1, y: 2.95, w: 5.6, h: 0.3, fill: { color: LIGHT }, rectRadius: 0.04 })
  const headers = ["Kampaniya", "Status", "Gonderildi", "Acilma", "Klik", "ROI"]
  for (let h = 0; h < headers.length; h++) {
    slide.addText(headers[h], { x: mcx + 0.2 + h * 0.93, y: 2.95, w: 0.85, h: 0.3, fontSize: 6, color: MUTED, fontFace: "Arial", bold: true })
  }

  const campaigns = [
    { n: "Yeni il kampaniyasi", s: "Aktiv", sent: "12,450", open: "42.1%", click: "15.3%", roi: "+340%", sc: SUCCESS },
    { n: "Novruz endirimi", s: "Aktiv", sent: "8,200", open: "38.7%", click: "11.2%", roi: "+210%", sc: SUCCESS },
    { n: "Mehsul yenilemesi", s: "Draft", sent: "—", open: "—", click: "—", roi: "—", sc: MUTED },
    { n: "Webinar devet", s: "Planli", sent: "—", open: "—", click: "—", roi: "—", sc: WARNING },
    { n: "Referral proqrami", s: "Bitib", sent: "5,100", open: "35.4%", click: "9.8%", roi: "+180%", sc: MUTED },
  ]
  for (let r = 0; r < campaigns.length; r++) {
    const ry = 3.3 + r * 0.38
    if (r % 2 === 0) slide.addShape(pptx.ShapeType.rect, { x: mcx + 0.1, y: ry, w: 5.6, h: 0.38, fill: { color: LIGHT, transparency: 50 } })
    const vals = [campaigns[r].n, campaigns[r].s, campaigns[r].sent, campaigns[r].open, campaigns[r].click, campaigns[r].roi]
    for (let c = 0; c < vals.length; c++) {
      const isStatus = c === 1
      slide.addText(vals[c], {
        x: mcx + 0.2 + c * 0.93, y: ry, w: 0.85, h: 0.38,
        fontSize: 6.5, color: isStatus ? campaigns[r].sc : (c === 5 && vals[c].includes("+") ? SUCCESS : TEXT),
        fontFace: "Arial", bold: c === 0 || c === 5,
      })
    }
  }

  // Email preview mockup at bottom
  slide.addShape(pptx.ShapeType.roundRect, { x: mcx + 0.1, y: 5.3, w: 5.6, h: 1.65, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
  slide.addText("E-poct Sablonu Preview", { x: mcx + 0.25, y: 5.35, w: 3, h: 0.22, fontSize: 7, color: DARK, fontFace: "Arial", bold: true })
  slide.addShape(pptx.ShapeType.roundRect, { x: mcx + 0.25, y: 5.62, w: 2.5, h: 1.2, fill: { color: BLUE_LIGHT }, rectRadius: 0.04 })
  slide.addText("Salam {{ad}},\n\nYeni imkanlarimizdan\nxeberdarsiz?", { x: mcx + 0.35, y: 5.7, w: 2.3, h: 1.0, fontSize: 6, color: TEXT, fontFace: "Arial", lineSpacingMultiple: 1.5 })
  // Preview buttons
  slide.addShape(pptx.ShapeType.roundRect, { x: mcx + 3.0, y: 5.62, w: 0.7, h: 0.28, fill: { color: PRIMARY }, rectRadius: 0.06 })
  slide.addText("Desktop", { x: mcx + 3.0, y: 5.62, w: 0.7, h: 0.28, fontSize: 6, color: WHITE, fontFace: "Arial", align: "center", valign: "middle" })
  slide.addShape(pptx.ShapeType.roundRect, { x: mcx + 3.8, y: 5.62, w: 0.6, h: 0.28, fill: { color: LIGHT }, rectRadius: 0.06 })
  slide.addText("Mobil", { x: mcx + 3.8, y: 5.62, w: 0.6, h: 0.28, fontSize: 6, color: MUTED, fontFace: "Arial", align: "center", valign: "middle" })

  // Feature cards on right
  const mktFeatures = [
    { title: "Kampaniyalar", desc: "E-poct/SMS, A/B test, planlasdirma, statistika", color: SECONDARY },
    { title: "Seqmentler", desc: "Dinamik, 9+ sert novu, davranis esasli", color: PRIMARY },
    { title: "Email Sablonlar", desc: "Drag-and-drop redaktor, deyisenler, preview", color: ACCENT },
    { title: "Customer Journeys", desc: "Vizual flow, 8 addim, trigger, branching", color: SUCCESS },
    { title: "Kampaniya ROI", desc: "Xerc -> lidler -> gelir analizi", color: WARNING },
    { title: "AI Lid Skorinq", desc: "5 faktor, A-F derece, konversiya %", color: PINK },
    { title: "Tedbirler", desc: "Qeydiyyat sehifesi, ICS, auto-kontakt", color: ORANGE },
    { title: "E-poct Loqu", desc: "Butun gondermeler/almalar tarixi", color: DANGER },
  ]

  for (let i = 0; i < mktFeatures.length; i++) {
    const fy = 1.65 + i * 0.72
    const fx = 7.8
    slide.addShape(pptx.ShapeType.roundRect, { x: fx, y: fy, w: 5.1, h: 0.62, fill: { color: WHITE }, rectRadius: 0.08, shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.05 } })
    slide.addShape(pptx.ShapeType.rect, { x: fx, y: fy, w: 0.06, h: 0.62, fill: { color: mktFeatures[i].color } })
    slide.addText(mktFeatures[i].title, { x: fx + 0.2, y: fy + 0.03, w: 4.7, h: 0.26, fontSize: 9.5, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(mktFeatures[i].desc, { x: fx + 0.2, y: fy + 0.3, w: 4.7, h: 0.25, fontSize: 8, color: MUTED, fontFace: "Arial" })
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 5: Support & Inbox — with mock screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "Musteri Desteki & Unified Inbox", "Butun kanallar bir yerde — tiketler, SLA, omnichannel kommunikasiya", ACCENT)

  // Feature list left
  const supportFeatures = [
    { t: "Tiket Sistemi", d: "Kanban + cedvel, prioritet, assign, status", c: ACCENT },
    { t: "SLA Izleme", d: "Real-time geri sayim, avtomatik eskalasiya", c: DANGER },
    { t: "Bilik Bazasi", d: "Meqaleler, axtaris, portal ucun aciq", c: PRIMARY },
    { t: "Agent Desktop", d: "Customer 360, makroslar, klaviatura qisayollari", c: SECONDARY },
    { t: "CSAT Reytinqi", d: "Musteri memnuniyyeti sorgusu", c: WARNING },
    { t: "Eskalasiya", d: "L1-L5, avtomatik prioritet artirma", c: PINK },
  ]

  for (let i = 0; i < supportFeatures.length; i++) {
    const y = 1.65 + i * 0.65
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 5.0, h: 0.55, fill: { color: WHITE }, rectRadius: 0.08 })
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: y + 0.1, w: 0.35, h: 0.35, fill: { color: supportFeatures[i].c }, rectRadius: 0.08 })
    slide.addText(supportFeatures[i].t, { x: 1.1, y: y + 0.02, w: 4.2, h: 0.26, fontSize: 10, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(supportFeatures[i].d, { x: 1.1, y: y + 0.28, w: 4.2, h: 0.22, fontSize: 8, color: MUTED, fontFace: "Arial" })
  }

  // Channel badges
  slide.addText("Qosulmus Kanallar", { x: 0.5, y: 5.65, w: 5, h: 0.3, fontSize: 11, color: DARK, fontFace: "Arial", bold: true })
  const channels = [
    { name: "Email", color: PRIMARY },
    { name: "WhatsApp", color: "25D366" },
    { name: "Telegram", color: "0088CC" },
    { name: "Facebook", color: "1877F2" },
    { name: "Instagram", color: "E4405F" },
    { name: "SMS", color: ORANGE },
    { name: "VK", color: "4680C2" },
  ]
  for (let i = 0; i < channels.length; i++) {
    const cx = 0.5 + i * 0.75
    slide.addShape(pptx.ShapeType.roundRect, { x: cx, y: 6.0, w: 0.65, h: 0.65, fill: { color: channels[i].color }, rectRadius: 0.12 })
    slide.addText(channels[i].name, { x: cx, y: 6.0, w: 0.65, h: 0.65, fontSize: 6, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
  }

  // MOCK SCREENSHOT: Inbox on right
  addMockWindow(slide, 5.8, 1.55, 7.1, 5.6, "Unified Inbox")

  // Sidebar + 3-panel inbox layout
  slide.addShape(pptx.ShapeType.rect, { x: 5.8, y: 1.95, w: 0.8, h: 5.2, fill: { color: DARK } })
  slide.addText("LD", { x: 5.88, y: 2.02, w: 0.65, h: 0.2, fontSize: 7, color: PRIMARY, fontFace: "Arial", bold: true })

  // Inbox channel tabs
  const ix = 6.7
  const tabs = ["Hamisi", "Email", "WA", "TG", "FB"]
  for (let i = 0; i < tabs.length; i++) {
    const active = i === 0
    slide.addShape(pptx.ShapeType.roundRect, { x: ix + 0.1 + i * 0.65, y: 2.02, w: 0.55, h: 0.22, fill: { color: active ? PRIMARY : LIGHT }, rectRadius: 0.04 })
    slide.addText(tabs[i], { x: ix + 0.1 + i * 0.65, y: 2.02, w: 0.55, h: 0.22, fontSize: 6, color: active ? WHITE : MUTED, fontFace: "Arial", align: "center", valign: "middle" })
  }

  // Conversation list (left panel)
  slide.addShape(pptx.ShapeType.rect, { x: ix, y: 2.3, w: 2.3, h: 4.75, fill: { color: WHITE }, line: { color: BORDER, width: 0.5 } })
  const convos = [
    { name: "Elvin Mammadov", msg: "Salam, qiymet barede...", ch: "WA", time: "14:23", unread: true },
    { name: "Kamala Hesenova", msg: "Tesekkur edirem!", ch: "Email", time: "13:45", unread: false },
    { name: "Tural Aliyev", msg: "Demo ne vaxt olacaq?", ch: "TG", time: "12:10", unread: true },
    { name: "Nigar Babayeva", msg: "Faktura gonderin zehmet...", ch: "Email", time: "11:30", unread: false },
    { name: "Rashad Veliyev", msg: "Inteqrasiya mumkundur?", ch: "FB", time: "10:55", unread: true },
    { name: "Sevda Alizada", msg: "Xidmet haqqinda...", ch: "WA", time: "09:20", unread: false },
    { name: "Farid Huseynov", msg: "Tedbir qeydiyyati", ch: "Email", time: "Dunən", unread: false },
  ]
  for (let i = 0; i < convos.length; i++) {
    const cy = 2.35 + i * 0.63
    if (i === 0) slide.addShape(pptx.ShapeType.rect, { x: ix, y: cy, w: 2.3, h: 0.63, fill: { color: BLUE_LIGHT } })
    // Avatar circle
    slide.addShape(pptx.ShapeType.ellipse, { x: ix + 0.08, y: cy + 0.08, w: 0.35, h: 0.35, fill: { color: [PRIMARY, SECONDARY, ACCENT, WARNING, PINK, SUCCESS, ORANGE][i % 7] } })
    slide.addText(convos[i].name[0], { x: ix + 0.08, y: cy + 0.08, w: 0.35, h: 0.35, fontSize: 7, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
    slide.addText(convos[i].name, { x: ix + 0.5, y: cy + 0.05, w: 1.3, h: 0.2, fontSize: 7, color: DARK, fontFace: "Arial", bold: convos[i].unread })
    slide.addText(convos[i].msg, { x: ix + 0.5, y: cy + 0.25, w: 1.3, h: 0.18, fontSize: 6, color: MUTED, fontFace: "Arial" })
    slide.addText(convos[i].time, { x: ix + 1.85, y: cy + 0.05, w: 0.4, h: 0.18, fontSize: 5.5, color: MUTED, fontFace: "Arial", align: "right" })
    // Channel badge
    const chColors = { WA: "25D366", Email: PRIMARY, TG: "0088CC", FB: "1877F2" }
    slide.addShape(pptx.ShapeType.roundRect, { x: ix + 1.85, y: cy + 0.27, w: 0.35, h: 0.15, fill: { color: chColors[convos[i].ch] || MUTED }, rectRadius: 0.04 })
    slide.addText(convos[i].ch, { x: ix + 1.85, y: cy + 0.27, w: 0.35, h: 0.15, fontSize: 5, color: WHITE, fontFace: "Arial", align: "center", valign: "middle" })
  }

  // Chat panel (right of conversation list)
  const chatX = ix + 2.4
  slide.addShape(pptx.ShapeType.rect, { x: chatX, y: 2.3, w: 3.6, h: 4.75, fill: { color: WHITE } })
  // Chat header
  slide.addShape(pptx.ShapeType.rect, { x: chatX, y: 2.3, w: 3.6, h: 0.45, fill: { color: LIGHT } })
  slide.addShape(pptx.ShapeType.ellipse, { x: chatX + 0.1, y: 2.35, w: 0.3, h: 0.3, fill: { color: PRIMARY } })
  slide.addText("E", { x: chatX + 0.1, y: 2.35, w: 0.3, h: 0.3, fontSize: 8, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
  slide.addText("Elvin Mammadov", { x: chatX + 0.48, y: 2.35, w: 1.5, h: 0.18, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })
  slide.addText("WhatsApp  •  Onlayn", { x: chatX + 0.48, y: 2.53, w: 1.5, h: 0.15, fontSize: 6, color: "25D366", fontFace: "Arial" })

  // Chat messages
  const msgs = [
    { from: "customer", text: "Salam, CRM sisteminiz barede\nmelumat ala bilerem?", y: 2.9 },
    { from: "agent", text: "Salam Elvin bey! Elbette.\nHansi modullar sizi maraqlandirir?", y: 3.5 },
    { from: "customer", text: "Satis ve maliyye modullari.\nQiymeti ne qederdir?", y: 4.1 },
    { from: "agent", text: "Starter plan ayda __ AZN-den\nbaslayir. Demo planlasdiraq?", y: 4.7 },
  ]
  for (const m of msgs) {
    const isAgent = m.from === "agent"
    const mx = isAgent ? chatX + 1.2 : chatX + 0.15
    const mbg = isAgent ? PRIMARY : LIGHT
    const mc = isAgent ? WHITE : TEXT
    slide.addShape(pptx.ShapeType.roundRect, { x: mx, y: m.y, w: 2.2, h: 0.5, fill: { color: mbg }, rectRadius: 0.08 })
    slide.addText(m.text, { x: mx + 0.1, y: m.y + 0.03, w: 2.0, h: 0.44, fontSize: 6.5, color: mc, fontFace: "Arial", lineSpacingMultiple: 1.3 })
  }

  // Input field
  slide.addShape(pptx.ShapeType.roundRect, { x: chatX + 0.1, y: 6.7, w: 3.4, h: 0.28, fill: { color: LIGHT }, rectRadius: 0.14 })
  slide.addText("Mesaj yazin...", { x: chatX + 0.25, y: 6.7, w: 2.5, h: 0.28, fontSize: 7, color: MUTED, fontFace: "Arial" })
}

// ═══════════════════════════════════════════════════
// SLIDE 6: Finance & Analytics — with mock screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "Maliyye & Analitika", "Hec bir CRM-de olmayan derin maliyye modulu — LeadDrive-in unikal ustunluyu", WARNING)

  // MOCK SCREENSHOT: Finance dashboard on left
  addMockWindow(slide, 0.5, 1.55, 7.2, 5.6, "Maliyye Dashboard")

  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.95, w: 0.8, h: 5.2, fill: { color: DARK } })
  slide.addText("LD", { x: 0.58, y: 2.02, w: 0.65, h: 0.2, fontSize: 7, color: PRIMARY, fontFace: "Arial", bold: true })

  const fcx = 1.45
  // Financial KPI cards
  const finKpis = [
    { v: "$1.2M", l: "Umumi Gelir", c: SUCCESS, trend: "+12.5%" },
    { v: "$340K", l: "Odenmemis", c: DANGER, trend: "28 gun ort." },
    { v: "$890K", l: "Net Menfeet", c: PRIMARY, trend: "+8.3%" },
    { v: "68%", l: "Marja", c: SECONDARY, trend: "+2.1%" },
  ]
  for (let i = 0; i < finKpis.length; i++) {
    const kx = fcx + 0.1 + i * 1.45
    slide.addShape(pptx.ShapeType.roundRect, { x: kx, y: 2.05, w: 1.35, h: 0.85, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
    slide.addShape(pptx.ShapeType.rect, { x: kx, y: 2.05, w: 1.35, h: 0.05, fill: { color: finKpis[i].c } })
    slide.addText(finKpis[i].v, { x: kx + 0.1, y: 2.15, w: 1.15, h: 0.32, fontSize: 14, color: finKpis[i].c, fontFace: "Arial", bold: true })
    slide.addText(finKpis[i].l, { x: kx + 0.1, y: 2.45, w: 0.8, h: 0.18, fontSize: 6.5, color: MUTED, fontFace: "Arial" })
    slide.addText(finKpis[i].trend, { x: kx + 0.85, y: 2.45, w: 0.4, h: 0.18, fontSize: 6, color: SUCCESS, fontFace: "Arial", align: "right" })
  }

  // Revenue chart mockup
  slide.addShape(pptx.ShapeType.roundRect, { x: fcx + 0.1, y: 3.05, w: 5.7, h: 2.0, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
  slide.addText("Ayliq Gelir Trendi", { x: fcx + 0.25, y: 3.1, w: 2, h: 0.22, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })
  // Chart area with line simulation
  const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avq", "Sen", "Okt", "Noy", "Dek"]
  const values = [0.3, 0.35, 0.5, 0.45, 0.6, 0.55, 0.7, 0.85, 0.9, 1.0, 0.95, 1.1]
  for (let i = 0; i < months.length; i++) {
    const bx = fcx + 0.35 + i * 0.44
    const bh = values[i] * 1.1
    // Bar
    slide.addShape(pptx.ShapeType.roundRect, { x: bx, y: 4.7 - bh, w: 0.3, h: bh, fill: { color: i >= 10 ? SUCCESS : PRIMARY, transparency: i >= 10 ? 0 : 20 }, rectRadius: 0.04 })
    // Month label
    slide.addText(months[i], { x: bx - 0.02, y: 4.75, w: 0.34, h: 0.15, fontSize: 5, color: MUTED, fontFace: "Arial", align: "center" })
  }

  // Invoice table
  slide.addShape(pptx.ShapeType.roundRect, { x: fcx + 0.1, y: 5.15, w: 5.7, h: 1.85, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
  slide.addText("Son Fakturalar", { x: fcx + 0.25, y: 5.2, w: 2, h: 0.22, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })
  const invHeaders = ["No", "Musteri", "Mebleg", "Status", "Tarix"]
  for (let h = 0; h < invHeaders.length; h++) {
    slide.addText(invHeaders[h], { x: fcx + 0.2 + h * 1.12, y: 5.45, w: 1.0, h: 0.2, fontSize: 6, color: MUTED, fontFace: "Arial", bold: true })
  }
  const invoices = [
    { no: "INV-001", cust: "Azercell", amt: "$45,000", st: "Odenildi", stc: SUCCESS, date: "2026-03-15" },
    { no: "INV-002", cust: "SOCAR", amt: "$120,000", st: "Gozleyir", stc: WARNING, date: "2026-03-20" },
    { no: "INV-003", cust: "Pasha Bank", amt: "$85,000", st: "Gecikir", stc: DANGER, date: "2026-02-28" },
    { no: "INV-004", cust: "Kapital Bank", amt: "$67,000", st: "Odenildi", stc: SUCCESS, date: "2026-03-25" },
  ]
  for (let r = 0; r < invoices.length; r++) {
    const ry = 5.68 + r * 0.28
    const vals = [invoices[r].no, invoices[r].cust, invoices[r].amt, invoices[r].st, invoices[r].date]
    for (let c = 0; c < vals.length; c++) {
      slide.addText(vals[c], {
        x: fcx + 0.2 + c * 1.12, y: ry, w: 1.0, h: 0.26,
        fontSize: 6.5, color: c === 3 ? invoices[r].stc : TEXT, fontFace: "Arial", bold: c === 0 || c === 3,
      })
    }
  }

  // Feature cards on right
  const finFeatures = [
    { title: "Fakturalar", desc: "Yaratma, PDF, gondermek, odenis izleme, tekrarlanan", color: WARNING },
    { title: "Budceleme", desc: "Departament uzre, plan vs faktiki, rolling proqnoz", color: PRIMARY },
    { title: "Xerc Modeli", desc: "Elave xercler, isci xercler, xidmet rentabelliyi", color: DANGER },
    { title: "Rentabellik", desc: "Musteri/xidmet/layihe uzre marja, AI musahideleri", color: SUCCESS },
    { title: "Maliyye Panel", desc: "A/R, A/P, pul axini, fondlar — hamisi bir yerde", color: SECONDARY },
    { title: "Hesabatlar", desc: "Pipeline, funnel, CSAT, SLA, gelir trendi", color: ACCENT },
    { title: "Muqavileler", desc: "Fayl elaveleri, bitme xeberdarligi, baglama", color: ORANGE },
    { title: "Proqnoz", desc: "AI esasli gelir proqnozu, weighted pipeline", color: PINK },
  ]

  for (let i = 0; i < finFeatures.length; i++) {
    const fy = 1.55 + i * 0.75
    slide.addShape(pptx.ShapeType.roundRect, { x: 8.0, y: fy, w: 5.0, h: 0.65, fill: { color: WHITE }, rectRadius: 0.08, shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.05 } })
    slide.addShape(pptx.ShapeType.roundRect, { x: 8.12, y: fy + 0.12, w: 0.4, h: 0.4, fill: { color: finFeatures[i].color }, rectRadius: 0.08 })
    slide.addText(finFeatures[i].title, { x: 8.65, y: fy + 0.04, w: 4.2, h: 0.28, fontSize: 10, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(finFeatures[i].desc, { x: 8.65, y: fy + 0.33, w: 4.2, h: 0.25, fontSize: 8, color: MUTED, fontFace: "Arial" })
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 7: AI & Automation — with mock screenshot
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "Suni Intellekt & Avtomatlasma", "Da Vinci — LeadDrive-in AI motoru, Claude (Anthropic) uzerinde qurulmusdur", PINK)

  // AI Feature cards left side
  const aiFeatures = [
    { title: "AI Agentler", desc: "CRM-de emeliyyatlar icra edir: tapshiriq yaratma, sovdelesme yenileme, e-poct gonderme", color: PINK },
    { title: "AI Lid Skorinq", desc: "Hər lidi 5 faktor uzre qiymetlendirir: 0-100 bal, A-F derece, konversiya ehtimali %", color: SECONDARY },
    { title: "Proqnozlasdirma", desc: "Qazanma ehtimali, gelir proqnozu, churn riski, sovdelesme sureti analizi", color: PRIMARY },
    { title: "Next Best Action", desc: "Kontekstual tovsiyeler: zeng edin, follow-up gonderin, merhele yenileyin", color: SUCCESS },
    { title: "Workflow Engine", desc: "Rule-based: trigger -> sert -> emeliyyat. 7 emeliyyat novu, entity triggers", color: WARNING },
    { title: "AI Komanda Merkezi", desc: "Agent konfiqurasiyasi, model secimi, token limiti, performans metrikleri", color: ACCENT },
  ]

  for (let i = 0; i < aiFeatures.length; i++) {
    const y = 1.55 + i * 0.98
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.5, y, w: 5.5, h: 0.88, fill: { color: WHITE }, rectRadius: 0.1, shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.05 } })
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.65, y: y + 0.15, w: 0.55, h: 0.55, fill: { color: aiFeatures[i].color }, rectRadius: 0.12 })
    slide.addText("AI", { x: 0.65, y: y + 0.15, w: 0.55, h: 0.55, fontSize: 10, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
    slide.addText(aiFeatures[i].title, { x: 1.35, y: y + 0.08, w: 4.5, h: 0.3, fontSize: 11, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(aiFeatures[i].desc, { x: 1.35, y: y + 0.42, w: 4.5, h: 0.38, fontSize: 8.5, color: MUTED, fontFace: "Arial", lineSpacingMultiple: 1.3 })
  }

  // MOCK SCREENSHOT: AI Command Center on right
  addMockWindow(slide, 6.3, 1.55, 6.6, 5.6, "Da Vinci AI — Komanda Merkezi")

  slide.addShape(pptx.ShapeType.rect, { x: 6.3, y: 1.95, w: 0.8, h: 5.2, fill: { color: DARK } })
  slide.addText("LD", { x: 6.38, y: 2.02, w: 0.65, h: 0.2, fontSize: 7, color: PRIMARY, fontFace: "Arial", bold: true })

  const ax = 7.25
  // AI Score cards
  slide.addShape(pptx.ShapeType.roundRect, { x: ax + 0.1, y: 2.05, w: 5.4, h: 0.7, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
  const aiStats = [
    { v: "847", l: "Skorlanmis", c: SUCCESS },
    { v: "92%", l: "Deqiqlik", c: PRIMARY },
    { v: "234", l: "Tovsiye", c: SECONDARY },
    { v: "$2.1M", l: "AI Proqnoz", c: PINK },
  ]
  for (let i = 0; i < aiStats.length; i++) {
    slide.addText(aiStats[i].v, { x: ax + 0.2 + i * 1.3, y: 2.08, w: 1.2, h: 0.32, fontSize: 14, color: aiStats[i].c, fontFace: "Arial", bold: true })
    slide.addText(aiStats[i].l, { x: ax + 0.2 + i * 1.3, y: 2.38, w: 1.2, h: 0.2, fontSize: 6.5, color: MUTED, fontFace: "Arial" })
  }

  // Lead scoring results
  slide.addShape(pptx.ShapeType.roundRect, { x: ax + 0.1, y: 2.9, w: 5.4, h: 2.4, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
  slide.addText("AI Lid Skorinq Neticeleri", { x: ax + 0.25, y: 2.95, w: 3, h: 0.22, fontSize: 8, color: DARK, fontFace: "Arial", bold: true })

  const leads = [
    { name: "Azercell MMC", score: 92, grade: "A", prob: "87%", gc: SUCCESS },
    { name: "SOCAR Trading", score: 85, grade: "A", prob: "79%", gc: SUCCESS },
    { name: "Pasha Holding", score: 71, grade: "B", prob: "62%", gc: PRIMARY },
    { name: "Kapital Bank", score: 64, grade: "B", prob: "55%", gc: PRIMARY },
    { name: "ABB Sigorta", score: 45, grade: "C", prob: "38%", gc: WARNING },
    { name: "Bravo SM", score: 28, grade: "D", prob: "22%", gc: DANGER },
  ]

  for (let i = 0; i < leads.length; i++) {
    const ly = 3.25 + i * 0.33
    slide.addText(leads[i].name, { x: ax + 0.25, y: ly, w: 1.5, h: 0.28, fontSize: 7, color: DARK, fontFace: "Arial" })
    // Score bar
    slide.addShape(pptx.ShapeType.roundRect, { x: ax + 1.85, y: ly + 0.06, w: 1.5, h: 0.14, fill: { color: BORDER }, rectRadius: 0.07 })
    slide.addShape(pptx.ShapeType.roundRect, { x: ax + 1.85, y: ly + 0.06, w: 1.5 * (leads[i].score / 100), h: 0.14, fill: { color: leads[i].gc }, rectRadius: 0.07 })
    slide.addText(String(leads[i].score), { x: ax + 3.45, y: ly, w: 0.35, h: 0.28, fontSize: 7, color: leads[i].gc, fontFace: "Arial", bold: true })
    // Grade badge
    slide.addShape(pptx.ShapeType.roundRect, { x: ax + 3.85, y: ly + 0.03, w: 0.3, h: 0.22, fill: { color: leads[i].gc }, rectRadius: 0.06 })
    slide.addText(leads[i].grade, { x: ax + 3.85, y: ly + 0.03, w: 0.3, h: 0.22, fontSize: 7, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
    slide.addText(leads[i].prob, { x: ax + 4.25, y: ly, w: 0.6, h: 0.28, fontSize: 7, color: MUTED, fontFace: "Arial" })
  }

  // AI chat / assistant
  slide.addShape(pptx.ShapeType.roundRect, { x: ax + 0.1, y: 5.45, w: 5.4, h: 1.55, fill: { color: WHITE }, rectRadius: 0.06, line: { color: BORDER, width: 0.5 } })
  slide.addText("Da Vinci AI Assistant", { x: ax + 0.25, y: 5.5, w: 3, h: 0.22, fontSize: 8, color: PINK, fontFace: "Arial", bold: true })
  // AI message
  slide.addShape(pptx.ShapeType.roundRect, { x: ax + 0.25, y: 5.78, w: 4.0, h: 0.55, fill: { color: PURPLE_LIGHT }, rectRadius: 0.06 })
  slide.addText("Azercell MMC ucun en yaxsi addim:\nDemo gosterisi planlasdirin — konversiya ehtimali 87%", {
    x: ax + 0.35, y: 5.82, w: 3.8, h: 0.48, fontSize: 6.5, color: SECONDARY, fontFace: "Arial", lineSpacingMultiple: 1.4
  })
  // Input
  slide.addShape(pptx.ShapeType.roundRect, { x: ax + 0.25, y: 6.45, w: 5.0, h: 0.3, fill: { color: LIGHT }, rectRadius: 0.15 })
  slide.addText("AI-dan sorusu...", { x: ax + 0.4, y: 6.45, w: 4, h: 0.3, fontSize: 7, color: MUTED, fontFace: "Arial" })
}

// ═══════════════════════════════════════════════════
// SLIDE 8: Platform & Integrations — with mock
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: LIGHT }
  addHeader(slide, "Platforma & Inteqrasiyalar", "Tehlukesizlik, RBAC, API, webhooks — enterprise-ready infrastruktur", SUCCESS)

  // Grid of platform features with icons
  const platformItems = [
    { title: "SSO / OAuth", desc: "Google, Microsoft ile giris", color: PRIMARY },
    { title: "RBAC Rollar", desc: "5 sistem rolu + custom, modul icazeleri", color: SECONDARY },
    { title: "API Keys", desc: "Xarici sistemler ucun, scope-based giris", color: ACCENT },
    { title: "Webhooks", desc: "Zapier, n8n, Make.com inteqrasiya", color: SUCCESS },
    { title: "Audit Log", desc: "Butun emeliyyatlarin tarixcesi", color: WARNING },
    { title: "Custom Fields", desc: "Istenielen entity-ye elave saheler", color: PINK },
    { title: "Multi-Currency", desc: "Coxvalyutali destek, mezenni idaresi", color: ORANGE },
    { title: "Multi-Language", desc: "Azerbaycanca, rusca, ingilisce", color: PRIMARY },
    { title: "Musteri Portali", desc: "Tiketler, KB, AI chat, ozunexidmet", color: SECONDARY },
    { title: "PWA", desc: "Mobil home screen, offline destek", color: ACCENT },
    { title: "Bildirisler", desc: "Real-time in-app, SLA alertler", color: DANGER },
    { title: "Google Calendar", desc: "Teqvim sinxronizasiyasi", color: SUCCESS },
  ]

  for (let i = 0; i < platformItems.length; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    const x = 0.5 + col * 3.15
    const y = 1.6 + row * 1.25

    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 2.95, h: 1.05, fill: { color: WHITE }, rectRadius: 0.1,
      shadow: { type: "outer", blur: 4, offset: 1, color: "000000", opacity: 0.05 },
    })
    slide.addShape(pptx.ShapeType.roundRect, { x: x + 0.15, y: y + 0.15, w: 0.45, h: 0.45, fill: { color: platformItems[i].color }, rectRadius: 0.1 })
    slide.addText(platformItems[i].title, { x: x + 0.72, y: y + 0.12, w: 2.05, h: 0.25, fontSize: 10, color: DARK, fontFace: "Arial", bold: true })
    slide.addText(platformItems[i].desc, { x: x + 0.72, y: y + 0.4, w: 2.05, h: 0.22, fontSize: 8, color: MUTED, fontFace: "Arial" })
  }

  // MOCK: Settings screenshot at bottom
  addMockWindow(slide, 0.5, 5.3, 12.4, 2.0, "Parametrler — Rollar & Icazeler")
  // Table header
  slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 5.7, w: 12.4, h: 0.3, fill: { color: LIGHT } })
  const roleHeaders = ["Modul", "Admin", "Menecer", "Satis", "Destek", "Musteriler"]
  for (let h = 0; h < roleHeaders.length; h++) {
    slide.addText(roleHeaders[h], { x: 0.7 + h * 2.0, y: 5.7, w: 1.8, h: 0.3, fontSize: 8, color: DARK, fontFace: "Arial", bold: true, align: h === 0 ? "left" : "center" })
  }
  const roleRows = [
    { mod: "Sovdelesmeler", perms: ["Full", "Full", "Own", "Read", "—"] },
    { mod: "Maliyye", perms: ["Full", "Full", "—", "—", "—"] },
    { mod: "Tiketler", perms: ["Full", "Full", "Read", "Full", "Own"] },
    { mod: "Hesabatlar", perms: ["Full", "Full", "Read", "Read", "—"] },
  ]
  for (let r = 0; r < roleRows.length; r++) {
    const ry = 6.05 + r * 0.28
    slide.addText(roleRows[r].mod, { x: 0.7, y: ry, w: 1.8, h: 0.26, fontSize: 7.5, color: TEXT, fontFace: "Arial" })
    for (let p = 0; p < roleRows[r].perms.length; p++) {
      const perm = roleRows[r].perms[p]
      const pc = perm === "Full" ? SUCCESS : perm === "Own" ? WARNING : perm === "Read" ? PRIMARY : MUTED
      slide.addText(perm, { x: 2.7 + p * 2.0, y: ry, w: 1.8, h: 0.26, fontSize: 7.5, color: pc, fontFace: "Arial", bold: perm === "Full", align: "center" })
    }
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 9: Pricing — Bright
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  // Gradient background
  slide.background = { fill: PRIMARY }
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.5, w: 13.33, h: 4.0, fill: { color: SECONDARY, transparency: 50 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: -2, y: 5, w: 5, h: 5, fill: { color: WHITE, transparency: 92 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: 10, y: -1, w: 5, h: 5, fill: { color: WHITE, transparency: 92 } })

  slide.addText("Qiymetlendirme", {
    x: 0.8, y: 0.4, w: 12, h: 0.6, fontSize: 32, color: WHITE, fontFace: "Arial", bold: true, align: "center",
  })
  slide.addText("Butun funksionalliq daxildir. Limitsiz modullar. Setrinize uygun plan secin.", {
    x: 0.8, y: 1.0, w: 12, h: 0.4, fontSize: 14, color: WHITE, fontFace: "Arial", align: "center", transparency: 20,
  })

  const plans = [
    {
      name: "Starter", users: "1-5 istifadeci", price: "___", period: "AZN / ay",
      features: ["CRM & Satis", "Marketinq", "Destek & Tiketler", "Inbox (butun kanallar)", "AI Lid Skorinq", "5 GB yaddas", "Email destek"],
      color: ACCENT, bg: WHITE, textColor: DARK,
    },
    {
      name: "Business", users: "6-25 istifadeci", price: "___", period: "AZN / ay",
      features: ["Starter-deki her sey +", "Maliyye modulu", "Budceleme & Rentabellik", "Workflow Engine", "API & Webhooks", "Custom Fields", "Audit Log", "Prioritet destek"],
      color: SECONDARY, bg: DARK, textColor: WHITE, highlight: true,
    },
    {
      name: "Enterprise", users: "25+ istifadeci", price: "___", period: "AZN / ay",
      features: ["Business-deki her sey +", "SSO / OAuth", "Da Vinci AI Agentler", "Proqnozlasdirma", "Field Permissions", "Musteri Portali", "Dedicated Manager", "SLA Garantiyasi"],
      color: SUCCESS, bg: WHITE, textColor: DARK,
    },
  ]

  for (let i = 0; i < plans.length; i++) {
    const x = 0.8 + i * 4.1
    const isHighlight = plans[i].highlight

    // Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.7, w: 3.7, h: 5.3, fill: { color: plans[i].bg }, rectRadius: 0.15,
      shadow: { type: "outer", blur: 15, offset: 5, color: "000000", opacity: 0.2 },
    })

    // Popular badge
    if (isHighlight) {
      slide.addShape(pptx.ShapeType.roundRect, { x: x + 0.9, y: 1.5, w: 1.9, h: 0.4, fill: { color: SECONDARY }, rectRadius: 0.2 })
      slide.addText("EN POPULYAR", { x: x + 0.9, y: 1.5, w: 1.9, h: 0.4, fontSize: 10, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
    }

    // Color accent
    slide.addShape(pptx.ShapeType.rect, { x, y: 1.7, w: 3.7, h: 0.06, fill: { color: plans[i].color } })

    // Plan name
    slide.addText(plans[i].name, {
      x: x + 0.3, y: 2.0, w: 3.1, h: 0.45, fontSize: 22, color: plans[i].color, fontFace: "Arial", bold: true,
    })
    slide.addText(plans[i].users, {
      x: x + 0.3, y: 2.45, w: 3.1, h: 0.3, fontSize: 11, color: isHighlight ? "94A3B8" : MUTED, fontFace: "Arial",
    })

    // Price
    slide.addText(plans[i].price, {
      x: x + 0.3, y: 2.85, w: 1.5, h: 0.65, fontSize: 36, color: plans[i].textColor, fontFace: "Arial", bold: true,
    })
    slide.addText(plans[i].period, {
      x: x + 1.5, y: 3.1, w: 1.5, h: 0.3, fontSize: 11, color: isHighlight ? "94A3B8" : MUTED, fontFace: "Arial",
    })

    // Divider
    slide.addShape(pptx.ShapeType.rect, { x: x + 0.3, y: 3.65, w: 3.1, h: 0.01, fill: { color: isHighlight ? "2A3550" : BORDER } })

    // Features
    for (let f = 0; f < plans[i].features.length; f++) {
      slide.addText(`✓  ${plans[i].features[f]}`, {
        x: x + 0.3, y: 3.8 + f * 0.38, w: 3.1, h: 0.35,
        fontSize: 10, color: plans[i].textColor, fontFace: "Arial",
      })
    }
  }
}

// ═══════════════════════════════════════════════════
// SLIDE 10: Contact / CTA
// ═══════════════════════════════════════════════════
{
  const slide = pptx.addSlide()
  slide.background = { fill: PRIMARY }
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 3.5, w: 13.33, h: 4.0, fill: { color: SECONDARY, transparency: 50 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: -3, y: 2, w: 8, h: 8, fill: { color: WHITE, transparency: 93 } })
  slide.addShape(pptx.ShapeType.ellipse, { x: 9, y: -2, w: 7, h: 7, fill: { color: ACCENT, transparency: 88 } })

  slide.addText("Bizimlə Əlaqə", {
    x: 0.8, y: 1.3, w: 12, h: 0.8, fontSize: 40, color: WHITE, fontFace: "Arial", bold: true, align: "center",
  })

  slide.addText("LeadDrive CRM ilə biznesinizi növbəti səviyyəyə çatdırın", {
    x: 0.8, y: 2.2, w: 12, h: 0.5, fontSize: 16, color: WHITE, fontFace: "Arial", align: "center", transparency: 15,
  })

  // Contact cards
  const contacts = [
    { icon: "WEB", label: "Sayt", value: "leaddrivecrm.org", color: PRIMARY },
    { icon: "@", label: "E-poct", value: "info@leaddrivecrm.org", color: SECONDARY },
    { icon: "TEL", label: "Telefon", value: "+994 __ ___ __ __", color: ACCENT },
    { icon: "LOC", label: "Unvan", value: "Baki, Azerbaycan", color: SUCCESS },
  ]

  for (let i = 0; i < contacts.length; i++) {
    const x = 1.2 + i * 2.9
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 3.3, w: 2.5, h: 2.0, fill: { color: WHITE }, rectRadius: 0.15,
      shadow: { type: "outer", blur: 10, offset: 3, color: "000000", opacity: 0.15 },
    })
    // Icon circle
    slide.addShape(pptx.ShapeType.ellipse, { x: x + 0.85, y: 3.5, w: 0.8, h: 0.8, fill: { color: contacts[i].color } })
    slide.addText(contacts[i].icon, { x: x + 0.85, y: 3.5, w: 0.8, h: 0.8, fontSize: 10, color: WHITE, fontFace: "Arial", bold: true, align: "center", valign: "middle" })
    slide.addText(contacts[i].label, { x, y: 4.4, w: 2.5, h: 0.3, fontSize: 10, color: MUTED, fontFace: "Arial", align: "center" })
    slide.addText(contacts[i].value, { x, y: 4.7, w: 2.5, h: 0.35, fontSize: 12, color: DARK, fontFace: "Arial", align: "center", bold: true })
  }

  // CTA button
  slide.addShape(pptx.ShapeType.roundRect, { x: 4.2, y: 5.8, w: 5.0, h: 0.7, fill: { color: WHITE }, rectRadius: 0.35 })
  slide.addText("Demo Sifaris Edin  ->", { x: 4.2, y: 5.8, w: 5.0, h: 0.7, fontSize: 18, color: PRIMARY, fontFace: "Arial", bold: true, align: "center", valign: "middle" })

  // Footer
  slide.addText("© 2026 Guven Technology LLC  |  Baki, Azerbaycan  |  Butun huquqlar qorunur", {
    x: 0.8, y: 6.9, w: 12, h: 0.3, fontSize: 10, color: WHITE, fontFace: "Arial", align: "center", transparency: 30,
  })
}

// ═══════════════════════════════════════════════════
// Generate
// ═══════════════════════════════════════════════════
const outPath = "docs/LeadDrive_CRM_Təklif.pptx"
await pptx.writeFile({ fileName: outPath })
console.log(`✅ PPTX created: ${outPath}`)
