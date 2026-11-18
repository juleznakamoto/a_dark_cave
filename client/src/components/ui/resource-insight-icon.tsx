"use client";

import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";
import { RESOURCE_GLYPH_CLASS } from "@/components/ui/resource-coin-icon";
import { INSIGHT_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { cn } from "@/lib/utils";

interface ResourceInsightIconProps {
  className?: string;
  /** Bump when insight increases so the hover burst plays for 0.5s. */
  burstNonce?: number;
}

export function ResourceInsightIcon({
  className = "",
  burstNonce = 0,
}: ResourceInsightIconProps) {
  return (
    <CoinHoverParticleSurface
      resource="silver"
      particleConfig={INSIGHT_PARTICLE_CONFIG}
      emitIntervalMs={600}
      burstNonce={burstNonce}
      className={cn(RESOURCE_GLYPH_CLASS, className)}
      zIndex={50}
    >
      🟖
    </CoinHoverParticleSurface>
  );
}
