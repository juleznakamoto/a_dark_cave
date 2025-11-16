
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Particle {
  id: number;
  angle: number;
  distance: number;
  lifetime: number;
  size: number;
  createdAt: number;
  startX: number;
  startY: number;
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
        const endX = particle.startX + Math.cos(particle.angle) * particle.distance;
        const endY = particle.startY + Math.sin(particle.angle) * particle.distance;

        const midX1 = particle.startX + (endX - particle.startX) * 0.25;
        const midY1 = particle.startY + (endY - particle.startY) * 0.25;
        const midX2 = particle.startX + (endX - particle.startX) * 0.5;
        const midY2 = particle.startY + (endY - particle.startY) * 0.5;

        return (
          <motion.div
            key={particle.id}
            className="fixed rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: particle.startX - particle.size / 2,
              top: particle.startY - particle.size / 2,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            initial={{
              opacity: 1,
              scale: 1,
              background: "hsl(60, 100%, 100%)",
            }}
            animate={{
              opacity: [1, 1, 1, 1, 0],
              scale: [1, 4, 7, 7, 0],
              x: [0, midX1 - particle.startX, midX2 - particle.startX, midX2 - particle.startX, endX - particle.startX],
              y: [0, midY1 - particle.startY, midY2 - particle.startY, midY2 - particle.startY, endY - particle.startY],
              background: [
                "hsl(60, 100%, 100%)",
                "hsl(60, 100%, 80%)",
                "hsl(40, 100%, 60%)",
                "hsl(20, 100%, 40%)",
                "hsl(0, 0%, 20%)"
              ],
            }}
            transition={{
              duration: particle.lifetime,
              ease: [0.15, 0.5, 0.5, 0.85],
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

  const triggerExplosion = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const particleCount = 25; // Fire particles only
    const newParticles: Particle[] = Array.from({
      length: particleCount,
    }).map(() => {
      const r = Math.random() * 0.25 + 0.25; // Random radius between 0.25 and 0.5 em
      const size = r * 16 * 2; // Convert em to px (assuming 16px base font)
      const xBound = (rect.width / 2 / 16) - r;
      const yBound = (rect.height / 2 / 16) - r;
      
      const x = centerX + (Math.random() * xBound * 2 - xBound) * 16;
      const y = centerY + (Math.random() * yBound * 2 - yBound) * 16;
      
      const angle = Math.atan2(y - centerY, x - centerX);
      const distance = (Math.random() * 4 + 1) * 16; // Random distance 1-5 em in pixels
      const lifetime = Math.random() * 0.5 + 0.5; // Random lifetime 0.5-1 seconds

      return {
        id: idRef.current++,
        angle,
        distance,
        lifetime,
        size,
        createdAt: Date.now(),
        startX: x,
        startY: y,
      };
    });

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
          Click the button to trigger a fire particle explosion
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
