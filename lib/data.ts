// Comprehensive dummy data for the SkillPulse Dashboard

export interface Skill {
  id: string
  name: string
  category: string
  ars: number // Atrophy Risk Score (0-100, higher = more at risk)
  retention: number
  lastPracticed: string
  daysSinceLastPractice: number
  solveCount: number
  stability: number
  cri: number // Cascade Risk Index
  trend: "improving" | "stable" | "decaying"
  dependencies: string[]
}

export interface LeaderboardUser {
  rank: number
  name: string
  xp: number
  level: number
  streak: number
  healthScore: number
  isCurrentUser: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  progress: number
  total: number
  unlocked: boolean
  rarity: "common" | "rare" | "epic" | "legendary"
  unlockedAt?: string
}

export interface PracticeTask {
  id: string
  skill: string
  skillId: string
  reason: string
  priority: "urgent" | "recommended" | "optional"
  estimatedTime: number
  xpReward: number
  retention: number
  scheduledDate: string
  nextReviewDate?: string
  difficulty?: number
}

export interface CourseRecommendation {
  id: string
  title: string
  platform: "nptel" | "coursera" | "youtube" | "udemy" | "mit_ocw"
  instructor: string
  skills: string[]
  duration: string
  rating: number
  enrolled: number
  url: string
  thumbnail: string
  difficulty: "beginner" | "intermediate" | "advanced"
  description: string
  isFree: boolean
  price?: string
}

export interface Notification {
  id: string
  type: "critical" | "warning" | "info" | "success"
  skill: string
  ars: number
  message: string
  timestamp: string
  read: boolean
}

export interface WeeklyActivity {
  day: string
  sessions: number
  xp: number
  retention: number
  skillsReviewed: number
}

export interface AtrophyTimelinePoint {
  month: string
  skills: { [skillName: string]: number }
  events?: { type: "exam" | "project" | "break"; label: string }[]
}

// Current User Data
export const currentUser = {
  name: "Jordan Lee",
  level: 21,
  xp: 10800,
  xpToNextLevel: 12000,
  streak: 28,
  totalSkills: 24,
  criticalSkills: 3,
  atRiskSkills: 5,
  safeSkills: 16,
  overallRetention: 78,
  rank: 3,
  joinedDate: "2024-09-15"
}

// Alias for easier imports
export const userData = {
  name: "Jordan Lee",
  level: 21,
  xpToday: 450,
  totalXP: 10800,
  streak: 28,
}

