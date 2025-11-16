
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
  lifetime: number;
  createdAt: number;
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
              width: "6px",
              height: "6px",
              backgroundColor: particle.color,
              left: startX,
              top: startY,
              zIndex: 9999,
              pointerEvents: "none",
              boxShadow: `0 0 ${Math.random() * 10 + 5}px ${particle.color}`,
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const idRef = useRef(0);

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

    const particleCount = 50; // Number of particles in explosion
    const newParticles: Particle[] = Array.from({
      length: particleCount,
    }).map(() => ({
      id: idRef.current++,
      angle: Math.random() * Math.PI * 2, // Full 360 degrees
      distance: Math.random() * 300 + 100, // Random distance
      color: colors[Math.floor(Math.random() * colors.length)],
      lifetime: 0.8 + Math.random() * 0.8, // Random lifetime
      createdAt: Date.now(),
    }));

    setParticles((prev) => [...prev, ...newParticles]);

    // Clean up old particles after 3 seconds
    setTimeout(() => {
      const now = Date.now();
      setParticles((prev) =>
        prev.filter((p) => now - p.createdAt < 3000)
      );
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-8">
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
        <p>Particles created: {particles.length}</p>
      </div>
    </div>
  );
}
