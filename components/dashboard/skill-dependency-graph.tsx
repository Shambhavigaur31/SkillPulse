"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ZoomIn, ZoomOut, Maximize2, AlertTriangle } from "lucide-react"

interface SkillNode {
  id: string
  name: string
  retention: number
  x: number
  y: number
  dependencies: string[]
  cascadeRisk: number
  category: string
}

const initialSkillNodes: SkillNode[] = [
  { id: "1", name: "Big O Notation", retention: 90, x: 400, y: 50, dependencies: [], cascadeRisk: 0, category: "Fundamentals" },
  { id: "2", name: "Arrays & Strings", retention: 92, x: 200, y: 150, dependencies: ["1"], cascadeRisk: 5, category: "Data Structures" },
  { id: "3", name: "Recursion", retention: 82, x: 600, y: 150, dependencies: ["1"], cascadeRisk: 15, category: "Fundamentals" },
  { id: "4", name: "Linked Lists", retention: 78, x: 100, y: 280, dependencies: ["2"], cascadeRisk: 20, category: "Data Structures" },
  { id: "5", name: "Trees & BST", retention: 85, x: 320, y: 280, dependencies: ["2", "3"], cascadeRisk: 10, category: "Data Structures" },
  { id: "6", name: "Sorting Algorithms", retention: 72, x: 520, y: 280, dependencies: ["2", "3"], cascadeRisk: 25, category: "Algorithms" },
  { id: "7", name: "Graph Theory", retention: 45, x: 180, y: 420, dependencies: ["4", "5"], cascadeRisk: 55, category: "Data Structures" },
  { id: "8", name: "Dynamic Programming", retention: 38, x: 620, y: 420, dependencies: ["3", "6"], cascadeRisk: 65, category: "Algorithms" },
  { id: "9", name: "Hash Tables", retention: 88, x: 400, y: 150, dependencies: ["1", "2"], cascadeRisk: 8, category: "Data Structures" },
  { id: "10", name: "Heaps & Priority Q", retention: 65, x: 700, y: 280, dependencies: ["5"], cascadeRisk: 30, category: "Data Structures" },
  { id: "11", name: "Backtracking", retention: 52, x: 400, y: 420, dependencies: ["3", "5"], cascadeRisk: 40, category: "Algorithms" },
]

const getNodeColor = (retention: number) => {
  if (retention >= 85) return { bg: "#22c55e", stroke: "#16a34a" }
  if (retention >= 70) return { bg: "#eab308", stroke: "#ca8a04" }
  if (retention >= 50) return { bg: "#f97316", stroke: "#ea580c" }
  return { bg: "#ef4444", stroke: "#dc2626" }
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    "Fundamentals": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "Data Structures": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "Algorithms": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  }
  return colors[category] || "bg-gray-100 text-gray-800"
}