// Skills Data with full details
export const skillsData: Skill[] = [
  { id: "1", name: "Arrays", category: "Data Structures", ars: 8, retention: 92, lastPracticed: "2 days ago", daysSinceLastPractice: 2, solveCount: 45, stability: 0.92, cri: 5, trend: "stable", dependencies: [] },
  { id: "2", name: "Linked Lists", category: "Data Structures", ars: 32, retention: 78, lastPracticed: "5 days ago", daysSinceLastPractice: 5, solveCount: 28, stability: 0.75, cri: 20, trend: "decaying", dependencies: ["1"] },
  { id: "3", name: "Trees", category: "Data Structures", ars: 15, retention: 85, lastPracticed: "3 days ago", daysSinceLastPractice: 3, solveCount: 35, stability: 0.85, cri: 10, trend: "improving", dependencies: ["1", "2"] },
  { id: "4", name: "Graphs", category: "Data Structures", ars: 65, retention: 45, lastPracticed: "14 days ago", daysSinceLastPractice: 14, solveCount: 15, stability: 0.45, cri: 55, trend: "decaying", dependencies: ["2", "3"] },
  { id: "5", name: "Hash Tables", category: "Data Structures", ars: 12, retention: 88, lastPracticed: "1 day ago", daysSinceLastPractice: 1, solveCount: 42, stability: 0.88, cri: 8, trend: "improving", dependencies: ["1"] },
  { id: "6", name: "Heaps", category: "Data Structures", ars: 45, retention: 62, lastPracticed: "9 days ago", daysSinceLastPractice: 9, solveCount: 18, stability: 0.60, cri: 35, trend: "decaying", dependencies: ["3"] },
  { id: "7", name: "Binary Search", category: "Algorithms", ars: 5, retention: 95, lastPracticed: "Today", daysSinceLastPractice: 0, solveCount: 52, stability: 0.95, cri: 3, trend: "stable", dependencies: ["1"] },
  { id: "8", name: "Sorting", category: "Algorithms", ars: 38, retention: 72, lastPracticed: "7 days ago", daysSinceLastPractice: 7, solveCount: 30, stability: 0.70, cri: 25, trend: "decaying", dependencies: ["1", "7"] },
  { id: "9", name: "Dynamic Programming", category: "Algorithms", ars: 72, retention: 38, lastPracticed: "21 days ago", daysSinceLastPractice: 21, solveCount: 12, stability: 0.35, cri: 65, trend: "decaying", dependencies: ["1", "8"] },
  { id: "10", name: "Recursion", category: "Algorithms", ars: 18, retention: 82, lastPracticed: "4 days ago", daysSinceLastPractice: 4, solveCount: 38, stability: 0.82, cri: 15, trend: "stable", dependencies: [] },
  { id: "11", name: "Greedy Algorithms", category: "Algorithms", ars: 42, retention: 65, lastPracticed: "10 days ago", daysSinceLastPractice: 10, solveCount: 20, stability: 0.62, cri: 30, trend: "decaying", dependencies: ["8"] },
  { id: "12", name: "Backtracking", category: "Algorithms", ars: 55, retention: 52, lastPracticed: "12 days ago", daysSinceLastPractice: 12, solveCount: 14, stability: 0.50, cri: 45, trend: "decaying", dependencies: ["10"] },
  { id: "13", name: "Big O Notation", category: "Fundamentals", ars: 10, retention: 90, lastPracticed: "2 days ago", daysSinceLastPractice: 2, solveCount: 40, stability: 0.90, cri: 0, trend: "stable", dependencies: [] },
  { id: "14", name: "OOP Concepts", category: "Fundamentals", ars: 42, retention: 68, lastPracticed: "10 days ago", daysSinceLastPractice: 10, solveCount: 25, stability: 0.65, cri: 28, trend: "decaying", dependencies: [] },
  { id: "15", name: "Design Patterns", category: "Fundamentals", ars: 52, retention: 55, lastPracticed: "15 days ago", daysSinceLastPractice: 15, solveCount: 10, stability: 0.52, cri: 40, trend: "decaying", dependencies: ["14"] },
  { id: "16", name: "SQL Queries", category: "Databases", ars: 55, retention: 55, lastPracticed: "12 days ago", daysSinceLastPractice: 12, solveCount: 22, stability: 0.52, cri: 35, trend: "decaying", dependencies: [] },
  { id: "17", name: "Normalization", category: "Databases", ars: 48, retention: 60, lastPracticed: "11 days ago", daysSinceLastPractice: 11, solveCount: 15, stability: 0.58, cri: 32, trend: "decaying", dependencies: ["16"] },
  { id: "18", name: "Indexing", category: "Databases", ars: 62, retention: 48, lastPracticed: "16 days ago", daysSinceLastPractice: 16, solveCount: 8, stability: 0.45, cri: 50, trend: "decaying", dependencies: ["16", "17"] },
]

// Leaderboard
export const leaderboardData: LeaderboardUser[] = [
  { rank: 1, name: "Alex Chen", xp: 12450, level: 24, streak: 45, healthScore: 92, isCurrentUser: false },
  { rank: 2, name: "Sarah Kim", xp: 11200, level: 22, streak: 30, healthScore: 88, isCurrentUser: false },
  { rank: 3, name: "Jordan Lee", xp: 10800, level: 21, streak: 28, healthScore: 78, isCurrentUser: true },
  { rank: 4, name: "Maya Patel", xp: 9650, level: 19, streak: 15, healthScore: 82, isCurrentUser: false },
  { rank: 5, name: "Sam Wilson", xp: 8900, level: 18, streak: 12, healthScore: 75, isCurrentUser: false },
  { rank: 6, name: "Emma Davis", xp: 8200, level: 17, streak: 8, healthScore: 70, isCurrentUser: false },
  { rank: 7, name: "Raj Sharma", xp: 7800, level: 16, streak: 20, healthScore: 85, isCurrentUser: false },
  { rank: 8, name: "Lisa Wang", xp: 7200, level: 15, streak: 5, healthScore: 68, isCurrentUser: false },
  { rank: 9, name: "Tom Brown", xp: 6800, level: 14, streak: 3, healthScore: 72, isCurrentUser: false },
  { rank: 10, name: "Anna Lopez", xp: 6200, level: 13, streak: 10, healthScore: 79, isCurrentUser: false },
]

