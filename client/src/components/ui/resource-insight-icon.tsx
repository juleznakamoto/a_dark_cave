"use client";

import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";
import { INSIGHT_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { cn } from "@/lib/utils";

interface ResourceInsightIconProps {
  className?: string;
}

export function ResourceInsightIcon({ className = "" }: ResourceInsightIconProps) {
  return (
    <CoinHoverParticleSurface
      resource="silver"
      particleConfig={INSIGHT_PARTICLE_CONFIG}
      emitIntervalMs={600}
      className={cn(
        "inline-block translate-y-[0.12em] cursor-default text-[0.85em] leading-none",
        className,
      )}
      zIndex={50}
    >
      🟖
    </CoinHoverParticleSurface>
  );
}