export function SkillDependencyGraph() {
  const [nodes, setNodes] = useState(initialSkillNodes)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const getAffectedNodes = useCallback((nodeId: string): string[] => {
    const affected: string[] = []
    const queue = [nodeId]
    
    while (queue.length > 0) {
      const current = queue.shift()!
      nodes.forEach(node => {
        if (node.dependencies.includes(current) && !affected.includes(node.id)) {
          affected.push(node.id)
          queue.push(node.id)
        }
      })
    }
    return affected
  }, [nodes])
  
  const affectedNodes = hoveredNode ? getAffectedNodes(hoveredNode) : []
  
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setDraggingNode(nodeId)
  }
  
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!draggingNode) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingNode && svgRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom
      
      setNodes(prev => prev.map(node => 
        node.id === draggingNode 
          ? { ...node, x: Math.max(50, Math.min(750, x)), y: Math.max(30, Math.min(480, y)) }
          : node
      ))
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }, [draggingNode, isPanning, pan.x, pan.y, panStart.x, panStart.y, zoom])
  
  const handleMouseUp = useCallback(() => {
    setDraggingNode(null)
    setIsPanning(false)
  }, [])
  
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])
  
  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  
  const criticalNodes = nodes.filter(n => n.retention < 50)
  
  return (
    <Card className="border-none shadow-sm" id="dependency-graph">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Skill Dependency Graph</CardTitle>
            <CardDescription>Drag nodes to rearrange. Hover to see cascade risk.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {criticalNodes.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalNodes.length} Critical
              </Badge>
            )}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="relative h-[500px] w-full overflow-hidden rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-border cursor-grab active:cursor-grabbing"
          onMouseDown={handleContainerMouseDown}
        >
          <svg 
            ref={svgRef}
            className="h-full w-full" 
            viewBox="0 0 800 500"
            style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-muted-foreground/40" />
              </marker>
              <marker
                id="arrowhead-danger"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
              </filter>
            </defs>
            
            {/* Draw edges with curved lines */}
            {nodes.map((node) =>
              node.dependencies.map((depId) => {
                const depNode = nodes.find((n) => n.id === depId)
                if (!depNode) return null
                const isAffected = hoveredNode === depId || (hoveredNode && affectedNodes.includes(node.id))
                
                // Calculate control point for curved line
                const midX = (depNode.x + node.x) / 2
                const midY = (depNode.y + node.y) / 2
                const dx = node.x - depNode.x
                const dy = node.y - depNode.y
                const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2
                const ctrlX = midX + (dy > 0 ? offset : -offset)
                const ctrlY = midY
                
                return (
                  <g key={`${depId}-${node.id}`}>
                    <path
                      d={`M ${depNode.x} ${depNode.y} Q ${ctrlX} ${ctrlY} ${node.x} ${node.y}`}
                      fill="none"
                      className={cn(
                        "transition-all duration-300",
                        isAffected 
                          ? "stroke-destructive" 
                          : "stroke-muted-foreground/30"
                      )}
                      strokeWidth={isAffected ? 2.5 : 1.5}
                      strokeDasharray={isAffected ? "8,4" : "none"}
                      markerEnd={isAffected ? "url(#arrowhead-danger)" : "url(#arrowhead)"}
                    />
                  </g>
                )
              })
            )}
            
            {/* Draw nodes */}
            {nodes.map((node) => {
              const isHovered = hoveredNode === node.id
              const isAffected = affectedNodes.includes(node.id)
              const isDragging = draggingNode === node.id
              const colors = getNodeColor(node.retention)
              const nodeSize = isHovered || isDragging ? 32 : 28
              
              return (
                <g 
                  key={node.id}
                  style={{ cursor: draggingNode ? 'grabbing' : 'grab' }}
                >
                  {/* Pulse animation for critical nodes */}
                  {node.retention < 50 && (
                    <>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeSize + 12}
                        fill={colors.bg}
                        opacity={0.2}
                        className="animate-ping"
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={nodeSize + 6}
                        fill={colors.bg}
                        opacity={0.3}
                      />
                    </>
                  )}
                  
                  {/* Node background circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize}
                    fill="white"
                    stroke={isAffected ? "#ef4444" : colors.stroke}
                    strokeWidth={isHovered || isDragging ? 4 : 3}
                    filter="url(#shadow)"
                    className="transition-all duration-200"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => !draggingNode && setHoveredNode(null)}
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onClick={() => setSelectedNode(node)}
                  />
                  
                  {/* Retention percentage ring */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeSize - 4}
                    fill="none"
                    stroke={colors.bg}
                    strokeWidth={6}
                    strokeDasharray={`${(node.retention / 100) * (2 * Math.PI * (nodeSize - 4))} ${2 * Math.PI * (nodeSize - 4)}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${node.x} ${node.y})`}
                    className="transition-all duration-300"
                  />
                  
                  {/* Node content */}
                  <text
                    x={node.x}
                    y={node.y - 3}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-bold pointer-events-none select-none"
                  >
                    {node.retention}%
                  </text>
                  
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y + nodeSize + 16}
                    textAnchor="middle"
                    className={cn(
                      "text-[11px] font-medium pointer-events-none select-none transition-opacity",
                      isHovered || isAffected ? "fill-foreground" : "fill-muted-foreground"
                    )}
                  >
                    {node.name}
                  </text>
                </g>
              )
            })}
          </svg>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-xl bg-card/95 backdrop-blur-sm p-3 text-xs shadow-lg border border-border">
            <p className="font-semibold text-foreground mb-1">Retention Level</p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Strong (85%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Good (70-84%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Weakening (50-69%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-muted-foreground">Critical (&lt;50%)</span>
            </div>
          </div>
          
          {/* Zoom indicator */}
          <div className="absolute bottom-4 right-4 rounded-lg bg-card/95 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border">
            {Math.round(zoom * 100)}%
          </div>
        </div>
        
        {/* Selected node details */}
        {selectedNode && (
          <div className="mt-4 rounded-xl border border-border bg-card p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div 
                    className="h-4 w-4 rounded-full" 
                    style={{ backgroundColor: getNodeColor(selectedNode.retention).bg }}
                  />
                  <h4 className="font-semibold text-foreground text-lg">{selectedNode.name}</h4>
                  <Badge className={getCategoryColor(selectedNode.category)}>{selectedNode.category}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium">Prerequisites:</span>{" "}
                  {selectedNode.dependencies.length > 0 
                    ? nodes.filter(n => selectedNode.dependencies.includes(n.id)).map(n => n.name).join(", ")
                    : "None (Foundation skill)"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>Close</Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{selectedNode.retention}%</p>
                <p className="text-xs text-muted-foreground mt-1">Current Retention</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className="text-3xl font-bold text-foreground">{getAffectedNodes(selectedNode.id).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Dependent Skills</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-4 text-center">
                <p className={cn(
                  "text-3xl font-bold",
                  selectedNode.cascadeRisk > 40 ? "text-destructive" : selectedNode.cascadeRisk > 20 ? "text-warning" : "text-success"
                )}>
                  {selectedNode.cascadeRisk}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cascade Risk</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
