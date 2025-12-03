
import { useState } from "react";
import { BubblyButton } from "@/components/ui/bubbly-button";

export default function ButtonTest() {
  const [showButton2, setShowButton2] = useState(true);

  const handleButton1Click = () => {
    console.log("Button 1 clicked - stays visible");
  };

  const handleButton2Click = () => {
    console.log("Button 2 clicked - will disappear");
    setShowButton2(false);
    setTimeout(() => {
      setShowButton2(true);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        Bubbly Button Test
      </h1>

      <div className="flex flex-col gap-4 items-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Permanent Button (doesn't disappear)
          </p>
          <BubblyButton
            onClick={handleButton1Click}
            variant="outline"
            size="default"
            bubbleColor="#dc143c"
          >
            Click Me - I Stay
          </BubblyButton>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Disappearing Button (reappears after 4s)
          </p>
          {showButton2 ? (
            <BubblyButton
              onClick={handleButton2Click}
              variant="outline"
              size="default"
              bubbleColor="#dc143c"
            >
              Click Me - I Disappear
            </BubblyButton>
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground">
              Button will reappear...
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-md text-center">
        <p>
          Test instructions: Click both buttons. The first stays visible, the
          second disappears for 4 seconds. Both should show bubble and glow
          animations even when the button is removed from DOM.
        </p>
      </div>
    </div>
  );
}
