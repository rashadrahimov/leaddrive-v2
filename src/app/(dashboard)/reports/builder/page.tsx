"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  Save,
  FileSpreadsheet,
  BarChart3,
  Check,
  FolderOpen,
} from "lucide-react"
import { PageDescription } from "@/components/page-description"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"

// ---------------------------------------------------------------------------
// Entity field definitions (inline, mirrors server-side config)
// ---------------------------------------------------------------------------

const ENTITY_FIELDS: Record<string, { name: string; label: string; type: string }[]> = {
  deals: [
    { name: "name", label: "Deal Name", type: "string" },
    { name: "valueAmount", label: "Value", type: "number" },
    { name: "stage", label: "Stage", type: "string" },
    { name: "probability", label: "Probability", type: "number" },
    { name: "expectedClose", label: "Expected Close", type: "date" },
    { name: "assignedTo", label: "Assigned To", type: "string" },
    { name: "createdAt", label: "Created", type: "date" },
    { name: "company.name", label: "Company Name", type: "string" },
  ],
  contacts: [
    { name: "fullName", label: "Full Name", type: "string" },
    { name: "email", label: "Email", type: "string" },
    { name: "position", label: "Position", type: "string" },
    { name: "engagementScore", label: "Engagement", type: "number" },
    { name: "source", label: "Source", type: "string" },
    { name: "createdAt", label: "Created", type: "date" },
    { name: "company.name", label: "Company Name", type: "string" },
  ],
  companies: [
    { name: "name", label: "Company Name", type: "string" },
    { name: "industry", label: "Industry", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "annualRevenue", label: "Revenue", type: "number" },
    { name: "employeeCount", label: "Employees", type: "number" },
    { name: "createdAt", label: "Created", type: "date" },
  ],
  leads: [
    { name: "contactName", label: "Lead Name", type: "string" },
    { name: "companyName", label: "Company", type: "string" },
    { name: "source", label: "Source", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "estimatedValue", label: "Est. Value", type: "number" },
    { name: "score", label: "Score", type: "number" },
    { name: "createdAt", label: "Created", type: "date" },
  ],
  tickets: [
    { name: "ticketNumber", label: "Ticket #", type: "string" },
    { name: "subject", label: "Subject", type: "string" },
    { name: "priority", label: "Priority", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "category", label: "Category", type: "string" },
    { name: "createdAt", label: "Created", type: "date" },
    { name: "contact.fullName", label: "Contact Name", type: "string" },
  ],
  tasks: [
    { name: "title", label: "Title", type: "string" },
    { name: "status", label: "Status", type: "string" },
    { name: "priority", label: "Priority", type: "string" },
    { name: "dueDate", label: "Due Date", type: "date" },
    { name: "createdAt", label: "Created", type: "date" },
  ],
  activities: [
    { name: "type", label: "Type", type: "string" },
    { name: "subject", label: "Subject", type: "string" },
    { name: "createdAt", label: "Created", type: "date" },
    { name: "contact.fullName", label: "Contact", type: "string" },
    { name: "company.name", label: "Company", type: "string" },
  ],
}

const ENTITY_OPTIONS = [
  { value: "deals", label: "Deals" },
  { value: "contacts", label: "Contacts" },
  { value: "companies", label: "Companies" },
  { value: "leads", label: "Leads" },
  { value: "tickets", label: "Tickets" },
  { value: "tasks", label: "Tasks" },
  { value: "activities", label: "Activities" },
]

const CHART_TYPES = [
  { value: "table", label: "Table" },
  { value: "bar", label: "Bar Chart" },
  { value: "line", label: "Line Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "area", label: "Area Chart" },
]

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not Equals" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "In" },
  { value: "between", label: "Between" },
]

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#f59e0b",
  "#10b981",
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Filter {
  id: string
  field: string
  operator: string
  value: string
}

interface ReportConfig {
  entity: string
  columns: string[]
  filters: Filter[]
  groupBy: string
  sortBy: string
  sortOrder: "asc" | "desc"
  chartType: string
}

