"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ParticleButtonProps extends ButtonProps {
  spawnInterval?: number; // how often sparks spawn
}

interface Spark {
  id: number;
  angle: number;
  distance: number;
  color: string;
  lifetime: number;
  offsetX: number;
}

function SuccessParticles({
  buttonRef,
  sparks,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  sparks: Spark[];
}) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  return (
    <>
      {sparks.map((spark) => {
        const startX = rect.left + spark.offsetX;
        const startY = rect.top + 15;

        const endX = startX + Math.cos(spark.angle) * spark.distance;
        const endY =
          startY - Math.abs(Math.sin(spark.angle) * spark.distance); // always upwards

        return (
          <motion.div
            key={spark.id}
            className="fixed rounded-full shadow-md"
            style={{
              width: "4px",
              height: "4px",
              backgroundColor: spark.color,
              left: startX,
              top: startY,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 0.3,
              x: endX - startX,
              y: endY - startY,
            }}
            transition={{
              duration: spark.lifetime,
              ease: "easeOut",
            }}
          />
        );
      })}
    </>
  );
}

function ParticleButton({
  children,
  onClick,
  spawnInterval = 200,
  className,
  ...props
}: ParticleButtonProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const rampUpRef = useRef<NodeJS.Timeout | null>(null);
  const idRef = useRef(0);
  const spawnCountRef = useRef(2); // initial number of sparks per spawn
  const rampStartRef = useRef<number | null>(null);

  const colors = ["#ffb347", "#ff9234", "#ffcd94", "#ff6f3c", "#ff4500"]; // ember-like

  const spawnSparks = () => {
    if (!buttonRef.current) return;
    const buttonWidth = buttonRef.current.offsetWidth;

    const count = spawnCountRef.current; // dynamic number of sparks
    const newSparks: Spark[] = Array.from({ length: count }).map(() => ({
      id: idRef.current++,
      angle: (Math.random() * 60 - 120) * (Math.PI / 180),
      distance: Math.random() * 150 + 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      lifetime: 0.6 + Math.random() * 1.2,
      offsetX: buttonWidth * 0.5 + (Math.random() * 40 - 20),
    }));

    setSparks((prev) => [...prev, ...newSparks]);
  };

  useEffect(() => {
    if (sparks.length > 500) {
      setSparks((prev) => prev.slice(-300)); // prevent memory bloat
    }
  }, [sparks]);

  const handleMouseEnter = () => {
    if (!intervalRef.current) {
      spawnCountRef.current = 2;
      rampStartRef.current = Date.now();

      spawnSparks(); // spawn immediately
      intervalRef.current = setInterval(spawnSparks, spawnInterval);

      // gradually increase sparks over 5 seconds
      rampUpRef.current = setInterval(() => {
        if (rampStartRef.current) {
          const elapsed = Date.now() - rampStartRef.current;
          if (elapsed < 5000) {
            spawnCountRef.current = 1 + Math.floor((elapsed / 5000) * 8); // ramp 1 → 9 sparks
          } else {
            spawnCountRef.current = 10; // max
            if (rampUpRef.current) {
              clearInterval(rampUpRef.current);
              rampUpRef.current = null;
            }
          }
        }
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (rampUpRef.current) {
      clearInterval(rampUpRef.current);
      rampUpRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rampUpRef.current) clearInterval(rampUpRef.current);
    };
  }, []);

  return (
    <>
      <SuccessParticles buttonRef={buttonRef} sparks={sparks} />
      <Button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn("relative transition-transform duration-100", className)}
        {...props}
      >
        {children}
      </Button>
    </>
  );
}

export { ParticleButton };
