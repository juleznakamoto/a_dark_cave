
import { useState } from "react";
import { BubblyButton } from "@/components/ui/bubbly-button";

// ============================================================
// Pattern 3: State Hoisting - Regular Button
// ============================================================
function RegularButtonContainer() {
  return (
    <BubblyButton variant="outline">
      Regular Button (Stays Visible)
    </BubblyButton>
  );
}

// ============================================================
// Pattern 3: State Hoisting - Disappearing Button
// ============================================================
function DisappearingButtonContainer() {
  const [show, setShow] = useState(true);

  const handleClick = () => {
    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <>
      {show ? (
        <BubblyButton variant="outline" onClick={handleClick}>
          Disappearing Button
        </BubblyButton>
      ) : (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing in 4 seconds...
        </div>
      )}
    </>
  );
}

// ============================================================
// Main Test Page
// ============================================================
export default function ButtonTest() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        Button Animation Test - State Hoisting Pattern
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Regular Button */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Regular Button</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Stays visible, animations continue
          </p>
          <RegularButtonContainer />
        </div>

        {/* Disappearing Button */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Disappearing Button</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Disappears for 4 seconds, animations continue
          </p>
          <DisappearingButtonContainer />
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-2xl text-center space-y-2">
        <p className="font-semibold">State Hoisting Pattern</p>
        <p>
          Parent component manages visibility state, child button only handles click effects.
          Animations persist even when button is removed from DOM.
        </p>
      </div>
    </div>
  );
}
