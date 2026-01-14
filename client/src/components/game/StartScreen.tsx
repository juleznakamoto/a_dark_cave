import { useState, useEffect, useRef } from "react";
import { ParticleButton } from "@/components/ui/particle-button";
import { useGameStore } from "@/game/state";
import CloudShader from "@/components/ui/cloud-shader";
import { useIsMobile } from "@/hooks/use-mobile";
import { audioManager } from "@/lib/audio";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function StartScreen() {
  const { executeAction, setBoostMode, boostMode, CM } = useGameStore();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  const isMobile = useIsMobile();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mobileTooltip = useMobileTooltip();
  const executedRef = useRef(false);
  const isCruelMode = CM || false;

  useEffect(() => {
    // Check if we're on the /boost path and set the flag
    const isBoostPath = window.location.pathname.includes("/boost");
    if (isBoostPath) {
      setBoostMode(true);
      // Clean up the URL
      window.history.replaceState({}, "", "/");
    }

    const animationTimer = setTimeout(() => {
      setIsAnimationComplete(true);
    }, 5500);

    // Start preloading background music immediately
    audioManager.loadSound("backgroundMusic", "/sounds/background_music.wav");

    // Wait for user gesture before playing wind sound
    let windTimer: NodeJS.Timeout;
    const handleUserGesture = () => {
      // Start wind sound after 2 seconds with 1 second fade-in
      windTimer = setTimeout(() => {
        audioManager.playLoopingSound("wind", 0.2, false, 1);
      }, 2000);

      // Remove listeners after first interaction
      document.removeEventListener("click", handleUserGesture);
      document.removeEventListener("keydown", handleUserGesture);
      document.removeEventListener("touchstart", handleUserGesture);
    };

    // Listen for user gestures
    document.addEventListener("click", handleUserGesture);
    document.addEventListener("keydown", handleUserGesture);
    document.addEventListener("touchstart", handleUserGesture);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(windTimer);
      // Stop wind sound when component unmounts (no fade-out on unmount)
      audioManager.stopLoopingSound("wind");

      // Clean up event listeners
      document.removeEventListener("click", handleUserGesture);
      document.removeEventListener("keydown", handleUserGesture);
      document.removeEventListener("touchstart", handleUserGesture);
    };
  }, [setBoostMode]);

  const handleLightFire = () => {
    // Prevent multiple executions
    if (executedRef.current) {
      return;
    }
    executedRef.current = true;

    // Stop wind sound with 2 second fade-out
    audioManager.stopLoopingSound("wind", 2);

    // Start background music
    audioManager.startBackgroundMusic(0.3);

    if (isMobile) {
      // On mobile, trigger hover effect first
      if (buttonRef.current) {
        const mouseEnterEvent = new MouseEvent("mouseenter", {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        buttonRef.current.dispatchEvent(mouseEnterEvent);
      }

      // Wait 3 seconds, then start the game
      setTimeout(() => {
        executeAction("lightFire");
      }, 3000);
    } else {
      // On desktop, start immediately
      executeAction("lightFire");
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Featured By Section */}
      <div className="absolute bottom-8 left-4 z-20 animate-fade-in-featured">
        <div className="bg-white/25 backdrop-blur-sm rounded-lg p-2 !pb-1 border border-white/25 flex flex-col items-start">
          <p className="text-xs text-gray-300/80 font-medium">Recommended by</p>
          <div className="">
            <img
              src="/the_hustle_logo.svg"
              alt="The Hustle"
              className="h-8 md:h-10 w-auto opacity-100"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in-button {
          0% {
            opacity: 0;
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
          }
        }

        @keyframes fade-in-text {
        0% {
          opacity: 0;
          filter: blur(10px);
        }
        100% {
          opacity: 1;
          filter: blur(0px);
          }
        }

        @keyframes fade-in-featured {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        
        .animate-fade-in-text {
          animation: fade-in-text 2.5s ease-in 0s forwards;
          opacity: 0;
        }

        .animate-fade-in-button {
          animation: fade-in-button 2s ease-in 3.5s forwards;
          opacity: 0;
          pointer-events: none;
        }

        .animate-fade-in-featured {
          animation: fade-in-featured 3s ease-in 7s forwards;
          opacity: 0;
        }

        .button-interactive {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
      <CloudShader />
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-4">
          <p className="animate-fade-in-text text-lg text-gray-300/90 leading-relaxed">
            {isCruelMode ? "A very dark cave." : "A dark cave."}
            <br></br>
            {isCruelMode
              ? "The air is freezing and damp."
              : "The air is cold and damp."}
            <br></br>
            {isCruelMode
              ? "You barely see anything around you."
              : "You barely see the shapes around you."}
          </p>
        </div>
        <ParticleButton
          ref={buttonRef}
          onClick={handleLightFire}
          className={`bg-transparent border-none text-gray-300/90 hover:bg-transparent text-lg px-8 py-4 fire-hover z-[99999] ${!isAnimationComplete ? "animate-fade-in-button" : "button-interactive"}`}
          data-testid="button-light-fire"
          button_id="light-fire"
        >
          Light Fire
        </ParticleButton>
      </main>

      {boostMode && (
        <TooltipProvider>
          <Tooltip open={mobileTooltip.isTooltipOpen("boost-indicator")}>
            <TooltipTrigger asChild>
              <div
                className="absolute bottom-4 right-4 z-20 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  setBoostMode(false);
                }}
              >
                <div className="text-green-600 text-xl">↑</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs whitespace-nowrap">
                Click to deactivate boost
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="absolute bottom-4 right-4 z-10 flex gap-4 text-xs text-muted-foreground">
        <a
          href="/privacy"
          className="hover:text-foreground transition-colors opacity-40 hover:opacity-100"
        >
          Privacy
        </a>
        <a
          href="/imprint"
          className="hover:text-foreground transition-colors opacity-40 hover:opacity-100"
        >
          Imprint
        </a>
      </div>
    </div>
  );
}
