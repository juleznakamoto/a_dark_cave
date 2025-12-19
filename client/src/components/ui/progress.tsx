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
          "h-full w-full flex-1 bg-red-950 transition-all relative z-10",
          showCelebration && "animate-pulse"
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />

      {/* Celebration particles */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (Math.PI / 6) + (i / 12) * Math.PI * 1.2; // Spread particles in an arc
              const distance = 40 + Math.random() * 30;
              const endX = Math.cos(angle) * distance;
              const endY = -Math.sin(angle) * distance; // Negative for upward direction
              
              return (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-yellow-400 z-20"
                  style={{
                    left: `${value}%`,
                    top: "50%",
                  }}
                  initial={{
                    opacity: 1,
                    scale: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={{
                    opacity: 0,
                    scale: [0, 1.5, 0],
                    x: endX,
                    y: endY,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.05,
                    ease: "easeOut",
                  }}
                />
              );
            })}
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent z-10 pointer-events-none"
              style={{
                left: 0,
                width: `${value}%`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          </>
        )}
      </AnimatePresence>
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
