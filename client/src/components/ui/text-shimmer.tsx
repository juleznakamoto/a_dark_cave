"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TextShimmerProps = {
  children: string;
  className?: string;
  /** Seconds for one shimmer sweep. Default 1.5. */
  duration?: number;
  /**
   * onPrimary — filled buttons (light label on dark).
   * onSurface — outline/ghost buttons (foreground label).
   */
  tone?: "onPrimary" | "onSurface";
};

/**
 * Loading / in-progress label: a highlight sweeps across the text.
 */
export function TextShimmer({
  children,
  className,
  duration = 1.5,
  tone = "onPrimary",
}: TextShimmerProps) {
  return (
    <motion.span
      className={cn(
        "inline-block bg-clip-text text-transparent",
        tone === "onPrimary"
          ? "[--shimmer-dim:rgba(255,255,255,0.42)] [--shimmer-bright:#ffffff]"
          : "[--shimmer-dim:var(--muted-foreground)] [--shimmer-bright:var(--foreground)]",
        className,
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--shimmer-dim) 0%, var(--shimmer-bright) 50%, var(--shimmer-dim) 100%)",
        backgroundSize: "250% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}
