import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio";
import { Z_INDEX } from "@/lib/z-index";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  lifetime: number;
  size: number;
  createdAt: number;
}

interface FireParticle {
  id: number;
  angle: number;
  distance: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  createdAt: number;
}

function FireParticles({
  buttonRef,
  fireParticles,
  explosionCenterX,
  explosionCenterY,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  fireParticles: FireParticle[];
  explosionCenterX: number;
  explosionCenterY: number;
}) {
  return (
    <>
      {fireParticles.map((particle) => {
        const centerX = explosionCenterX;
        const centerY = explosionCenterY;

        const adjustedAngle = particle.angle + Math.PI / 2;
        const endX =
          particle.startX + Math.sin(adjustedAngle) * particle.distance;
        const endY =
          particle.startY - Math.cos(adjustedAngle) * particle.distance;

        return (
          <motion.div
            key={particle.id}
            className="fixed rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: centerX + particle.startX - particle.size / 2,
              top: centerY + particle.startY - particle.size / 2,
              zIndex: Z_INDEX.particles,
              pointerEvents: "none",
            }}
            initial={{
              backgroundColor: "hsl(40, 70%, 50%)",
              scale: 1,
            }}
            animate={{
              backgroundColor: [
                "hsl(0, 0%, 13%)", // almost pure black
                "hsl(270, 70%, 14%)", // dark violet glow
                "hsl(255, 75%, 11%)", // deeper violet-blue
                "hsl(230, 75%, 10%)", // dark blue
                "hsl(220, 65%, 8%)", // very dark blue
                "hsl(0, 0%, 5%)", // almost pure black
              ],

              scale: [1, 4, 7, 7, 0],
              x: [
                0,
                endX - particle.startX,
                endX - particle.startX,
                endX - particle.startX,
                endX - particle.startX,
              ],
              y: [
                0,
                endY - particle.startY,
                endY - particle.startY,
                endY - particle.startY,
                endY - particle.startY,
              ],
            }}
            transition={{
              duration: particle.duration / 1000,
              ease: [0.15, 0.5, 0.5, 0.85],
            }}
          />
        );
      })}
    </>
  );
}

function ExplosionParticles({
  buttonRef,
  particles,
  explosionCenterX,
  explosionCenterY,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  particles: Particle[];
  explosionCenterX: number;
  explosionCenterY: number;
}) {
  return (
    <>
      {particles.map((particle) => {
        const startX = explosionCenterX;
        const startY = explosionCenterY;

        const endX = startX + Math.cos(particle.angle) * particle.distance;
        const endY = startY + Math.sin(particle.angle) * particle.distance;

        return (
          <motion.div
            key={particle.id}
            className="fixed rounded-full shadow-md"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              left: startX,
              top: startY,
              zIndex: Z_INDEX.particlesForeground,
              pointerEvents: "none",
              boxShadow: `0 0 ${particle.size * 0.25}px ${"#FFFFFF"}`,
            }}
            initial={{
              opacity: 1,
              scale: 1,
            }}
            animate={{
              opacity: 0,
              scale: 0.1,
              x: endX - startX,
              y: endY - startY,
            }}
            transition={{
              duration: particle.lifetime,
              ease: "easeOut",
            }}
          />
        );
      })}
    </>
  );
}

export function useExplosionEffect() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [fireParticles, setFireParticles] = useState<FireParticle[]>([]);
  const [explosionCenter, setExplosionCenter] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const idRef = useRef(0);
  const fireIdRef = useRef(0);

  const colors = [
    "#4B0000", // very dark crimson
    "#660000", // deep blood red
    "#800000", // dark maroon
    "#A52A2A", // warm brown-red glow
    "#8B2500", // dark ember orange
    "#5A1E00", // charred orange-brown
    "#3D1A0B", // burnt umber core
    "#5C2E0C", // scorched brown
    "#704214", // dark bronze tone
    "#8B6508", // muted gold reflection
    "#FF0000", // bright red flash (highlight)
  ];

  const triggerExplosion = (providedX?: number, providedY?: number) => {
    if (
      !buttonRef.current &&
      (providedX === undefined || providedY === undefined)
    )
      return;

    // Play explosion sound
    audioManager.playSound("explosion", 0.5);

    let centerX: number, centerY: number;
    let rect: DOMRect;

    if (providedX !== undefined && providedY !== undefined) {
      // Use provided coordinates
      centerX = providedX;
      centerY = providedY;
      // Create a fake rect for particle calculations
      rect = new DOMRect(providedX - 50, providedY - 50, 100, 50);
    } else {
      // Calculate from button position
      rect = buttonRef.current!.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
    }

    // Store the explosion center for rendering
    setExplosionCenter({ x: centerX, y: centerY });

    // Generate fire particles
    const fireCount = 100;
    const newFireParticles: FireParticle[] = Array.from({
      length: fireCount,
    }).map(() => {
      const r = Math.random() * 0.15 + 0.05;
      const diameter = r * 2;
      const xBound = rect.width / 2 - r * 16;
      const yBound = rect.height / 2 - r * 16;

      const x = (Math.random() * 2.5 - 1.25) * xBound;
      const y = (Math.random() * 2.5 - 1.25) * yBound;

      const angle = Math.atan2(-1, 0);
      const distance = Math.random() * 40;
      const duration = Math.random() * 400 + 100;

      return {
        id: fireIdRef.current++,
        angle,
        distance,
        startX: x,
        startY: y,
        size: diameter * 16,
        duration,
        createdAt: Date.now(),
      };
    });

    // Generate explosion particles
    const particleCount = 350;
    const newParticles: Particle[] = Array.from({ length: particleCount }).map(
      () => ({
        id: idRef.current++,
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * 1200 + 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 1 + Math.random() * 4,
        size: Math.random() * 5,
        createdAt: Date.now(),
      }),
    );

    setFireParticles((prev) => [...prev, ...newFireParticles]);
    setParticles((prev) => [...prev, ...newParticles]);

    // Clean up old particles
    setTimeout(() => {
      const now = Date.now();
      setFireParticles((prev) => prev.filter((p) => now - p.createdAt < 5000));
      setParticles((prev) => prev.filter((p) => now - p.createdAt < 5000));
    }, 5000);
  };

  return {
    buttonRef,
    particles,
    fireParticles,
    triggerExplosion,
    ExplosionEffectRenderer: () => (
      <>
        <FireParticles
          buttonRef={buttonRef}
          fireParticles={fireParticles}
          explosionCenterX={explosionCenter.x}
          explosionCenterY={explosionCenter.y}
        />
        <ExplosionParticles
          buttonRef={buttonRef}
          particles={particles}
          explosionCenterX={explosionCenter.x}
          explosionCenterY={explosionCenter.y}
        />
      </>
    ),
  };
}