// Achievements
export const achievementsData: Achievement[] = [
  { id: "1", name: "First Steps", description: "Complete your first practice session", icon: "footprints", progress: 1, total: 1, unlocked: true, rarity: "common", unlockedAt: "2024-09-16" },
  { id: "2", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "flame", progress: 7, total: 7, unlocked: true, rarity: "common", unlockedAt: "2024-09-23" },
  { id: "3", name: "Month Master", description: "Maintain a 30-day streak", icon: "calendar", progress: 28, total: 30, unlocked: false, rarity: "rare" },
  { id: "4", name: "Data Master", description: "Achieve 90% in all Data Structures", icon: "database", progress: 3, total: 6, unlocked: false, rarity: "rare" },
  { id: "5", name: "Algorithm Ace", description: "Complete 50 algorithm challenges", icon: "zap", progress: 32, total: 50, unlocked: false, rarity: "rare" },
  { id: "6", name: "Perfect Recall", description: "Score 100% on 10 review sessions", icon: "brain", progress: 6, total: 10, unlocked: false, rarity: "epic" },
  { id: "7", name: "Knowledge Keeper", description: "Keep all skills above 70% for 2 weeks", icon: "shield", progress: 8, total: 14, unlocked: false, rarity: "epic" },
  { id: "8", name: "Speed Demon", description: "Complete 5 sessions under 10 minutes each", icon: "timer", progress: 3, total: 5, unlocked: false, rarity: "rare" },
  { id: "9", name: "Night Owl", description: "Practice after midnight 10 times", icon: "moon", progress: 4, total: 10, unlocked: false, rarity: "common" },
  { id: "10", name: "Grandmaster", description: "Reach Level 50", icon: "crown", progress: 21, total: 50, unlocked: false, rarity: "legendary" },
  { id: "11", name: "Comeback Kid", description: "Revive 5 critical skills", icon: "refresh", progress: 2, total: 5, unlocked: false, rarity: "epic" },
  { id: "12", name: "Social Butterfly", description: "Join the Top 10 leaderboard", icon: "users", progress: 1, total: 1, unlocked: true, rarity: "rare", unlockedAt: "2024-10-05" },
]

// Practice Tasks
export const practiceTasksData: PracticeTask[] = [
  {
    id: "1",
    skill: "Dynamic Programming",
    skillId: "9",
    reason: "Critical decay detected - 21 days since last practice",
    priority: "urgent",
    estimatedTime: 25,
    xpReward: 150,
    retention: 38,
    scheduledDate: "2024-10-15",
    nextReviewDate: "2024-10-18"
  },
  {
    id: "2",
    skill: "Graphs",
    skillId: "4",
    reason: "Below threshold - affects 4 dependent skills",
    priority: "urgent",
    estimatedTime: 20,
    xpReward: 120,
    retention: 45,
    scheduledDate: "2024-10-15",
    nextReviewDate: "2024-10-17"
  },
  {
    id: "3",
    skill: "Indexing",
    skillId: "18",
    reason: "Critical decay - foundation for query optimization",
    priority: "urgent",
    estimatedTime: 15,
    xpReward: 100,
    retention: 48,
    scheduledDate: "2024-10-15",
    nextReviewDate: "2024-10-17"
  },
  {
    id: "4",
    skill: "SQL Queries",
    skillId: "16",
    reason: "Approaching decay threshold",
    priority: "recommended",
    estimatedTime: 15,
    xpReward: 80,
    retention: 55,
    scheduledDate: "2024-10-16",
    nextReviewDate: "2024-10-20"
  },
  {
    id: "5",
    skill: "Design Patterns",
    skillId: "15",
    reason: "Important for system design interviews",
    priority: "recommended",
    estimatedTime: 20,
    xpReward: 90,
    retention: 55,
    scheduledDate: "2024-10-16",
    nextReviewDate: "2024-10-21"
  },
  {
    id: "6",
    skill: "OOP Concepts",
    skillId: "14",
    reason: "Scheduled review based on spaced repetition",
    priority: "recommended",
    estimatedTime: 10,
    xpReward: 60,
    retention: 68,
    scheduledDate: "2024-10-17",
    nextReviewDate: "2024-10-22"
  },
  {
    id: "7",
    skill: "Backtracking",
    skillId: "12",
    reason: "Below optimal retention level",
    priority: "recommended",
    estimatedTime: 18,
    xpReward: 85,
    retention: 52,
    scheduledDate: "2024-10-17",
    nextReviewDate: "2024-10-20"
  },
  {
    id: "8",
    skill: "Sorting Algorithms",
    skillId: "8",
    reason: "Maintain current level",
    priority: "optional",
    estimatedTime: 12,
    xpReward: 50,
    retention: 72,
    scheduledDate: "2024-10-18",
    nextReviewDate: "2024-10-25"
  },
  {
    id: "9",
    skill: "Heaps",
    skillId: "6",
    reason: "Practice to reinforce understanding",
    priority: "optional",
    estimatedTime: 15,
    xpReward: 65,
    retention: 62,
    scheduledDate: "2024-10-18",
    nextReviewDate: "2024-10-23"
  },
]

