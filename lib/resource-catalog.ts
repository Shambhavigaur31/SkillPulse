export type ResourceIntent = "practice" | "course" | "resource" | "notes"

type SkillResourceEntry = {
  key: string
  aliases: string[]
  practiceUrl: string
  courseUrl: string
  resourceUrl: string
  notesUrl: string
}

const RESOURCE_CATALOG: SkillResourceEntry[] = [
  {
    key: "dynamic programming",
    aliases: ["dp"],
    practiceUrl: "https://codeforces.com/problemset?tags=dp",
    courseUrl: "https://usaco.guide/gold/dp-intro",
    resourceUrl: "https://cp-algorithms.com/dynamic_programming/intro-to-dp.html",
    notesUrl: "https://usaco.guide/gold/intro-dp",
  },
  {
    key: "graphs",
    aliases: ["graph"],
    practiceUrl: "https://codeforces.com/problemset?tags=graphs",
    courseUrl: "https://usaco.guide/silver/graph-traversal",
    resourceUrl: "https://cp-algorithms.com/graph/depth-first-search.html",
    notesUrl: "https://cp-algorithms.com/graph/breadth-first-search.html",
  },
  {
    key: "data structures",
    aliases: ["trees", "tree", "segment tree", "fenwick", "dsu"],
    practiceUrl: "https://codeforces.com/problemset?tags=data%20structures",
    courseUrl: "https://usaco.guide/plat/segtree-ext",
    resourceUrl: "https://cp-algorithms.com/data_structures/",
    notesUrl: "https://usaco.guide/silver/more-prefix-sums",
  },
  {
    key: "implementation",
    aliases: [],
    practiceUrl: "https://codeforces.com/problemset?tags=implementation",
    courseUrl: "https://usaco.guide/bronze/simulation",
    resourceUrl: "https://codeforces.com/blog/entry/57282",
    notesUrl: "https://usaco.guide/bronze/simulation",
  },
  {
    key: "number theory",
    aliases: ["math", "algebra"],
    practiceUrl: "https://codeforces.com/problemset?tags=number%20theory",
    courseUrl: "https://usaco.guide/gold/modular",
    resourceUrl: "https://cp-algorithms.com/algebra/",
    notesUrl: "https://cp-algorithms.com/algebra/module-inverse.html",
  },
  {
    key: "strings",
    aliases: ["string"],
    practiceUrl: "https://codeforces.com/problemset?tags=strings",
    courseUrl: "https://usaco.guide/gold/string-hashing",
    resourceUrl: "https://cp-algorithms.com/string/string-hashing.html",
    notesUrl: "https://cp-algorithms.com/string/prefix-function.html",
  },
  {
    key: "greedy",
    aliases: ["greedy algorithms"],
    practiceUrl: "https://codeforces.com/problemset?tags=greedy",
    courseUrl: "https://usaco.guide/silver/greedy-sorting",
    resourceUrl: "https://cp-algorithms.com/schedules/schedule_one_machine.html",
    notesUrl: "https://codeforces.com/blog/entry/111217",
  },
  {
    key: "binary search",
    aliases: [],
    practiceUrl: "https://codeforces.com/problemset?tags=binary%20search",
    courseUrl: "https://usaco.guide/silver/binary-search",
    resourceUrl: "https://cp-algorithms.com/num_methods/binary_search.html",
    notesUrl: "https://usaco.guide/silver/binary-search",
  },
  {
    key: "sorting",
    aliases: ["sortings"],
    practiceUrl: "https://codeforces.com/problemset?tags=sortings",
    courseUrl: "https://usaco.guide/silver/sorting-custom",
    resourceUrl: "https://cp-algorithms.com/sequences/k-th.html",
    notesUrl: "https://usaco.guide/silver/sorting-custom",
  },
  {
    key: "two pointers",
    aliases: ["two pointer"],
    practiceUrl: "https://codeforces.com/problemset?tags=two%20pointers",
    courseUrl: "https://usaco.guide/silver/two-pointers",
    resourceUrl: "https://usaco.guide/silver/two-pointers",
    notesUrl: "https://cp-algorithms.com/others/tortoise_and_hare.html",
  },
  {
    key: "bitmasks",
    aliases: ["bitmask"],
    practiceUrl: "https://codeforces.com/problemset?tags=bitmasks",
    courseUrl: "https://usaco.guide/gold/dp-bitmasks",
    resourceUrl: "https://cp-algorithms.com/algebra/bitmasks.html",
    notesUrl: "https://usaco.guide/gold/dp-bitmasks",
  },
]

function normalizeSkillKey(skill: string): string {
  return skill.trim().toLowerCase()
}

function findCatalogEntry(skill: string): SkillResourceEntry | null {
  const normalized = normalizeSkillKey(skill)
  if (!normalized) return null

  const exact =
    RESOURCE_CATALOG.find((entry) => entry.key === normalized) ??
    RESOURCE_CATALOG.find((entry) => entry.aliases.includes(normalized))
  if (exact) return exact

  return (
    RESOURCE_CATALOG.find(
      (entry) =>
        normalized.includes(entry.key) ||
        entry.aliases.some((alias) => normalized.includes(alias))
    ) ?? null
  )
}

export function resolveSkillResourceUrl(skill: string, intent: ResourceIntent): string | null {
  const entry = findCatalogEntry(skill)
  if (!entry) return null
  if (intent === "practice") return entry.practiceUrl
  if (intent === "course") return entry.courseUrl
  if (intent === "notes") return entry.notesUrl
  return entry.resourceUrl
}

