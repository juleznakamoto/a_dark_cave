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
  spawnParticles: (
    x: number,
    y: number,
    config: Partial<ParticleConfig>,
  ) => void;
};

const ButtonParticlePortalContext =
  React.createContext<ButtonParticlePortalContextValue | null>(null);

/**
 * Shared click-particle layer for action buttons in a panel.
 * Renders inline (not body-portaled) so buttons stay in normal document flow.
 * Buttons use GAME_ACTION_BUTTON_STACK_CLASS (z-20) to paint above this layer.
 */
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
    <ButtonParticlePortalContext.Provider value={{ spawnParticles }}>
      {children}
      <BubblyButtonGlobalPortal
        bubbles={bubbles}
        zIndex={Z_INDEX.actionButtonParticles}
        portaled={false}
      />
    </ButtonParticlePortalContext.Provider>
  );
}

export function useButtonParticlePortal() {
  return useContext(ButtonParticlePortalContext);
}
