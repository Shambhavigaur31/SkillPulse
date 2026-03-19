"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, ComposedChart, ResponsiveContainer } from "recharts"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { weeklyActivityData } from "@/lib/data"
import { TrendingUp, Zap, Clock } from "lucide-react"

const chartConfig = {
  sessions: {
    label: "Sessions",
    color: "var(--chart-1)",
  },
  xp: {
    label: "XP Earned",
    color: "var(--chart-2)",
  },
  retention: {
    label: "Retention %",
    color: "var(--chart-3)",
  },
}

export function ActivityChart() {
  const [activeTab, setActiveTab] = useState("sessions")
  
  const totalSessions = weeklyActivityData.reduce((sum, d) => sum + d.sessions, 0)
  const totalXP = weeklyActivityData.reduce((sum, d) => sum + d.xp, 0)
  const avgRetention = Math.round(weeklyActivityData.reduce((sum, d) => sum + d.retention, 0) / weeklyActivityData.length)
  const totalSkillsReviewed = weeklyActivityData.reduce((sum, d) => sum + d.skillsReviewed, 0)

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Weekly Activity</CardTitle>
            <CardDescription>Your practice sessions and progress</CardDescription>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-fit">
            <TabsList className="h-8">
              <TabsTrigger value="sessions" className="text-xs px-3">Sessions</TabsTrigger>
              <TabsTrigger value="xp" className="text-xs px-3">XP</TabsTrigger>
              <TabsTrigger value="combined" className="text-xs px-3">Combined</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          {activeTab === "sessions" && (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={weeklyActivityData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="sessions" 
                  fill="var(--chart-1)" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ChartContainer>
          )}
          
          {activeTab === "xp" && (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={weeklyActivityData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="xp" 
                  fill="var(--chart-2)" 
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ChartContainer>
          )}
          
          {activeTab === "combined" && (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ComposedChart data={weeklyActivityData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[50, 100]}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  yAxisId="left"
                  dataKey="sessions" 
                  fill="var(--chart-1)" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={35}
                  opacity={0.8}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="retention"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={{ fill: "var(--chart-3)", strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ChartContainer>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
              <Zap className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalXP.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10">
              <TrendingUp className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{avgRetention}%</p>
              <p className="text-xs text-muted-foreground">Avg Retention</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <span className="text-lg">📚</span>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{totalSkillsReviewed}</p>
              <p className="text-xs text-muted-foreground">Skills Reviewed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
