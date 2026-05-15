"use client";

import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";

interface ResourceCoinIconProps {
  resource: "gold" | "silver";
  className?: string;
}

export function ResourceCoinIcon({ resource, className = "" }: ResourceCoinIconProps) {
  return (
    <CoinHoverParticleSurface
      resource={resource}
      className={`font-noto-symbols-2 inline-block translate-y-[0.12em] cursor-default leading-none ${className}`}
      zIndex={50}
    >
      ◉
    </CoinHoverParticleSurface>
  );
}
