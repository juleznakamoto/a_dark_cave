
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
}

const CircularProgress = React.forwardRef<
  HTMLDivElement,
  CircularProgressProps
>(({ value, size = 20, strokeWidth = 2, className }, ref) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (value / 100) * circumference

  return (
    <div
      ref={ref}
      className={cn("relative inline-flex", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="red"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="green"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-300 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
})

CircularProgress.displayName = "CircularProgress"

export { CircularProgress }
