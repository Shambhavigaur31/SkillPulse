"use client"

import { Filter, Calendar, SortAsc } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface FiltersProps {
  filters: {
    timeRange: string
    category: string
    sortBy: string
  }
  onFilterChange: (filters: { timeRange: string; category: string; sortBy: string }) => void
}

const timeRanges = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 3 Months" },
  { value: "all", label: "All Time" },
]

const categories = [
  { value: "all", label: "All Categories" },
  { value: "data-structures", label: "Data Structures" },
  { value: "algorithms", label: "Algorithms" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "databases", label: "Databases" },
  { value: "system-design", label: "System Design" },
]

const sortOptions = [
  { value: "retention", label: "Retention %" },
  { value: "decay-rate", label: "Decay Rate" },
  { value: "last-practiced", label: "Last Practiced" },
  { value: "xp-earned", label: "XP Earned" },
]

export function DashboardFilters({ filters, onFilterChange }: FiltersProps) {
  const activeFiltersCount = [
    filters.timeRange !== "7d",
    filters.category !== "all",
    filters.sortBy !== "retention",
  ].filter(Boolean).length

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Time Range Select */}
      <Select
        value={filters.timeRange}
        onValueChange={(value) => onFilterChange({ ...filters, timeRange: value })}
      >
        <SelectTrigger className="w-40 bg-card border-border">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeRanges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category Filter */}
      <Select
        value={filters.category}
        onValueChange={(value) => onFilterChange({ ...filters, category: value })}
      >
        <SelectTrigger className="w-42.5 bg-card border-border">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-card border-border">
            <SortAsc className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={filters.sortBy}
            onValueChange={(value) => onFilterChange({ ...filters, sortBy: value })}
          >
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Badge */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({ timeRange: "7d", category: "all", sortBy: "retention" })}
          className="text-muted-foreground hover:text-foreground"
        >
          <Badge variant="secondary" className="mr-2">
            {activeFiltersCount}
          </Badge>
          Clear filters
        </Button>
      )}
    </div>
  )
}
