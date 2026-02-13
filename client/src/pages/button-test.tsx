import { useState } from "react";
import {
  BubblyButton,
  BubblyButtonGlobalPortal,
  CRAFT_PARTICLE_CONFIG,
  getExploreParticleConfig,
  generateParticleData,
  type BubbleWithParticles,
} from "@/components/ui/bubbly-button";

const EXPLORE_ACTIONS = [
  { id: "exploreCave", label: "Explore Cave" },
  { id: "ventureDeeper", label: "Venture Deeper" },
  { id: "descendFurther", label: "Descend Further" },
  { id: "exploreRuins", label: "Explore Ruins" },
  { id: "exploreTemple", label: "Explore Temple" },
  { id: "exploreCitadel", label: "Explore Citadel" },
] as const;

// ============================================================
// Build Button - Non-Upgradeable (Disappearing)
// ============================================================
function NonUpgradeableBuildButton() {
  const [show, setShow] = useState(true);
  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);

  const handleAnimationTrigger = (x: number, y: number) => {
    const id = `bubble-${Date.now()}`;
    const particles = generateParticleData();
    setBubbles(prev => [...prev, { id, x, y, particles }]);

    // Keep bubbles visible for animation duration
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 4000);
  };

  const handleClick = () => {
    // Trigger animation
    setShow(false);
    // Button stays hidden (no reappearance timeout) - represents completed build
    // Animation persists via global portal
  };

  return (
    <div className="relative">
      <div className="relative z-10">
        {show && (
          <BubblyButton
            variant="outline"
            onClick={handleClick}
            onAnimationTrigger={handleAnimationTrigger}
            className="bg-transparent hover:bg-stone-700/20 border-stone-600"
          >
            Build Stone Hut
          </BubblyButton>
        )}
        {!show && (
          <div className="h-10 flex items-center justify-center text-green-600 text-xs font-medium">
            ✓ Built!
          </div>
        )}
      </div>

      <BubblyButtonGlobalPortal bubbles={bubbles} />
    </div>
  );
}

// ============================================================
// Build Button - Upgradeable (Persistent)
// Uses ONLY the internal animation system (bubbles render behind button)
// ============================================================
function UpgradeableBuildButton() {
  return (
    <div className="relative">
      <BubblyButton
        variant="outline"
        className="bg-transparent hover:bg-amber-700/20 border-amber-600"
      >
        Wooden Hut
      </BubblyButton>
    </div>
  );
}

// ============================================================
// Craft Button - Adapted from build animation
// Uses amber/copper tones for craft feel, same structure for reuse in craft actions
// ============================================================
function CraftButton() {
  return (
    <div className="relative">
      <BubblyButton
        variant="outline"
        particleConfig={CRAFT_PARTICLE_CONFIG}
        className="bg-transparent hover:bg-amber-800/20 border-amber-600/80"
      >
        Craft Stone Axe
      </BubblyButton>
    </div>
  );
}

// ============================================================
// Explore Cave Buttons - All levels for testing/styling
// ============================================================
function ExploreCaveButtons() {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {EXPLORE_ACTIONS.map(({ id, label }) => (
        <BubblyButton
          key={id}
          variant="outline"
          particleConfig={getExploreParticleConfig(id)}
          className="bg-transparent hover:bg-stone-700/20 border-stone-600/80"
        >
          {label}
        </BubblyButton>
      ))}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
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

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Craft Action (Adapted)</h3>
          <p className="text-xs text-muted-foreground">
            Custom particleConfig: colors, duration, distance, size, count, glow, ease
          </p>
          <p className="text-xs text-muted-foreground italic">
            (CRAFT_PARTICLE_CONFIG preset - snappier, shorter range)
          </p>
          <CraftButton />
        </div>
      </div>

      <div className="border rounded-lg p-6 w-full max-w-4xl space-y-4">
        <h3 className="text-sm font-semibold">Explore Cave (All Levels)</h3>
        <p className="text-xs text-muted-foreground">
          Per-level particle configs for testing and styling
        </p>
        <ExploreCaveButtons />
      </div>
    </div>
  );
}
