"use client";

import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";
import { INSIGHT_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";

interface ResourceInsightIconProps {
  className?: string;
}

export function ResourceInsightIcon({ className = "" }: ResourceInsightIconProps) {
  return (
    <CoinHoverParticleSurface
      resource="silver"
      particleConfig={INSIGHT_PARTICLE_CONFIG}
      emitIntervalMs={600}
      className={`font-noto-symbols-2 inline-block translate-y-[0.12em] cursor-default leading-none text-blue-500 ${className}`}
      zIndex={50}
    >
      ◉
    </CoinHoverParticleSurface>
  );
}