interface SavedReport {
  id: string
  name: string
  config: ReportConfig
  createdAt: string
}

interface PreviewData {
  rows: Record<string, unknown>[]
  total: number
  aggregates?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportBuilderPage() {
  // -- Config state --
  const [entity, setEntity] = useState("deals")
  const [columns, setColumns] = useState<string[]>(["name", "valueAmount", "stage"])
  const [filters, setFilters] = useState<Filter[]>([])
  const [groupBy, setGroupBy] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [chartType, setChartType] = useState("table")

  // -- UI state --
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [savedReportsLoading, setSavedReportsLoading] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [reportName, setReportName] = useState("")
  const [editingReportId, setEditingReportId] = useState<string | null>(null)
  const [scheduleFreq, setScheduleFreq] = useState("")
  const [scheduleEmails, setScheduleEmails] = useState("")

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const fields = useMemo(() => ENTITY_FIELDS[entity] || [], [entity])

  // When entity changes, reset columns to first 3 fields
  useEffect(() => {
    const f = ENTITY_FIELDS[entity] || []
    setColumns(f.slice(0, Math.min(3, f.length)).map((c) => c.name))
    setGroupBy("")
    setSortBy("")
    setFilters([])
  }, [entity])

  // -- Build config object --
  const buildConfig = useCallback(
    (): ReportConfig => ({
      entity,
      columns,
      filters,
      groupBy,
      sortBy,
      sortOrder,
      chartType,
    }),
    [entity, columns, filters, groupBy, sortBy, sortOrder, chartType],
  )

  // -- Debounced preview fetch --
  const fetchPreview = useCallback((cfg: ReportConfig) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/v1/reports/builder/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cfg),
        })
        if (res.ok) {
          const data = await res.json()
          setPreviewData(data)
        } else {
          setPreviewData(null)
        }
      } catch {
        setPreviewData(null)
      } finally {
        setLoading(false)
      }
    }, 600)
  }, [])

  // Trigger preview on config changes
  useEffect(() => {
    if (columns.length > 0) {
      fetchPreview(buildConfig())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, columns, filters, groupBy, sortBy, sortOrder, chartType])

  // -- Load saved reports --
  useEffect(() => {
    void (async () => {
      setSavedReportsLoading(true)
      try {
        const res = await fetch("/api/v1/reports/builder")
        if (res.ok) {
          const data = await res.json()
          setSavedReports(Array.isArray(data) ? data : data.reports ?? [])
        }
      } catch {
        // silent
      } finally {
        setSavedReportsLoading(false)
      }
    })()
  }, [])

  // -- Column toggle --
  const toggleColumn = (name: string) => {
    setColumns((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    )
  }

  // -- Filter helpers --
  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      { id: crypto.randomUUID(), field: fields[0]?.name ?? "", operator: "eq", value: "" },
    ])
  }

  const updateFilter = (id: string, patch: Partial<Filter>) => {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id))
  }

  // -- Save report --
  const handleSave = async () => {
    if (!reportName.trim()) return
    setSaving(true)
    try {
      const body: any = { name: reportName, config: buildConfig(), id: editingReportId }
      if (scheduleFreq) body.scheduleFreq = scheduleFreq
      if (scheduleEmails.trim()) body.scheduleEmails = scheduleEmails.split(",").map((e: string) => e.trim()).filter(Boolean)
      const res = await fetch("/api/v1/reports/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved = await res.json()
        setSavedReports((prev) => {
          const idx = prev.findIndex((r) => r.id === saved.id)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = saved
            return copy
          }
          return [saved, ...prev]
        })
        setSaveDialogOpen(false)
        setReportName("")
        setEditingReportId(null)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  // -- Load report --
  const loadReport = (report: SavedReport) => {
    const c = report.config
    setEntity(c.entity)
    // Defer so entity useEffect fires first, then we overwrite
    setTimeout(() => {
      setColumns(c.columns)
      setFilters(c.filters)
      setGroupBy(c.groupBy)
      setSortBy(c.sortBy)
      setSortOrder(c.sortOrder)
      setChartType(c.chartType)
      setEditingReportId(report.id)
      setReportName(report.name)
      setScheduleFreq((report as any).scheduleFreq || "")
      setScheduleEmails(((report as any).scheduleEmails || []).join(", "))
    }, 50)
  }

  // -- Export --
  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const res = await fetch("/api/v1/reports/builder/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: buildConfig(), format }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `report.${format === "xlsx" ? "xlsx" : "csv"}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // silent
    }
    setExportDialogOpen(false)
  }

  // -- Get label for a field name --
  const fieldLabel = (name: string) =>
    fields.find((f) => f.name === name)?.label ?? name

  // -- Render chart preview --
  const renderChart = () => {
    if (!previewData || previewData.rows.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "No data to display. Adjust your configuration and run a preview."
          )}
        </div>
      )
    }

    const rows = previewData.rows

    if (chartType === "table") {
      return renderDataTable(rows, columns, fieldLabel)
    }

    // For charts, use groupBy field as category axis and first numeric column as value
    const numericCol =
      columns.find((c) => {
        const f = fields.find((fd) => fd.name === c)
        return f?.type === "number"
      }) ?? columns[0]
    const categoryCol = groupBy || columns.find((c) => c !== numericCol) || columns[0]

    const chartData = rows.map((row) => ({
      name: String(row[categoryCol] ?? "N/A"),
      value: Number(row[numericCol] ?? 0),
    }))

    const tooltipStyle = {
      backgroundColor: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "8px",
      color: "hsl(var(--popover-foreground))",
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={120}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {chartData.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Builder</h1>
          <PageDescription text="Create custom reports with filters, grouping, and visualizations." />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={!previewData || previewData.rows.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)}>
            <Save className="h-4 w-4 mr-1" />
            Save Report
          </Button>
        </div>
      </div>

      {/* Main layout: left config + right preview */}
      <div className="flex gap-4" style={{ minHeight: "calc(100vh - 200px)" }}>
        {/* ============== LEFT PANEL ============== */}
        <div
          className="w-[350px] shrink-0 space-y-4 overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {/* Entity Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Entity</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
              >
                {ENTITY_OPTIONS.map((ent) => (
                  <option key={ent.value} value={ent.value}>
                    {ent.label}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {/* Column Picker */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Columns{" "}
                <span className="text-muted-foreground font-normal">
                  ({columns.length} selected)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => {
                  const selected = columns.includes(f.name)
                  return (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => toggleColumn(f.name)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={addFilter}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filters.length === 0 && (
                <p className="text-xs text-muted-foreground">No filters applied.</p>
              )}
              <div className="space-y-2">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex items-end gap-1.5">
                    {/* Field */}
                    <div className="flex-1 min-w-0">
                      <Select
                        className="h-8 text-xs"
                        value={filter.field}
                        onChange={(e) =>
                          updateFilter(filter.id, { field: e.target.value })
                        }
                      >
                        {fields.map((f) => (
                          <option key={f.name} value={f.name}>
                            {f.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {/* Operator */}
                    <div className="w-[100px] shrink-0">
                      <Select
                        className="h-8 text-xs"
                        value={filter.operator}
                        onChange={(e) =>
                          updateFilter(filter.id, { operator: e.target.value })
                        }
                      >
                        {OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {/* Value */}
                    <Input
                      className="h-8 text-xs flex-1 min-w-0"
                      placeholder="Value"
                      value={filter.value}
                      onChange={(e) =>
                        updateFilter(filter.id, { value: e.target.value })
                      }
                    />
                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Group By */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Group By</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="">None</option>
                {fields.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {/* Sort By */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Sort By</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">None</option>
                {fields.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label}
                  </option>
                ))}
              </Select>
              {sortBy && (
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Chart Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Chart Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-1.5">
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setChartType(ct.value)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      chartType === ct.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Saved Reports */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Saved Reports</CardTitle>
                {savedReportsLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {savedReports.length === 0 && !savedReportsLoading && (
                <p className="text-xs text-muted-foreground">No saved reports yet.</p>
              )}
              <div className="space-y-1.5">
                {savedReports.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => loadReport(r)}
                    className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-xs hover:bg-muted transition-colors"
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.name}</div>
                      <div className="text-muted-foreground">
                        {r.config.entity} &middot;{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============== RIGHT PANEL ============== */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-xs text-muted-foreground">Total Records</div>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    (previewData?.total ?? 0)
                  )}
                </div>
              </CardContent>
            </Card>
            {previewData?.aggregates &&
              Object.entries(previewData.aggregates)
                .slice(0, 2)
                .map(([key, val]) => (
                  <Card key={key}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <div className="text-xs text-muted-foreground capitalize">{key}</div>
                      <div className="text-2xl font-bold">
                        {typeof val === "number" ? val.toLocaleString() : val}
                      </div>
                    </CardContent>
                  </Card>
                ))}
            {/* Fill remaining slots when no aggregates */}
            {(!previewData?.aggregates ||
              Object.keys(previewData.aggregates).length === 0) && (
              <>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-xs text-muted-foreground">Columns</div>
                    <div className="text-2xl font-bold">{columns.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="text-xs text-muted-foreground">Filters</div>
                    <div className="text-2xl font-bold">{filters.length}</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Chart / Table */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Preview
                  {loading && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {ENTITY_OPTIONS.find((e) => e.value === entity)?.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {CHART_TYPES.find((c) => c.value === chartType)?.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>{renderChart()}</CardContent>
          </Card>

          {/* Data table below chart (when chart type is not "table") */}
          {chartType !== "table" && previewData && previewData.rows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Data Table ({previewData.rows.length} rows)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderDataTable(previewData.rows, columns, fieldLabel, 300)}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ============== SAVE DIALOG ============== */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReportId ? "Update Report" : "Save Report"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                placeholder="e.g. Monthly Deals Overview"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">
                {ENTITY_OPTIONS.find((e) => e.value === entity)?.label}
              </Badge>
              <Badge variant="outline">{columns.length} columns</Badge>
              <Badge variant="outline">{filters.length} filters</Badge>
              <Badge variant="outline">
                {CHART_TYPES.find((c) => c.value === chartType)?.label}
              </Badge>
            </div>
            {/* Schedule section */}
            <div className="border-t pt-3 mt-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Email Schedule (optional)</p>
              <div>
                <Label htmlFor="schedule-freq" className="text-xs">Frequency</Label>
                <Select
                  value={scheduleFreq}
                  onChange={(e) => setScheduleFreq(e.target.value)}
                  className="mt-1 h-8 text-xs"
                >
                  <option value="">No schedule</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </Select>
              </div>
              {scheduleFreq && (
                <div>
                  <Label htmlFor="schedule-emails" className="text-xs">Recipients (comma-separated)</Label>
                  <Input
                    id="schedule-emails"
                    placeholder="user@example.com, team@company.com"
                    value={scheduleEmails}
                    onChange={(e) => setScheduleEmails(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !reportName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingReportId ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============== EXPORT DIALOG ============== */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <span className="text-sm font-medium">CSV</span>
              <span className="text-xs text-muted-foreground">
                Comma-separated values
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-muted transition-colors"
            >
              <FileSpreadsheet className="h-8 w-8 text-blue-600" />
              <span className="text-sm font-medium">Excel</span>
              <span className="text-xs text-muted-foreground">XLSX spreadsheet</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "-"
  if (typeof val === "number") return val.toLocaleString()
  if (typeof val === "boolean") return val ? "Yes" : "No"
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      try {
        return new Date(val).toLocaleDateString()
      } catch {
        return val
      }
    }
    return val
  }
  return String(val)
}

function renderDataTable(
  rows: Record<string, unknown>[],
  columns: string[],
  fieldLabel: (name: string) => string,
  maxHeight = 500,
) {
  return (
    <div className="overflow-auto border rounded-lg" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="text-left px-3 py-2 font-medium text-muted-foreground border-b"
              >
                {fieldLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
              {columns.map((col) => (
                <td key={col} className="px-3 py-2">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
