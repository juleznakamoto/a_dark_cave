"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  segments?: number;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, segments = 1, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-neutral-900",
      className
    )}
    {...props}
  >
    {/* Render segment dividers */}
    {segments > 1 && (
      <div className="absolute inset-0 flex">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-neutral-600 last:border-r-0 bg-neutral"
          />
        ))}
      </div>
    )}
    
    {/* Progress indicator */}
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-red-950 transition-all relative z-10"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
