import { useEffect, useRef } from "react";
import { ParticleButton } from "@/components/ui/particle-button";
import { useGameStore } from "@/game/state";
import CloudShader from "@/components/ui/cloud-shader";
import { useIsMobile } from "@/hooks/use-mobile";
import { audioManager } from "@/lib/audio";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";

export default function StartScreen() {
  const { executeAction, setBoostMode, boostMode, CM } = useGameStore();
  const isMobile = useIsMobile();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const executedRef = useRef(false);
  const isCruelMode = CM || false;

  useEffect(() => {
    const isBoostPath = window.location.pathname.includes("/boost");
    if (isBoostPath) {
      setBoostMode(true);
      window.history.replaceState({}, "", "/");
    }

    // Play wind sound on mount
    // Note: Most browsers require a user gesture to play audio. 
    // We'll attempt to play it, but it might only start after the first click if blocked.
    const playWind = () => {
      audioManager.playLoopingSound("wind", 0.2, false, 1);
    };

    // Ensure sounds are preloaded before playing
    audioManager.preloadSounds().then(() => {
      playWind();
    });

    // Add a one-time listener to ensure it plays if initially blocked
    const handleInitialGesture = () => {
      if (!executedRef.current) {
        playWind();
      }
      document.removeEventListener("click", handleInitialGesture);
      document.removeEventListener("touchstart", handleInitialGesture);
    };
    document.addEventListener("click", handleInitialGesture);
    document.addEventListener("touchstart", handleInitialGesture);

    return () => {
      audioManager.stopLoopingSound("wind", 2);
      document.removeEventListener("click", handleInitialGesture);
      document.removeEventListener("touchstart", handleInitialGesture);
    };
  }, [setBoostMode]);

  // ✅ Remove animation class after it finishes once
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const handleAnimationEnd = () => {
      btn.classList.remove("animate-fade-in-button");
    };

    btn.addEventListener("animationend", handleAnimationEnd);
    return () => btn.removeEventListener("animationend", handleAnimationEnd);
  }, []);

  const handleLightFire = () => {
    if (executedRef.current) return;
    executedRef.current = true;

    // Load font dynamically (lazy-loaded for better Lighthouse scores)
    // Check if font is already loaded
    if (!document.getElementById('inter-font-face')) {
      const style = document.createElement('style');
      style.id = 'inter-font-face';
      style.textContent = `
        @font-face {
          font-family: 'Inter';
          src: url('/fonts/inter.woff2') format('woff2');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    }

    // Use FontFace API to detect when font is loaded and apply immediately
    if ('fonts' in document) {
      const interFont = new FontFace('Inter', 'url(/fonts/inter.woff2)', {
        weight: '100 900',
        style: 'normal',
        display: 'swap',
      });

      interFont.load().then(() => {
        document.fonts.add(interFont);
        // Apply Inter immediately when loaded
        document.documentElement.classList.add('font-loaded');
      }).catch(() => {
        // Fallback: add class anyway after a short delay
        setTimeout(() => {
          document.documentElement.classList.add('font-loaded');
        }, 100);
      });
    } else {
      // Fallback for browsers without FontFace API - add class immediately
      document.documentElement.classList.add('font-loaded');
    }

    // Immediately stop wind with no fade to prevent overlap
    audioManager.stopLoopingSound("wind", 2);


    audioManager.loadGameSounds().then(() => {
      audioManager.startBackgroundMusic(0.3);
    });

    // Show button effect for 3 seconds on both mobile and desktop
    if (buttonRef.current) {
      const mouseEnterEvent = new MouseEvent("mouseenter", {
        bubbles: true,
        cancelable: true,
        view: window,
      });
      buttonRef.current.dispatchEvent(mouseEnterEvent);
    }
    setTimeout(() => executeAction("lightFire"), 3000);
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Featured By Section */}
      <div className="absolute bottom-8 left-4 z-20 animate-fade-in-featured">
        <div className="bg-white/25 backdrop-blur-sm rounded-lg p-2 !pb-1 border border-white/25 flex flex-col items-start">
          <p className="text-xs text-gray-300/80 font-medium">Recommended by</p>
          <img
            src="/the_hustle_logo.svg"
            alt="The Hustle"
            width={116}
            height={40}
            className="h-8 md:h-10 w-auto opacity-100"
          />
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

        .animate-fade-in-button {
          animation: fade-in-button 1s ease-in 1.5s forwards;
          opacity: 0;
        }

        @keyframes fade-in-text {
          0% { opacity: 0; filter: blur(10px); }
          100% { opacity: 1; filter: blur(0px); }
        }

        .animate-fade-in-text {
          animation: fade-in-text 1s ease-in 0.5s forwards;
          opacity: 0;
        }

        @keyframes fade-in-featured {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate-fade-in-featured {
          animation: fade-in-featured 3s ease-in 6s forwards;
          opacity: 0;
        }
      `}</style>

      <CloudShader />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-4">
          <p className="animate-fade-in-text text-lg text-gray-300/90 leading-relaxed">
            {isCruelMode ? "A very dark cave." : "A dark cave."}
            <br />
            {isCruelMode
              ? "The air is freezing and damp."
              : "The air is cold and damp."}
            <br />
            {isCruelMode
              ? "You barely see anything around you."
              : "You barely see the shapes around you."}
          </p>
        </div>

        <ParticleButton
          ref={buttonRef}
          onClick={handleLightFire}
          className="animate-fade-in-button bg-transparent border-none text-gray-300/90 hover:bg-transparent text-lg px-8 py-4 fire-hover z-[99999]"
          data-testid="button-light-fire"
          button_id="light-fire"
        >
          Light Fire
        </ParticleButton>
      </main>

      {boostMode && (
        <TooltipWrapper
          tooltip={
            <div className="text-xs whitespace-nowrap">
              Click to deactivate boost
            </div>
          }
          tooltipId="boost-indicator"
        >
          <div
            className="absolute bottom-4 right-4 z-20 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              setBoostMode(false);
            }}
          >
            <div className="text-green-600 text-xl">↑</div>
          </div>
        </TooltipWrapper>
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