// Course Recommendations
export const courseRecommendations: CourseRecommendation[] = [
  {
    id: "1",
    title: "Dynamic Programming Masterclass",
    platform: "nptel",
    instructor: "Prof. Madhavan Mukund",
    skills: ["Dynamic Programming", "Recursion", "Memoization"],
    duration: "8 weeks",
    rating: 4.8,
    enrolled: 125000,
    url: "https://nptel.ac.in/courses/106106131",
    thumbnail: "/courses/dp-nptel.jpg",
    difficulty: "intermediate",
    description: "Addresses your critical DP skill decay with structured learning from IIT Madras",
    isFree: true
  },
  {
    id: "2",
    title: "Graph Theory and Algorithms",
    platform: "coursera",
    instructor: "Tim Roughgarden",
    skills: ["Graphs", "BFS", "DFS", "Shortest Paths"],
    duration: "6 weeks",
    rating: 4.9,
    enrolled: 280000,
    url: "https://www.coursera.org/learn/algorithms-graphs-data-structures",
    thumbnail: "/courses/graphs-coursera.jpg",
    difficulty: "intermediate",
    description: "Stanford course covering graph fundamentals to advanced algorithms",
    isFree: false,
    price: "$49/month"
  },
  {
    id: "3",
    title: "SQL for Data Science",
    platform: "coursera",
    instructor: "Sadie St. Lawrence",
    skills: ["SQL Queries", "Normalization", "Indexing"],
    duration: "4 weeks",
    rating: 4.7,
    enrolled: 450000,
    url: "https://www.coursera.org/learn/sql-for-data-science",
    thumbnail: "/courses/sql-coursera.jpg",
    difficulty: "beginner",
    description: "Strengthen your database fundamentals with UC Davis",
    isFree: false,
    price: "$49/month"
  },
  {
    id: "4",
    title: "Dynamic Programming Playlist",
    platform: "youtube",
    instructor: "Abdul Bari",
    skills: ["Dynamic Programming", "Recursion"],
    duration: "4 hours",
    rating: 4.9,
    enrolled: 2500000,
    url: "https://www.youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O",
    thumbnail: "/courses/dp-youtube.jpg",
    difficulty: "intermediate",
    description: "Highly visual explanations with intuitive animations",
    isFree: true
  },
  {
    id: "5",
    title: "Graph Algorithms for Technical Interviews",
    platform: "youtube",
    instructor: "William Fiset",
    skills: ["Graphs", "Trees", "Network Flow"],
    duration: "7 hours",
    rating: 4.9,
    enrolled: 1800000,
    url: "https://www.youtube.com/playlist?list=PLDV1Zeh2NRsDGO4--qE8yH72HFL1Km93P",
    thumbnail: "/courses/graphs-youtube.jpg",
    difficulty: "advanced",
    description: "Deep dive into graph algorithms with clean code implementations",
    isFree: true
  },
  {
    id: "6",
    title: "Design Patterns in OOP",
    platform: "nptel",
    instructor: "Prof. Rajib Mall",
    skills: ["Design Patterns", "OOP Concepts"],
    duration: "12 weeks",
    rating: 4.6,
    enrolled: 85000,
    url: "https://nptel.ac.in/courses/106105163",
    thumbnail: "/courses/patterns-nptel.jpg",
    difficulty: "intermediate",
    description: "Learn all 23 GoF design patterns from IIT Kharagpur",
    isFree: true
  },
  {
    id: "7",
    title: "Introduction to Algorithms",
    platform: "mit_ocw",
    instructor: "Erik Demaine",
    skills: ["Sorting", "Dynamic Programming", "Graphs", "Data Structures"],
    duration: "Self-paced",
    rating: 5.0,
    enrolled: 3200000,
    url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
    thumbnail: "/courses/mit-algo.jpg",
    difficulty: "advanced",
    description: "MIT's legendary algorithms course - comprehensive coverage",
    isFree: true
  },
  {
    id: "8",
    title: "The Complete SQL Bootcamp",
    platform: "udemy",
    instructor: "Jose Portilla",
    skills: ["SQL Queries", "Database Design", "Indexing"],
    duration: "9 hours",
    rating: 4.7,
    enrolled: 720000,
    url: "https://www.udemy.com/course/the-complete-sql-bootcamp/",
    thumbnail: "/courses/sql-udemy.jpg",
    difficulty: "beginner",
    description: "Hands-on SQL practice with real-world exercises",
    isFree: false,
    price: "$19.99"
  },
  {
    id: "9",
    title: "Data Structures Made Easy",
    platform: "youtube",
    instructor: "Neetcode",
    skills: ["Arrays", "Linked Lists", "Trees", "Hash Tables"],
    duration: "10 hours",
    rating: 4.9,
    enrolled: 950000,
    url: "https://www.youtube.com/c/NeetCode",
    thumbnail: "/courses/neetcode.jpg",
    difficulty: "beginner",
    description: "LeetCode-focused explanations for interview prep",
    isFree: true
  },
  {
    id: "10",
    title: "Data Structures and Algorithms",
    platform: "nptel",
    instructor: "Prof. Naveen Garg",
    skills: ["Trees", "Graphs", "Sorting", "Heaps"],
    duration: "8 weeks",
    rating: 4.8,
    enrolled: 200000,
    url: "https://nptel.ac.in/courses/106102064",
    thumbnail: "/courses/dsa-nptel.jpg",
    difficulty: "intermediate",
    description: "IIT Delhi's comprehensive DSA course",
    isFree: true
  },
]

