"use client";

import React, {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";
import {
  generateParticleData,
  GOLD_COIN_PARTICLE_CONFIG,
  SILVER_COIN_PARTICLE_CONFIG,
  type BubbleWithParticles,
  type ParticleConfig,
} from "@/components/ui/bubbly-button.particles";

/** Match `ResourceCoinIcon` / side-panel coin hover cadence. */
export const COIN_HOVER_EMIT_INTERVAL_MS = 350;
export const COIN_HOVER_BUBBLE_REMOVE_DELAY_MS = 2500;

export type CoinHoverResource = "gold" | "silver";

export function useCoinHoverParticles(
  resource: CoinHoverResource,
  options?: {
    zIndex?: number;
    enabled?: boolean;
    /** Milliseconds between burst emissions while hovered (default 350). */
    emitIntervalMs?: number;
    /**
     * Burst origin: center of this element (viewport coords). When omitted, the hook
     * uses an internal ref—`CoinHoverParticleSurface` attaches it to the hover target.
     * When set, bind hover handlers elsewhere (e.g. the full card) while keeping this
     * ref on the glyph only.
     */
    particleOriginRef?: React.RefObject<HTMLSpanElement | null>;
    /** Overrides gold/silver presets (e.g. shop glyph color). */
    particleConfig?: Partial<ParticleConfig>;
  },
) {
  const zIndex = options?.zIndex ?? 50;
  const enabled = options?.enabled !== false;
  const emitIntervalMs =
    options?.emitIntervalMs ?? COIN_HOVER_EMIT_INTERVAL_MS;

  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);
  const bubbleIdCounter = useRef(0);
  const emitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const internalOriginRef = useRef<HTMLSpanElement | null>(null);
  const originRef = options?.particleOriginRef ?? internalOriginRef;
  const particleConfig = options?.particleConfig;

  const spawnParticles = useCallback(() => {
    if (!enabled) return;

    const el = originRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const config =
      particleConfig ??
      (resource === "gold"
        ? GOLD_COIN_PARTICLE_CONFIG
        : SILVER_COIN_PARTICLE_CONFIG);
    const id = `coin-bubble-${resource}-${bubbleIdCounter.current++}-${Date.now()}`;
    const particles = generateParticleData(config);

    setBubbles((prev) => [...prev, { id, x, y, particles }]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, COIN_HOVER_BUBBLE_REMOVE_DELAY_MS);
  }, [enabled, resource, originRef, particleConfig]);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;
    spawnParticles();
    emitIntervalRef.current = setInterval(spawnParticles, emitIntervalMs);
  }, [enabled, spawnParticles, emitIntervalMs]);

  const onMouseLeave = useCallback(() => {
    if (emitIntervalRef.current) {
      clearInterval(emitIntervalRef.current);
      emitIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (emitIntervalRef.current) {
        clearInterval(emitIntervalRef.current);
      }
    };
  }, []);

  const portal = (
    <BubblyButtonGlobalPortal bubbles={bubbles} zIndex={zIndex} />
  );

  return {
    /** Put this on the node whose geometric center should emit particles. */
    glyphOriginRef: originRef,
    hoverHandlers: { onMouseEnter, onMouseLeave },
    portal,
  } as const;
}

/** Wrap arbitrary shop/UI chrome with the same gold/silver hover burst as `ResourceCoinIcon`. */
export function CoinHoverParticleSurface({
  resource,
  className = "",
  style,
  children,
  zIndex,
  enabled,
  emitIntervalMs,
  particleConfig,
}: {
  resource: CoinHoverResource;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  zIndex?: number;
  enabled?: boolean;
  emitIntervalMs?: number;
  particleConfig?: Partial<ParticleConfig>;
}) {
  const { glyphOriginRef, hoverHandlers, portal } = useCoinHoverParticles(
    resource,
    {
      zIndex,
      enabled,
      emitIntervalMs,
      particleConfig,
    },
  );

  return (
    <>
      <span
        ref={glyphOriginRef as React.Ref<HTMLSpanElement>}
        className={className}
        style={style}
        {...hoverHandlers}
      >
        {children}
      </span>
      {portal}
    </>
  );
}
