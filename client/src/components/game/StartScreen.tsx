import { useState, useEffect } from 'react';
import { ParticleButton } from '@/components/ui/particle-button';
import { useGameStore } from '@/game/state';
import CloudShader from '@/components/ui/cloud-shader';

export default function StartScreen() {
  const { executeAction } = useGameStore();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, 4000); // 3s delay + 1s animation

    return () => clearTimeout(timer);
  }, []);

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <style>{`
        @keyframes fade-in-button {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-fade-in-button {
          animation: fade-in-button 1s ease-in 3s forwards;
          opacity: 0;
          pointer-events: none;
        }

        .button-interactive {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      <CloudShader />
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-4">
          <p className="text-lg text-gray-300 leading-relaxed">
            A dark cave.<br></br>The air is cold and damp.<br></br>You barely see the shapes around you.
          </p>
        </div>
        <ParticleButton
          onClick={handleLightFire}
          className={`bg-transparent border-none text-white hover:bg-transparent text-lg px-8 py-4 fire-hover z-[99999] ${!isAnimationComplete ? 'animate-fade-in-button' : 'button-interactive'}`}
          data-testid="button-light-fire"
        >
          Light Fire
        </ParticleButton>
      </main>
    </div>
  );
}