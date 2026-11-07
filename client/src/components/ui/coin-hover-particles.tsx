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
  getBubbleRemoveDelayMs,
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
    /**
     * Milliseconds between bursts while hovered (default 350).
     * A function is called when the next burst is scheduled, not on every render.
     */
    emitIntervalMs?: number | (() => number);
    /**
     * Burst origin: center of this element (viewport coords). When omitted, the hook
     * uses an internal ref—`CoinHoverParticleSurface` attaches it to the hover target.
     * When set, bind hover handlers elsewhere (e.g. the full card) while keeping this
     * ref on the glyph only.
     */
    particleOriginRef?: React.RefObject<HTMLSpanElement | null>;
    /**
     * Overrides gold/silver presets (e.g. shop glyph color).
     * A function is called when a burst fires, not on every render.
     */
    particleConfig?: Partial<ParticleConfig> | (() => Partial<ParticleConfig>);
    /**
     * When false, the burst stays in the parent stacking context instead of
     * `document.body`. Use this when sparks should sit just above a local icon.
     */
    portaled?: boolean;
  },
) {
  const zIndex = options?.zIndex ?? 50;
  const enabled = options?.enabled !== false;

  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);
  const bubbleIdCounter = useRef(0);
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverActiveRef = useRef(false);
  const forcedEmitRef = useRef(false);
  const internalOriginRef = useRef<HTMLSpanElement | null>(null);
  const originRef = options?.particleOriginRef ?? internalOriginRef;
  // Hold the latest getter. Spawn calls it; the ring chart does not.
  const particleConfigRef = useRef(options?.particleConfig);
  particleConfigRef.current = options?.particleConfig;
  const emitIntervalMsRef = useRef(options?.emitIntervalMs);
  emitIntervalMsRef.current = options?.emitIntervalMs;

  const nextEmitDelayMs = useCallback(() => {
    const value = emitIntervalMsRef.current;
    if (typeof value === "function") return value();
    return value ?? COIN_HOVER_EMIT_INTERVAL_MS;
  }, []);

  const spawnParticles = useCallback(() => {
    if (!enabled) return;

    const el = originRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const configured = particleConfigRef.current;
    const config =
      (typeof configured === "function" ? configured() : configured) ??
      (resource === "gold"
        ? GOLD_COIN_PARTICLE_CONFIG
        : SILVER_COIN_PARTICLE_CONFIG);
    const id = `coin-bubble-${resource}-${bubbleIdCounter.current++}-${Date.now()}`;
    const particles = generateParticleData(config);

    setBubbles((prev) => [...prev, { id, x, y, particles }]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, getBubbleRemoveDelayMs(config));
  }, [enabled, resource, originRef]);

  const syncEmitInterval = useCallback(() => {
    const shouldEmit =
      enabled && (hoverActiveRef.current || forcedEmitRef.current);

    if (shouldEmit) {
      if (!emitTimerRef.current) {
        spawnParticles();
        const queueNext = () => {
          emitTimerRef.current = setTimeout(() => {
            spawnParticles();
            queueNext();
          }, nextEmitDelayMs());
        };
        queueNext();
      }
      return;
    }

    if (emitTimerRef.current) {
      clearTimeout(emitTimerRef.current);
      emitTimerRef.current = null;
    }
  }, [enabled, spawnParticles, nextEmitDelayMs]);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;
    hoverActiveRef.current = true;
    syncEmitInterval();
  }, [enabled, syncEmitInterval]);

  const onMouseLeave = useCallback(() => {
    hoverActiveRef.current = false;
    syncEmitInterval();
  }, [syncEmitInterval]);

  /** Programmatic burst (e.g. trader tab hint) without faking pointer hover. */
  const setForcedEmit = useCallback(
    (active: boolean) => {
      forcedEmitRef.current = active;
      syncEmitInterval();
    },
    [syncEmitInterval],
  );

  useEffect(() => {
    return () => {
      hoverActiveRef.current = false;
      forcedEmitRef.current = false;
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current);
        emitTimerRef.current = null;
      }
    };
  }, []);

  const portal = (
    <BubblyButtonGlobalPortal
      bubbles={bubbles}
      zIndex={zIndex}
      portaled={options?.portaled}
    />
  );

  return {
    /** Put this on the node whose geometric center should emit particles. */
    glyphOriginRef: originRef,
    hoverHandlers: { onMouseEnter, onMouseLeave },
    setForcedEmit,
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
