
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
      "relative h-4 w-full overflow-hidden rounded-full bg-grey",
      className
    )}
    {...props}
  >
    {/* Render segment dividers */}
    {segments > 1 && (
      <div className="absolute inset-0 flex">
        {Array.from({ length: segments - 1 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-neutral-600"
            style={{ width: `${100 / segments}%` }}
          />
        ))}
      </div>
    )}
    
    {/* Progress indicator */}
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
