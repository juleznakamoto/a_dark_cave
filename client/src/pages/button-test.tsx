
import { useState } from "react";
import { BubblyButton, BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";

function Approach3_LiftedState() {
  const [show, setShow] = useState(true);
  const [bubbles, setBubbles] = useState<Array<{ id: string; x: number; y: number }>>([]);

  const handleAnimationTrigger = (x: number, y: number) => {
    const id = `bubble-${Date.now()}`;
    setBubbles(prev => [...prev, { id, x, y }]);

    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 2000);
  };

  const handleClick = () => {
    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <div className="relative">
      <div className="relative z-10">
        {show && (
          <BubblyButton 
            variant="outline" 
            onClick={handleClick}
            onAnimationTrigger={handleAnimationTrigger}
          >
            Disappearing Button
          </BubblyButton>
        )}
        {!show && (
          <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
            Reappearing in 4s...
          </div>
        )}
      </div>

      <BubblyButtonGlobalPortal bubbles={bubbles} />
    </div>
  );
}

export default function ButtonTest() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        Bubbly Button Test - 5 Approaches for Animation Behind Button
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Approach 1: Negative z-index</h3>
          <p className="text-xs text-muted-foreground">
            Animation container uses z-index: -1
          </p>
          <BubblyButton variant="outline" approach={1}>
            Approach 1
          </BubblyButton>
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Approach 2: Transform translateZ</h3>
          <p className="text-xs text-muted-foreground">
            3D transform creates stacking context
          </p>
          <BubblyButton variant="outline" approach={2}>
            Approach 2
          </BubblyButton>
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Approach 3: CSS Isolation</h3>
          <p className="text-xs text-muted-foreground">
            Uses isolation: isolate property
          </p>
          <BubblyButton variant="outline" approach={3}>
            Approach 3
          </BubblyButton>
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Approach 4: Internal z-index</h3>
          <p className="text-xs text-muted-foreground">
            Animation inside button with negative z-index
          </p>
          <BubblyButton variant="outline" approach={4}>
            Approach 4
          </BubblyButton>
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Approach 5: Double wrapper</h3>
          <p className="text-xs text-muted-foreground">
            Explicit z-index stacking with wrappers
          </p>
          <BubblyButton variant="outline" approach={5}>
            Approach 5
          </BubblyButton>
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Disappearing Button (Lifted State)</h3>
          <p className="text-xs text-muted-foreground">
            Parent manages animation state, button disappears after click
          </p>
          <Approach3_LiftedState />
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-3xl text-center space-y-2">
        <p className="font-semibold">All buttons use 100 neutral-toned bubbles starting from button center</p>
        <p>Each approach uses a different technique to ensure animations render behind the button</p>
        <p>Click each button to test the visual layering and animation behavior</p>
      </div>
    </div>
  );
}
