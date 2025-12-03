
import { useState } from "react";
import { BubblyButton, BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";

// ============================================================
// Approach 3: Animation State in Parent (Lifted State)
// ============================================================
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

// ============================================================
// Main Test Page
// ============================================================
export default function ButtonTest() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        Bubbly Button Test
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Non-Disappearing Button</h3>
          <p className="text-xs text-muted-foreground">
            Button stays visible, animations play behind it
          </p>
          <BubblyButton variant="outline">
            Normal Button
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
        <p className="font-semibold">Both buttons use 100 gray-toned bubbles with randomized physics</p>
        <p>The disappearing button uses lifted state to persist animations after the button is removed from the DOM</p>
      </div>
    </div>
  );
}
