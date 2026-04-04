"use client"

import { useCallback, useState, useRef } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Button } from "@/components/ui/button"
import {
  Mail, Clock, GitBranch, Plus, Save, Trash2,
  MessageSquare, Bell, CheckCircle2, Smartphone, UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ───── types ───── */
export type JourneyNodeType = "trigger" | "send_email" | "wait" | "condition" | "create_task" | "send_telegram" | "send_whatsapp" | "sms"

export interface JourneyNodeData {
  label: string
  type: JourneyNodeType
  config?: Record<string, any>
  [key: string]: unknown
}

const NODE_DEFS: { type: JourneyNodeType; label: string; icon: any; color: string; bg: string }[] = [
  { type: "trigger", label: "Trigger", icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50 border-blue-300" },
  { type: "send_email", label: "Send Email", icon: Mail, color: "text-green-600", bg: "bg-green-50 border-green-300" },
  { type: "wait", label: "Wait", icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-300" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "text-orange-600", bg: "bg-orange-50 border-orange-300" },
  { type: "create_task", label: "Create Task", icon: CheckCircle2, color: "text-teal-600", bg: "bg-teal-50 border-teal-300" },
  { type: "send_telegram", label: "Telegram", icon: MessageSquare, color: "text-sky-600", bg: "bg-sky-50 border-sky-300" },
  { type: "send_whatsapp", label: "WhatsApp", icon: Smartphone, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-300" },
  { type: "sms", label: "SMS", icon: Bell, color: "text-violet-600", bg: "bg-violet-50 border-violet-300" },
]

/* ───── custom node ───── */
function JourneyNode({ data, selected }: { data: JourneyNodeData; selected?: boolean }) {
  const def = NODE_DEFS.find(d => d.type === data.type) || NODE_DEFS[0]
  const Icon = def.icon
  const isCondition = data.type === "condition"
  const isTrigger = data.type === "trigger"

  return (
    <div className={cn(
      "relative rounded-xl border-2 px-4 py-3 shadow-md min-w-[160px] transition-all",
      def.bg,
      selected && "ring-2 ring-primary",
    )}>
      {!isTrigger && (
        <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-gray-400 !border-white !border-2" />
      )}

      <div className="flex items-center gap-2">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-white shadow-sm", def.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{data.label}</p>
          <p className="text-[10px] text-gray-500 capitalize">{data.type.replace(/_/g, " ")}</p>
        </div>
      </div>

      {data.config?.subject && (
        <p className="text-[10px] text-gray-500 mt-1.5 line-clamp-1">Subject: {data.config.subject}</p>
      )}
      {data.config?.days && (
        <p className="text-[10px] text-gray-500 mt-1.5">Wait: {data.config.days} days</p>
      )}

      {isCondition ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" className="!w-3 !h-3 !bg-green-500 !border-white !border-2" style={{ left: "30%" }} />
          <Handle type="source" position={Position.Bottom} id="no" className="!w-3 !h-3 !bg-red-500 !border-white !border-2" style={{ left: "70%" }} />
          <div className="flex justify-between px-2 mt-1">
            <span className="text-[9px] text-green-600 font-medium">Yes</span>
            <span className="text-[9px] text-red-600 font-medium">No</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-gray-400 !border-white !border-2" />
      )}
    </div>
  )
}

const nodeTypes: NodeTypes = {
  journeyNode: JourneyNode as any,
}

/* ───── helpers: convert steps ↔ nodes ───── */
export function stepsToFlow(steps: any[]): { nodes: Node[]; edges: Edge[] } {
  if (!steps?.length) {
    return {
      nodes: [{ id: "trigger-1", type: "journeyNode", position: { x: 250, y: 50 }, data: { label: "Entry Trigger", type: "trigger" } as JourneyNodeData }],
      edges: [],
    }
  }

  const nodes: Node[] = [
    { id: "trigger-1", type: "journeyNode", position: { x: 250, y: 50 }, data: { label: "Entry Trigger", type: "trigger" } as JourneyNodeData },
  ]
  const edges: Edge[] = []

  steps.sort((a, b) => a.stepOrder - b.stepOrder).forEach((step, i) => {
    const nodeId = `step-${step.id || i}`
    nodes.push({
      id: nodeId,
      type: "journeyNode",
      position: { x: 250, y: 180 + i * 130 },
      data: {
        label: NODE_DEFS.find(d => d.type === step.stepType)?.label || step.stepType,
        type: step.stepType as JourneyNodeType,
        config: step.config || {},
      } as JourneyNodeData,
    })

    const sourceId = i === 0 ? "trigger-1" : `step-${steps[i - 1].id || (i - 1)}`
    edges.push({
      id: `e-${sourceId}-${nodeId}`,
      source: sourceId,
      target: nodeId,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    })
  })

  return { nodes, edges }
}

export function flowToSteps(nodes: Node[], edges: Edge[]): any[] {
  // Topological sort from trigger node
  const adjacency: Record<string, string[]> = {}
  edges.forEach(e => {
    if (!adjacency[e.source]) adjacency[e.source] = []
    adjacency[e.source].push(e.target)
  })

  const visited = new Set<string>()
  const ordered: string[] = []

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    ordered.push(nodeId)
    ;(adjacency[nodeId] || []).forEach(dfs)
  }

  dfs("trigger-1")

  return ordered
    .filter(id => id !== "trigger-1")
    .map((id, i) => {
      const node = nodes.find(n => n.id === id)
      if (!node) return null
      const data = node.data as JourneyNodeData
      return {
        stepOrder: i + 1,
        stepType: data.type,
        config: data.config || {},
      }
    })
    .filter(Boolean)
}

/* ───── editor ───── */
interface JourneyFlowEditorProps {
  steps?: any[]
  onSave?: (steps: any[]) => Promise<void>
}

export function JourneyFlowEditor({ steps, onSave }: JourneyFlowEditorProps) {
  const initial = stepsToFlow(steps || [])
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)
  const [saving, setSaving] = useState(false)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const idCounter = useRef(nodes.length + 1)

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    }, eds))
  }, [setEdges])

  const addNode = useCallback((type: JourneyNodeType) => {
    const def = NODE_DEFS.find(d => d.type === type)!
    const id = `${type}-${++idCounter.current}`
    const newNode: Node = {
      id,
      type: "journeyNode",
      position: { x: 200 + Math.random() * 200, y: 100 + nodes.length * 130 },
      data: { label: def.label, type, config: {} } as JourneyNodeData,
    }
    setNodes(nds => [...nds, newNode])
  }, [nodes.length, setNodes])

  const deleteSelected = useCallback(() => {
    if (!selectedNode || selectedNode === "trigger-1") return
    setNodes(nds => nds.filter(n => n.id !== selectedNode))
    setEdges(eds => eds.filter(e => e.source !== selectedNode && e.target !== selectedNode))
    setSelectedNode(null)
  }, [selectedNode, setNodes, setEdges])

  const handleSave = useCallback(async () => {
    if (!onSave) return
    setSaving(true)
    try {
      const steps = flowToSteps(nodes, edges)
      await onSave(steps)
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, onSave])

  return (
    <div className="flex flex-col h-[550px] rounded-xl border bg-white dark:bg-gray-900 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-gray-50/80 dark:bg-gray-800/80 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground mr-2">Add step:</span>
        {NODE_DEFS.filter(d => d.type !== "trigger").map(def => {
          const Icon = def.icon
          return (
            <Button key={def.type} variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addNode(def.type)}>
              <Icon className={cn("h-3 w-3", def.color)} />
              {def.label}
            </Button>
          )
        })}
        <div className="flex-1" />
        {selectedNode && selectedNode !== "trigger-1" && (
          <Button variant="outline" size="sm" className="h-7 text-xs text-red-500 gap-1" onClick={deleteSelected}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        )}
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
          <Save className="h-3 w-3" /> {saving ? "..." : "Save"}
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#e2e8f0" />
          <Controls showInteractive={false} className="!bg-white !shadow-md !border !rounded-lg" />
          <MiniMap
            className="!bg-gray-50 !border !rounded-lg !shadow-sm"
            maskColor="rgba(0,0,0,0.05)"
            nodeColor={(n: Node) => {
              const d = n.data as JourneyNodeData
              const map: Record<string, string> = {
                trigger: "#3b82f6", send_email: "#22c55e", wait: "#f59e0b",
                condition: "#f97316", create_task: "#0176D3", send_telegram: "#0176D3",
                send_whatsapp: "#10b981", sms: "#8b5cf6",
              }
              return map[d.type] || "#94a3b8"
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
