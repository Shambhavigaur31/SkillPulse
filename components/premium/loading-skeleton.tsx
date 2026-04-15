export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton-shimmer h-14 rounded-xl border border-white/10 bg-linear-to-r from-white/5 via-white/12 to-white/5"
        />
      ))}
    </div>
  )
}
