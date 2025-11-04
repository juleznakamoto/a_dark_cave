import { useState, useEffect, useRef } from 'react';
import { ParticleButton } from '@/components/ui/particle-button';
import { useGameStore } from '@/game/state';
import CloudShader from '@/components/ui/cloud-shader';
import { useIsMobile } from '@/hooks/use-mobile';
import { audioManager } from '@/lib/audio';
import { useMobileTooltip } from '@/hooks/useMobileTooltip';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function StartScreen() {
  const { executeAction, setBoostMode, boostMode } = useGameStore();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const isMobile = useIsMobile();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mobileTooltip = useMobileTooltip();

  useEffect(() => {
    // Check if we're on the /boost path and set the flag
    const isBoostPath = window.location.pathname.includes('/boost');
    if (isBoostPath) {
      setBoostMode(true);
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }

    const timer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, 5000); // 2s delay + 3s animation

    // Start preloading background music immediately
    audioManager.loadSound('backgroundMusic', '/sounds/background_music.wav');

    return () => clearTimeout(timer);
  }, [setBoostMode]);

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
          animation: fade-in-button 2s ease-in 3s forwards;
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
      
      {boostMode && (
        <TooltipProvider>
          <Tooltip open={mobileTooltip.isTooltipOpen('boost-indicator')}>
            <TooltipTrigger asChild>
              <div 
                className="absolute bottom-4 right-4 z-20 cursor-pointer"
                onClick={(e) => mobileTooltip.handleTooltipClick('boost-indicator', e)}
              >
                <div className="text-green-600 text-xl">↑</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs whitespace-nowrap">
                Boost activated
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}