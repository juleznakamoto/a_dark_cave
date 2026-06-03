"use client";

import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";
import { cn } from "@/lib/utils";

/** Shared 1em slot so precious-resource glyphs align in the side panel. */
export const RESOURCE_GLYPH_CLASS =
  "font-noto-symbols-2 inline-flex w-[1em] shrink-0 items-center justify-center translate-y-[0.12em] cursor-default leading-none";

interface ResourceCoinIconProps {
  resource: "gold" | "silver";
  className?: string;
}

export function ResourceCoinIcon({ resource, className = "" }: ResourceCoinIconProps) {
  return (
    <CoinHoverParticleSurface
      resource={resource}
      className={cn(RESOURCE_GLYPH_CLASS, className)}
      zIndex={50}
    >
      ◉
    </CoinHoverParticleSurface>
  );
}
