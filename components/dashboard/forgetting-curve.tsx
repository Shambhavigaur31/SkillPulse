"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts"
import { Badge } from "@/components/ui/badge"

const forgettingData = [
  { day: "Day 0", retention: 100, predicted: 100, optimal: 100 },
  { day: "Day 1", retention: 85, predicted: 82, optimal: 90 },
  { day: "Day 3", retention: 72, predicted: 68, optimal: 85 },
  { day: "Day 7", retention: 58, predicted: 52, optimal: 80 },
  { day: "Day 14", retention: 45, predicted: 38, optimal: 78 },
  { day: "Day 21", retention: 38, predicted: 28, optimal: 75 },
  { day: "Day 30", retention: 32, predicted: 20, optimal: 72 },
]

const chartConfig = {
  retention: {
    label: "Your Retention",
    color: "var(--chart-1)",
  },
  predicted: {
    label: "Without Review",
    color: "var(--chart-4)",
  },
  optimal: {
    label: "With Spaced Repetition",
    color: "var(--chart-2)",
  },
}

export function ForgettingCurve() {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Ebbinghaus Forgetting Curve</CardTitle>
            <CardDescription>Memory retention over time based on your learning patterns</CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            LSTM Prediction Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart data={forgettingData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id="retentionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="optimalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              dataKey="day" 
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
            />
            <YAxis 
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={{ stroke: 'var(--border)' }}
              tickFormatter={(value) => `${value}%`}
            />
            <ReferenceLine y={50} stroke="var(--chart-4)" strokeDasharray="5 5" label={{ value: 'Review Threshold', fill: 'var(--muted-foreground)', fontSize: 11, position: 'insideTopRight' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              type="monotone" 
              dataKey="optimal" 
              stroke="var(--chart-2)" 
              strokeWidth={2}
              fill="url(#optimalGradient)"
              strokeDasharray="5 5"
            />
            <Area 
              type="monotone" 
              dataKey="predicted" 
              stroke="var(--chart-4)" 
              strokeWidth={2}
              fill="none"
              strokeDasharray="3 3"
            />
            <Area 
              type="monotone" 
              dataKey="retention" 
              stroke="var(--chart-1)" 
              strokeWidth={2.5}
              fill="url(#retentionGradient)"
            />
          </AreaChart>
        </ChartContainer>
        
        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-1" />
            <span className="text-muted-foreground">Your Retention</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">With Spaced Repetition</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-chart-4" />
            <span className="text-muted-foreground">Without Review</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
