"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { riskChartColor } from "@/components/premium/risk-theme"
import type { RiskLabel } from "@/lib/skillpulse-product"
import { cn } from "@/lib/utils"

export type ForceSkill = {
  skill: string
  ars: number
  cascadeDelta: number
  risk: RiskLabel
}

export type ForceImpact = {
  sourceSkill: string
  targetSkill: string
  cascadeDelta: number
  explanation: string
}

type ForceNode = {
  id: string
  skill: string
  risk: RiskLabel
  ars: number
  cascadeDelta: number
  x: number
  y: number
  vx: number
  vy: number
}

type ForceEdge = {
  id: string
  source: string
  target: string
  weight: number
  explanation: string
}

const NODE_RADIUS = 14
const EDGE_DISTANCE = 120
const REPULSION = 7200
const DAMPING = 0.82

export function SkillForceGraph({
  skills,
  impacts,
  className,
}: {
  skills: ForceSkill[]
  impacts: ForceImpact[]
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 380 })
  const [nodes, setNodes] = useState<ForceNode[]>([])
  const [edges, setEdges] = useState<ForceEdge[]>([])
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)

  const impactBySkill = useMemo(() => {
    const map = new Map<string, ForceImpact[]>()
    impacts.forEach((impact) => {
      const list = map.get(impact.targetSkill) ?? []
      list.push(impact)
      map.set(impact.targetSkill, list)
    })
    return map
  }, [impacts])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions({ width, height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (skills.length === 0) {
      setNodes([])
      setEdges([])
      return
    }

    const nextNodes: ForceNode[] = skills.map((skill) => ({
      id: skill.skill,
      skill: skill.skill,
      risk: skill.risk,
      ars: skill.ars,
      cascadeDelta: skill.cascadeDelta,
      x: Math.random() * (dimensions.width - 80) + 40,
      y: Math.random() * (dimensions.height - 80) + 40,
      vx: 0,
      vy: 0,
    }))

    const nextEdges: ForceEdge[] = impacts.map((impact) => ({
      id: `${impact.sourceSkill}-${impact.targetSkill}`,
      source: impact.sourceSkill,
      target: impact.targetSkill,
      weight: Math.max(1, impact.cascadeDelta),
      explanation: impact.explanation,
    }))

    setNodes(nextNodes)
    setEdges(nextEdges)
  }, [dimensions.height, dimensions.width, impacts, skills])

  useEffect(() => {
    if (nodes.length === 0) return
    let frameId = 0

    function tick() {
      setNodes((prev) => {
        const next = prev.map((node) => ({ ...node }))
        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i]
            const b = next[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.max(24, Math.hypot(dx, dy))
            const force = REPULSION / (dist * dist)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx += fx
            a.vy += fy
            b.vx -= fx
            b.vy -= fy
          }
        }

        edges.forEach((edge) => {
          const source = next.find((node) => node.id === edge.source)
          const target = next.find((node) => node.id === edge.target)
          if (!source || !target) return
          const dx = target.x - source.x
          const dy = target.y - source.y
          const dist = Math.max(40, Math.hypot(dx, dy))
          const spring = (dist - EDGE_DISTANCE) * 0.004 * edge.weight
          const fx = (dx / dist) * spring
          const fy = (dy / dist) * spring
          source.vx += fx
          source.vy += fy
          target.vx -= fx
          target.vy -= fy
        })

        next.forEach((node) => {
          node.vx *= DAMPING
          node.vy *= DAMPING
          node.x = Math.min(dimensions.width - 30, Math.max(30, node.x + node.vx))
          node.y = Math.min(dimensions.height - 30, Math.max(30, node.y + node.vy))
        })

        return next
      })
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [dimensions.height, dimensions.width, edges, nodes.length])

  const hoveredImpacts = hoveredSkill ? impactBySkill.get(hoveredSkill) ?? [] : []

  return (
    <div className={cn("grid gap-4 xl:grid-cols-5", className)}>
      <div ref={containerRef} className="relative h-95 w-full xl:col-span-3">
        <svg width={dimensions.width} height={dimensions.height} className="h-full w-full">
          {edges.map((edge) => {
            const source = nodes.find((node) => node.id === edge.source)
            const target = nodes.find((node) => node.id === edge.target)
            if (!source || !target) return null
            const active = hoveredSkill
              ? edge.source === hoveredSkill || edge.target === hoveredSkill
              : true
            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={active ? "rgba(148,163,184,0.7)" : "rgba(148,163,184,0.2)"}
                strokeWidth={active ? Math.min(4, 1 + edge.weight / 6) : 1}
              />
            )
          })}
          {nodes.map((node) => {
            const active = hoveredSkill ? hoveredSkill === node.skill : true
            return (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredSkill(node.skill)}
                onMouseLeave={() => setHoveredSkill(null)}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS}
                  fill={riskChartColor(node.risk)}
                  opacity={active ? 0.95 : 0.35}
                />
                <text
                  x={node.x}
                  y={node.y + NODE_RADIUS + 12}
                  textAnchor="middle"
                  className="fill-foreground text-[10px]"
                  opacity={active ? 0.9 : 0.35}
                >
                  {node.skill}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="space-y-3 xl:col-span-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold text-foreground">Prerequisite influence</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Hover a node to reveal why its risk escalates and which prerequisites drive it.
          </p>
        </div>
        {hoveredSkill ? (
          <div className="space-y-2">
            {hoveredImpacts.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
                No cascade explanations for this node.
              </div>
            ) : (
              hoveredImpacts.slice(0, 4).map((impact) => (
                <div key={impact.explanation} className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                  <p className="font-semibold text-foreground">{impact.sourceSkill} {"→"} {impact.targetSkill}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{impact.explanation}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground">
            Hover a node to see cascade explanations.
          </div>
        )}
      </div>
    </div>
  )
}
