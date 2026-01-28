"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  segments?: number;
  hideBorder?: boolean;
  disableGlow?: boolean;
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, segments = 1, hideBorder = false, disableGlow = false, ...props }, ref) => {
  const [animationKey, setAnimationKey] = React.useState(0);
  const prevValueRef = React.useRef(value || 0);

  React.useEffect(() => {
    if (!disableGlow && value !== undefined && value > prevValueRef.current) {
      setAnimationKey(prev => prev + 1);
    }
    prevValueRef.current = value || 0;
  }, [value, disableGlow]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-neutral-900 transition-all",
        !hideBorder && value === 100 && "border border-red-900",
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
        className="h-full w-full flex-1 bg-red-950 transition-all relative z-10 overflow-hidden"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {/* Glow effect - animates on every increase */}
        {animationKey > 0 && (
          <motion.div
            key={animationKey}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/100 to-transparent pointer-events-none"
            initial={{ x: "-100%", opacity: 1 }}
            animate={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
