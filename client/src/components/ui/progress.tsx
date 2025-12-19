"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  segments?: number;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, segments = 1, ...props }, ref) => {
  const [prevValue, setPrevValue] = React.useState(value || 0);
  const [showCelebration, setShowCelebration] = React.useState(false);

  React.useEffect(() => {
    if (value !== undefined && value > prevValue) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1000);
    }
    setPrevValue(value || 0);
  }, [value, prevValue]);

  return (
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
        className={cn(
          "h-full w-full flex-1 bg-red-950 transition-all relative z-10 overflow-hidden",
          showCelebration && "animate-pulse"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {/* Celebration particles - constrained within progress indicator */}
        <AnimatePresence>
          {showCelebration && (
            <>
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
              />
            </>
          )}
        </AnimatePresence>
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
