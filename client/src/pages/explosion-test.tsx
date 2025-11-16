
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  lifetime: number;
  size: number;
  createdAt: number;
}

interface Circle {
  id: number;
  delay: number;
  duration: number;
  createdAt: number;
}

function ExpandingCircles({
  buttonRef,
  circles,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>;
  circles: Circle[];
}) {
  const rect = buttonRef.current?.getBoundingClientRect();
  if (!rect) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return (
    <>
      {circles.map((circle) => (
        <motion.div
          key={circle.id}
          className="fixed rounded-full border-4"
          style={{
            left: centerX,
            top: centerY,
            zIndex: 9997,
            pointerEvents: "none",
            borderColor: "#255ff4",
          }}
          initial={{
            width: 0,
            height: 0,
            opacity: 1,
            x: 0,
            y: 0,
          }}
          animate={{
            width: 600,
            height: 600,
            opacity: 0,
            x: -300,
            y: -300,
          }}
          transition={{
            duration: circle.duration,
            delay: circle.delay,
            ease: "easeOut",
          }}
        />
      ))}
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

export default function ExplosionTest() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const idRef = useRef(0);
  const circleIdRef = useRef(0);

  const colors = [
    "#ff4500",
    "#ff6347",
    "#ff8c00",
    "#ffa500",
    "#ffb347",
    "#ff9234",
    "#ffcd94",
    "#ff6f3c",
    "#ff0000",
    "#ff1493",
  ];

  const triggerExplosion = () => {
    if (!buttonRef.current) return;

    // Generate fire particles
    const particleCount = 200;
    const newParticles: Particle[] = Array.from({
      length: particleCount,
    }).map(() => ({
      id: idRef.current++,
      angle: Math.random() * Math.PI * 2,
      distance: Math.random() * 400 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      lifetime: 0.8 + Math.random() * 0.8,
      size: Math.random() * 8 + 3,
      createdAt: Date.now(),
    }));

    // Generate expanding circles
    const circleCount = 3;
    const newCircles: Circle[] = Array.from({
      length: circleCount,
    }).map((_, i) => ({
      id: circleIdRef.current++,
      delay: i * 0.1,
      duration: 0.8,
      createdAt: Date.now(),
    }));

    setParticles((prev) => [...prev, ...newParticles]);
    setCircles((prev) => [...prev, ...newCircles]);

    // Clean up old particles and circles after 3 seconds
    setTimeout(() => {
      const now = Date.now();
      setParticles((prev) =>
        prev.filter((p) => now - p.createdAt < 3000)
      );
      setCircles((prev) =>
        prev.filter((c) => now - c.createdAt < 3000)
      );
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8">
      <ExpandingCircles buttonRef={buttonRef} circles={circles} />
      <ExplosionParticles buttonRef={buttonRef} particles={particles} />
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Explosion Effect Test
        </h1>
        <p className="text-gray-400">
          Click the button to trigger an explosion of particles in all directions
        </p>
      </div>

      <Button
        ref={buttonRef}
        onClick={triggerExplosion}
        className="bg-orange-600 hover:bg-orange-700 text-white text-lg px-8 py-6 text-xl font-bold"
      >
        💥 Explode!
      </Button>

      <div className="mt-8 text-gray-500 text-sm">
        <p>Particles: {particles.length} | Circles: {circles.length}</p>
      </div>
    </div>
  );
}
