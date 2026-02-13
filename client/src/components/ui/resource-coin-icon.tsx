"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  BubblyButtonGlobalPortal,
  generateParticleData,
  GOLD_COIN_PARTICLE_CONFIG,
  SILVER_COIN_PARTICLE_CONFIG,
  type BubbleWithParticles,
} from "@/components/ui/bubbly-button";

const EMIT_INTERVAL_MS = 450;
const BUBBLE_REMOVE_DELAY = 2500;

interface ResourceCoinIconProps {
  resource: "gold" | "silver";
  className?: string;
}

export function ResourceCoinIcon({ resource, className = "" }: ResourceCoinIconProps) {
  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);
  const bubbleIdCounter = useRef(0);
  const emitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  const spawnParticles = useCallback(() => {
    const el = iconRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const config =
      resource === "gold" ? GOLD_COIN_PARTICLE_CONFIG : SILVER_COIN_PARTICLE_CONFIG;
    const id = `coin-bubble-${resource}-${bubbleIdCounter.current++}-${Date.now()}`;
    const particles = generateParticleData(config);

    setBubbles((prev) => [...prev, { id, x, y, particles }]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, BUBBLE_REMOVE_DELAY);
  }, [resource]);

  const handleMouseEnter = useCallback(() => {
    spawnParticles();
    emitIntervalRef.current = setInterval(spawnParticles, EMIT_INTERVAL_MS);
  }, [spawnParticles]);

  const handleMouseLeave = useCallback(() => {
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

  return (
    <>
      <span
        ref={iconRef}
        className={`inline-block cursor-default ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        ◉
      </span>
      <BubblyButtonGlobalPortal bubbles={bubbles} zIndex={50} />
    </>
  );
}
