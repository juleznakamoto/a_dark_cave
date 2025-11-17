
import { useState, useRef, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { audioManager } from "@/lib/audio";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

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
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  fireParticles: FireParticle[];
}) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  return (
    <>
      {fireParticles.map((particle) => {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const adjustedAngle = particle.angle + Math.PI / 2;
        const endX = particle.startX + Math.sin(adjustedAngle) * particle.distance;
        const endY = particle.startY - Math.cos(adjustedAngle) * particle.distance;

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
              x: [0, (endX - particle.startX) * 0.25, (endX - particle.startX) * 0.5, (endX - particle.startX) * 0.75, endX - particle.startX],
              y: [0, (endY - particle.startY) * 0.25, (endY - particle.startY) * 0.5, (endY - particle.startY) * 0.75, endY - particle.startY],
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
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  particles: Particle[];
}) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  return (
    <>
      {particles.map((particle) => {
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

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
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
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

interface ExplosionButtonProps extends ButtonProps {
  soundVolume?: number;
}

const ExplosionButton = forwardRef<HTMLButtonElement, ExplosionButtonProps>(
  ({ children, onClick, soundVolume = 0.5, className, ...props }, ref) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [fireParticles, setFireParticles] = useState<FireParticle[]>([]);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const idRef = useRef(0);
    const fireIdRef = useRef(0);

    const colors = [
      "#8B0000", // dark red
      "#B22222", // firebrick
      "#DC143C", // crimson
      "#FF4500", // orange red
      "#FF6347", // tomato
      "#D2691E", // chocolate
      "#8B4513", // saddle brown
      "#A0522D", // sienna
      "#CD853F", // peru
      "#DAA520", // goldenrod
    ];

    const triggerExplosion = () => {
      if (!buttonRef.current) return;

      // Play explosion sound
      audioManager.playSound('explosion', soundVolume);

      const rect = buttonRef.current.getBoundingClientRect();
      const centerX = 0;
      const centerY = 0;

      // Generate fire particles (100 particles)
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
        
        const angle = Math.atan2(y - centerY, x - centerX);
        const distance = (Math.random() * 4 + 1) * 10;
        const duration = Math.random() * 500 + 500;

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

      const particleCount = 250;
      const newParticles: Particle[] = Array.from({
        length: particleCount,
      }).map(() => ({
        id: idRef.current++,
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * 600 + 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 1 + Math.random() * 3.5,
        size: Math.random() * 6 + 1,
        createdAt: Date.now(),
      }));

      setFireParticles((prev) => [...prev, ...newFireParticles]);
      setParticles((prev) => [...prev, ...newParticles]);

      // Clean up old particles after 3 seconds
      setTimeout(() => {
        const now = Date.now();
        setFireParticles((prev) =>
          prev.filter((p) => now - p.createdAt < 3000)
        );
        setParticles((prev) =>
          prev.filter((p) => now - p.createdAt < 3000)
        );
      }, 3000);
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerExplosion();
      if (onClick) onClick(e);
    };

    return (
      <>
        <FireParticles buttonRef={buttonRef} fireParticles={fireParticles} />
        <ExplosionParticles buttonRef={buttonRef} particles={particles} />
        <Button
          ref={(node) => {
            buttonRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          onClick={handleClick}
          className={cn(className)}
          {...props}
        >
          {children}
        </Button>
      </>
    );
  }
);

ExplosionButton.displayName = 'ExplosionButton';

export { ExplosionButton };
