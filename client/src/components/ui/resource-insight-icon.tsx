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
        "font-noto-symbols-2 inline-block w-[1em] translate-y-[0.12em] cursor-default text-center leading-none",
        "[filter:invert(48%)_sepia(79%)_saturate(2476%)_hue-rotate(190deg)_brightness(100%)_contrast(97%)]",
        className,
      )}
      zIndex={50}
    >
      🟖
    </CoinHoverParticleSurface>
  );
}
