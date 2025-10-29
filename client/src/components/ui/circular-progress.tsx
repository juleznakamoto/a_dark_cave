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
  const [prevValue, setPrevValue] = React.useState(value)
  const [shouldAnimate, setShouldAnimate] = React.useState(true)

  React.useEffect(() => {
    // Detect if we're resetting from a high value to a low value
    const isResetting = prevValue > value && prevValue > 80 && value < 20

    if (isResetting) {
      setShouldAnimate(false)
      // Re-enable animation after a brief moment
      setTimeout(() => setShouldAnimate(true), 50)
    }

    setPrevValue(value)
  }, [value, prevValue])

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
          stroke="#333333"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted-foreground/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "text-[lightgrey]",
            shouldAnimate && "transition-all duration-300 ease-in-out",
            className
          )}
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
})

CircularProgress.displayName = "CircularProgress"
export { CircularProgress }