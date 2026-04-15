import { cn } from "@/lib/utils"

type ChipOption = {
  label: string
  value: string
}

type FilterChipGroupProps = {
  options: ChipOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function FilterChipGroup({ options, value, onChange, className }: FilterChipGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              active
                ? "border-primary/40 bg-primary/15 text-primary shadow-lg shadow-primary/15"
                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
