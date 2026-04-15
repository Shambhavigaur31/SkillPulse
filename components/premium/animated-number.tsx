"use client"

import { animate, useMotionValue } from "framer-motion"
import { useEffect, useState } from "react"

type AnimatedNumberProps = {
  value: number
  duration?: number
  className?: string
  suffix?: string
  decimals?: number
}

export function AnimatedNumber({
  value,
  duration = 0.9,
  className,
  suffix,
  decimals = 0,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0)
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const controls = animate(motionValue, value, {
      type: "spring",
      duration,
      bounce: 0.2,
      stiffness: 160,
      damping: 24,
      onUpdate: (latest) => {
        const next = decimals > 0 ? Number(latest.toFixed(decimals)) : Math.round(latest)
        setDisplayValue(next)
      },
    })

    return () => controls.stop()
  }, [decimals, duration, motionValue, value])

  return (
    <span className={className}>
      {displayValue}
      {suffix ?? ""}
    </span>
  )
}