// Notifications
export const notificationsData: Notification[] = [
  { id: "1", type: "critical", skill: "Dynamic Programming", ars: 72, message: "ARS crossed 70% threshold - immediate review required", timestamp: "2 hours ago", read: false },
  { id: "2", type: "critical", skill: "Graphs", ars: 65, message: "Cascade risk detected - affects 4 dependent skills", timestamp: "5 hours ago", read: false },
  { id: "3", type: "warning", skill: "Indexing", ars: 62, message: "ARS approaching critical threshold", timestamp: "1 day ago", read: true },
  { id: "4", type: "warning", skill: "SQL Queries", ars: 55, message: "Scheduled review tomorrow", timestamp: "1 day ago", read: true },
  { id: "5", type: "info", skill: "Binary Search", ars: 5, message: "Great job! Skill maintained at optimal level", timestamp: "2 days ago", read: true },
  { id: "6", type: "success", skill: "Hash Tables", ars: 12, message: "Skill improved by 8% after yesterday's session", timestamp: "1 day ago", read: true },
]

// Weekly Activity
export const weeklyActivityData: WeeklyActivity[] = [
  { day: "Mon", sessions: 3, xp: 180, retention: 82, skillsReviewed: 4 },
  { day: "Tue", sessions: 2, xp: 120, retention: 78, skillsReviewed: 3 },
  { day: "Wed", sessions: 4, xp: 240, retention: 85, skillsReviewed: 5 },
  { day: "Thu", sessions: 1, xp: 60, retention: 75, skillsReviewed: 2 },
  { day: "Fri", sessions: 5, xp: 300, retention: 88, skillsReviewed: 6 },
  { day: "Sat", sessions: 2, xp: 120, retention: 80, skillsReviewed: 3 },
  { day: "Sun", sessions: 3, xp: 180, retention: 83, skillsReviewed: 4 },
]

