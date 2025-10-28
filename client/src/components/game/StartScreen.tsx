import { useState, useEffect, useRef } from 'react';
import { ParticleButton } from '@/components/ui/particle-button';
import { useGameStore } from '@/game/state';
import CloudShader from '@/components/ui/cloud-shader';
import { useIsMobile } from '@/hooks/use-mobile';

export default function StartScreen() {
  const { executeAction } = useGameStore();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const isMobile = useIsMobile();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, 6000); // 3.5s delay + 2.5s animation

    return () => clearTimeout(timer);
  }, []);

  const handleLightFire = () => {
    if (isMobile) {
      // On mobile, trigger hover effect first
      if (buttonRef.current) {
        const mouseEnterEvent = new MouseEvent('mouseenter', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        buttonRef.current.dispatchEvent(mouseEnterEvent);
      }
      
      // Wait 3 seconds, then start the game
      setTimeout(() => {
        executeAction('lightFire');
      }, 3000);
    } else {
      // On desktop, start immediately
      executeAction('lightFire');
    }
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
          animation: fade-in-button 2.5s ease-in 3.5s forwards;
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
          ref={buttonRef}
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