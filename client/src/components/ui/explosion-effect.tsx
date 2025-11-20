import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { audioManager } from "@/lib/audio";

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
              zIndex: 9998,
              pointerEvents: "none",
            }}
            initial={{
              backgroundColor: "hsl(60, 100%, 100%)",
              scale: 1,
            }}
            animate={{
              backgroundColor: [
                "hsl(60, 100%, 100%)",
                "hsl(60, 100%, 80%)",
                "hsl(40, 100%, 60%)",
                "hsl(20, 100%, 40%)",
                "hsl(0, 0%, 20%)",
              ],
              scale: [1, 4, 7, 7, 0],
              x: [
                0,
                (endX - particle.startX) * 0.25,
                (endX - particle.startX) * 0.5,
                (endX - particle.startX) * 0.75,
                endX - particle.startX,
              ],
              y: [
                0,
                (endY - particle.startY) * 0.25,
                (endY - particle.startY) * 0.5,
                (endY - particle.startY) * 0.75,
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
              zIndex: 9999,
              pointerEvents: "none",
              boxShadow: `0 0 ${particle.size * 0.5}px ${"#FFFFFF"}`,
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
    "#8B0000",
    "#B22222",
    "#DC143C",
    "#FF4500",
    "#FF6347",
    "#D2691E",
    "#8B4513",
    "#A0522D",
    "#CD853F",
    "#DAA520",
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
      const r = Math.random() * 0.25 + 0.05;
      const diameter = r * 2;
      const xBound = rect.width / 2 - r * 16;
      const yBound = rect.height / 2 - r * 16;

      const x = (Math.random() * 2 - 1) * xBound;
      const y = (Math.random() * 2 - 1) * yBound;

      const angle = Math.atan2(-1, 0);
      const distance = (Math.random() * 4 + 1) * 10;
      const duration = Math.random() * 800 + 1000;

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
    const particleCount = 300;
    const newParticles: Particle[] = Array.from({ length: particleCount }).map(
      () => ({
        id: idRef.current++,
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * 1200 + 200,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 1.5 + Math.random() * 4,
        size: Math.random() * 6 + 1,
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
