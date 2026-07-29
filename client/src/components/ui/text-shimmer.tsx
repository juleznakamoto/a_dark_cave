"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type TextShimmerProps = {
  children: string;
  className?: string;
  /** Seconds for one shimmer sweep. Default 1.1. */
  duration?: number;
  /**
   * onPrimary — filled buttons (light label on dark).
   * onSurface — outline/ghost buttons (foreground label).
   */
  tone?: "onPrimary" | "onSurface";
};

/**
 * Loading / in-progress label: a bright highlight sweeps across the text.
 * High contrast so it stays readable through `disabled:opacity-50`.
 */
export function TextShimmer({
  children,
  className,
  duration = 1.1,
  tone = "onPrimary",
}: TextShimmerProps) {
  return (
    <motion.span
      className={cn(
        "inline-block bg-clip-text text-transparent",
        tone === "onPrimary"
          ? "[--shimmer-dim:rgba(255,255,255,0.35)] [--shimmer-mid:rgba(255,255,255,0.7)] [--shimmer-bright:#ffffff]"
          : "[--shimmer-dim:color-mix(in_oklab,var(--foreground)_35%,transparent)] [--shimmer-mid:color-mix(in_oklab,var(--foreground)_70%,transparent)] [--shimmer-bright:var(--foreground)]",
        className,
      )}
      style={{
        // Narrow bright peak so the sweep is obvious; wide dim base for contrast.
        backgroundImage:
          "linear-gradient(90deg, var(--shimmer-dim) 0%, var(--shimmer-dim) 38%, var(--shimmer-mid) 46%, var(--shimmer-bright) 50%, var(--shimmer-mid) 54%, var(--shimmer-dim) 62%, var(--shimmer-dim) 100%)",
        backgroundSize: "220% 100%",
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
