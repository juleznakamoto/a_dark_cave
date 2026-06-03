"use client";

import { useId } from "react";
import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";
import { INSIGHT_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { cn } from "@/lib/utils";

interface ResourceInsightIconProps {
  className?: string;
}

/** Blue orb with upward triangle — matches 🟖 shape, sized to align with ◉ coin glyphs. */
function InsightOrbGlyph() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bodyGradientId = `insight-orb-body-${id}`;

  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="mx-auto size-[1em] drop-shadow-[0_0_3px_rgba(96,165,250,0.55)]"
    >
      <defs>
        <radialGradient id={bodyGradientId} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="38%" stopColor="#60a5fa" />
          <stop offset="72%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>
      <circle cx="8" cy="8" r="7" fill={`url(#${bodyGradientId})`} />
      <polygon
        points="8,4.8 11.2,10.8 4.8,10.8"
        fill="#dbeafe"
        fillOpacity="0.92"
      />
    </svg>
  );
}

export function ResourceInsightIcon({ className = "" }: ResourceInsightIconProps) {
  return (
    <CoinHoverParticleSurface
      resource="silver"
      particleConfig={INSIGHT_PARTICLE_CONFIG}
      emitIntervalMs={600}
      className={cn(
        // Match ResourceCoinIcon metrics: same font box, fixed 1em width for column alignment.
        "font-noto-symbols-2 inline-block w-[1em] shrink-0 translate-y-[0.12em] cursor-default leading-none",
        className,
      )}
      zIndex={50}
    >
      <InsightOrbGlyph />
    </CoinHoverParticleSurface>
  );
}
