export const SKILL_DEPENDENCY_GRAPH: Record<string, string[]> = {
  greedy: ["brute force"],
  dp: ["greedy"],
  graphs: ["dp"],
  trees: ["graphs"],
  "number theory": ["math"],
  combinatorics: ["math"],
  "binary search": ["greedy"],
  "two pointers": ["greedy"],
  bitmasks: ["dp"],
  "dfs and similar": ["graphs"],
  dsu: ["data structures"],
  "data structures": ["implementation"],
}

export interface GraphSkillNode {
  skill: string
  ars: number
  baseArs: number
  cascadedArs: number
  cascadeDelta: number
  risk: string
}

export interface GraphImpactRow {
  sourceSkill: string
  targetSkill: string
  sourceArs: number
  targetBaseArs: number
  targetCascadedArs: number
  cascadeDelta: number
  explanation: string
}

function labelize(skill: string): string {
  if (!skill) return skill
  return skill
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function buildDependencyImpacts(nodes: GraphSkillNode[]): GraphImpactRow[] {
  const bySkill = new Map(nodes.map((node) => [node.skill, node]))
  const impacts: GraphImpactRow[] = []

  for (const targetNode of nodes) {
    const deps = SKILL_DEPENDENCY_GRAPH[targetNode.skill] ?? []
    for (const dep of deps) {
      const sourceNode = bySkill.get(dep)
      if (!sourceNode) continue
      const explanation =
        targetNode.cascadeDelta > 0
          ? `${labelize(targetNode.skill)} risk increased by ${targetNode.cascadeDelta.toFixed(1)} due to weakening ${labelize(dep)} retention.`
          : `${labelize(dep)} currently has limited negative cascade effect on ${labelize(targetNode.skill)}.`
      impacts.push({
        sourceSkill: sourceNode.skill,
        targetSkill: targetNode.skill,
        sourceArs: sourceNode.ars,
        targetBaseArs: targetNode.baseArs,
        targetCascadedArs: targetNode.cascadedArs,
        cascadeDelta: targetNode.cascadeDelta,
        explanation,
      })
    }
  }

  return impacts.sort((a, b) => b.cascadeDelta - a.cascadeDelta || b.sourceArs - a.sourceArs)
}
