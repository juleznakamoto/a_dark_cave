"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export interface Spark {
  id: number;
  angle: number;
  distance: number;
  color: string;
  lifetime: number;
  offsetX: number;
  createdAt: number;
}

interface FeedFireParticlesProps {
  buttonRef: React.RefObject<HTMLButtonElement>;
  sparks: Spark[];
}

export function SuccessParticles({
  buttonRef,
  sparks,
}: FeedFireParticlesProps) {
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
              boxShadow: `0 0 ${Math.random() * 8 + 3}px ${spark.color}`,
            }}
            initial={{
              opacity: 1,
              scale: Math.random() * 0.6 + 0.2,
            }}
            animate={{
              opacity: 0,
              scale: 0.15 + Math.random() * 0.2,
              x:
                endX -
                startX +
                Math.sin(Math.random() * Math.PI * 2) * 10,
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

export function useFeedFireParticles() {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const idRef = useRef(0);

  const colors = ["#ffb347", "#ff9234", "#ffcd94", "#ff6f3c", "#ff4500"]; // ember-like colors

  const spawnParticles = (count: number, buttonRef: React.RefObject<HTMLButtonElement>) => {
    if (!buttonRef.current) return;

    const buttonWidth = buttonRef.current.offsetWidth;
    const newSparks: Spark[] = Array.from({ length: count }).map(() => ({
      id: idRef.current++,
      angle: (Math.random() * 120 - 150) * (Math.PI / 180),
      distance: Math.random() * 180 + 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      lifetime: 0.8 + Math.random() * 1.2,
      offsetX: buttonWidth * 0.5 + (Math.random() * 74 - 37),
      createdAt: Date.now(),
    }));

    setSparks((prev) => [...prev, ...newSparks]);
  };

  // Clean up particles after 3 seconds
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setSparks((prev) =>
        prev.filter((spark) => {
          const sparkAge = now - spark.createdAt;
          return sparkAge < 3000;
        })
      );
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  return {
    sparks,
    spawnParticles,
  };
}