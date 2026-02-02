
import { useState } from "react";
import { BubblyButton, BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";

// ============================================================
// Custom Hook for Bubbly Animation Logic
// ============================================================
function useBubblyAnimation() {
  const [bubbles, setBubbles] = useState<Array<{ id: string; x: number; y: number }>>([]);

  const handleAnimationTrigger = (x: number, y: number) => {
    const id = `bubble-${Date.now()}`;
    setBubbles(prev => [...prev, { id, x, y }]);

    // Keep bubbles visible for animation duration (matches internal system)
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 3000);
  };

  return { bubbles, handleAnimationTrigger };
}

// ============================================================
// Build Button - Non-Upgradeable (Disappearing)
// ============================================================
function NonUpgradeableBuildButton() {
  const [show, setShow] = useState(true);
  const { bubbles, handleAnimationTrigger } = useBubblyAnimation();

  return (
    <div className="relative">
      <div className="relative z-10">
        {show && (
          <BubblyButton
            variant="outline"
            onClick={() => {
              handleAnimationTrigger(window.innerWidth / 2, window.innerHeight / 2);
              setShow(false);
              setTimeout(() => setShow(true), 3000);
            }}
            className="bg-stone-800 hover:bg-stone-700 border-stone-600"
          >
            Build Stone Hut
          </BubblyButton>
        )}
        {!show && (
          <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
            Reappearing in 3s...
          </div>
        )}
      </div>

      <BubblyButtonGlobalPortal bubbles={bubbles} />
    </div>
  );
}

// ============================================================
// Build Button - Upgradeable (Persistent)
// ============================================================
function UpgradeableBuildButton() {
  const { bubbles, handleAnimationTrigger } = useBubblyAnimation();

  return (
    <div className="relative">
      <BubblyButton
        variant="outline"
        onAnimationTrigger={handleAnimationTrigger}
        className="bg-amber-800 hover:bg-amber-700 border-amber-600"
      >
        Wooden Hut
      </BubblyButton>
      <BubblyButtonGlobalPortal bubbles={bubbles} />
    </div>
  );
}

// ============================================================
// Main Test Page
// ============================================================
export default function ButtonTest() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        Build Button Test - Bubbly Animations
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Non-Upgradeable Building</h3>
          <p className="text-xs text-muted-foreground">
            Button disappears after click, animation persists globally
          </p>
          <p className="text-xs text-muted-foreground italic">
            (e.g., Stone Hut - no upgrades available)
          </p>
          <NonUpgradeableBuildButton />
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Upgradeable Building</h3>
          <p className="text-xs text-muted-foreground">
            Button stays visible for repeated interactions
          </p>
          <p className="text-xs text-muted-foreground italic">
            (e.g., Wooden Hut - can be upgraded)
          </p>
          <UpgradeableBuildButton />
        </div>
      </div>
    </div>
  );
}