// Atrophy Timeline (12 months)
export const atrophyTimelineData: AtrophyTimelinePoint[] = [
  { month: "Jan", skills: { "Dynamic Programming": 82, "Graphs": 78, "SQL Queries": 75, "Trees": 88, "Sorting": 80 } },
  { month: "Feb", skills: { "Dynamic Programming": 78, "Graphs": 75, "SQL Queries": 72, "Trees": 85, "Sorting": 78 }, events: [{ type: "exam", label: "Midterms" }] },
  { month: "Mar", skills: { "Dynamic Programming": 72, "Graphs": 70, "SQL Queries": 68, "Trees": 82, "Sorting": 75 } },
  { month: "Apr", skills: { "Dynamic Programming": 68, "Graphs": 65, "SQL Queries": 65, "Trees: 80, Sorting": 72 }, events: [{ type: "project", label: "Capstone Start" }] },
  { month: "May", skills: { "Dynamic Programming": 62, "Graphs": 60, "SQL Queries": 70, "Trees": 78, "Sorting": 70 } },
  { month: "Jun", skills: { "Dynamic Programming": 55, "Graphs": 55, "SQL Queries": 72, "Trees": 82, "Sorting": 68 }, events: [{ type: "break", label: "Summer Break" }] },
  { month: "Jul", skills: { "Dynamic Programming": 48, "Graphs": 50, "SQL Queries": 68, "Trees": 78, "Sorting": 65 } },
  { month: "Aug", skills: { "Dynamic Programming": 42, "Graphs": 48, "SQL Queries": 62, "Trees": 75, "Sorting": 68 } },
  { month: "Sep", skills: { "Dynamic Programming": 45, "Graphs": 52, "SQL Queries": 58, "Trees": 80, "Sorting": 72 }, events: [{ type: "exam", label: "Placement Season" }] },
  { month: "Oct", skills: { "Dynamic Programming": 38, "Graphs": 45, "SQL Queries": 55, "Trees": 85, "Sorting": 72 } },
]

// Forgetting Curve Data
export const forgettingCurveData = [
  { day: "Day 0", retention: 100, predicted: 100, optimal: 100 },
  { day: "Day 1", retention: 85, predicted: 82, optimal: 90 },
  { day: "Day 3", retention: 72, predicted: 68, optimal: 85 },
  { day: "Day 7", retention: 58, predicted: 52, optimal: 80 },
  { day: "Day 14", retention: 45, predicted: 38, optimal: 78 },
  { day: "Day 21", retention: 38, predicted: 28, optimal: 75 },
  { day: "Day 30", retention: 32, predicted: 20, optimal: 72 },
]

// Heatmap History (for time slider)
export const heatmapHistory = [
  { week: "Week 1", data: skillsData.map(s => ({ ...s, retention: Math.min(100, s.retention + 15) })) },
  { week: "Week 2", data: skillsData.map(s => ({ ...s, retention: Math.min(100, s.retention + 10) })) },
  { week: "Week 3", data: skillsData.map(s => ({ ...s, retention: Math.min(100, s.retention + 5) })) },
  { week: "Week 4", data: skillsData },
]

// Helper functions
export const getRiskLevel = (ars: number): "safe" | "at-risk" | "critical" => {
  if (ars >= 70) return "critical"
  if (ars >= 40) return "at-risk"
  return "safe"
}

export const getRetentionLevel = (retention: number): "high" | "medium" | "low" | "critical" => {
  if (retention >= 85) return "high"
  if (retention >= 70) return "medium"
  if (retention >= 50) return "low"
  return "critical"
}

export const categories = ["Data Structures", "Algorithms", "Fundamentals", "Databases"]
