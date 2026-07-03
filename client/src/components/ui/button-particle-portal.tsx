"use client";

import * as React from "react";
import { useCallback, useContext, useRef, useState } from "react";
import { BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";
import {
  generateParticleData,
  getBubbleRemoveDelayMs,
  type BubbleWithParticles,
  type ParticleConfig,
} from "@/components/ui/bubbly-button.particles";
import { Z_INDEX } from "@/lib/z-index";

type ButtonParticlePortalContextValue = {
  bubbles: BubbleWithParticles[];
  spawnParticles: (
    x: number,
    y: number,
    config: Partial<ParticleConfig>,
  ) => void;
};

const ButtonParticlePortalContext =
  React.createContext<ButtonParticlePortalContextValue | null>(null);

export function ButtonParticlePortalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);
  const bubbleIdCounter = useRef(0);

  const spawnParticles = useCallback(
    (x: number, y: number, config: Partial<ParticleConfig>) => {
      const id = `action-bubble-${bubbleIdCounter.current++}-${Date.now()}`;
      const particles = generateParticleData(config);
      setBubbles((prev) => [...prev, { id, x, y, particles }]);
      setTimeout(() => {
        setBubbles((prev) => prev.filter((bubble) => bubble.id !== id));
      }, getBubbleRemoveDelayMs(config));
    },
    [],
  );

  return (
    <ButtonParticlePortalContext.Provider value={{ bubbles, spawnParticles }}>
      {children}
    </ButtonParticlePortalContext.Provider>
  );
}

/** Mount at the top of panel scroll content — above titles, below action buttons. */
export function ButtonParticlePortalLayer() {
  const portal = useContext(ButtonParticlePortalContext);
  if (!portal || portal.bubbles.length === 0) return null;

  return (
    <BubblyButtonGlobalPortal
      bubbles={portal.bubbles}
      zIndex={Z_INDEX.actionButtonParticles}
      portaled={false}
    />
  );
}

export function useButtonParticlePortal() {
  return useContext(ButtonParticlePortalContext);
}
