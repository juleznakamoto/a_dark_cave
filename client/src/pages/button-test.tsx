
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BubblyButton } from "@/components/ui/bubbly-button";

export default function ButtonTest() {
  const [showDisappearingButton, setShowDisappearingButton] = useState(true);

  const handleDisappearingClick = () => {
    setShowDisappearingButton(false);
    setTimeout(() => {
      setShowDisappearingButton(true);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          Button Animation Test
        </h1>
        <p className="text-muted-foreground">
          Testing bubbly button animations
        </p>
      </div>

      <div className="flex flex-col gap-6 items-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Button that stays visible:</p>
          <BubblyButton
            onClick={() => console.log("Permanent button clicked")}
            bubbleColor="#ff0081"
            className="bg-[#ff0081] text-white hover:bg-[#ff0081]/90"
          >
            Click Me (I Stay!)
          </BubblyButton>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Button that disappears for 4 seconds:</p>
          {showDisappearingButton ? (
            <BubblyButton
              onClick={handleDisappearingClick}
              bubbleColor="#ff0081"
              className="bg-[#ff0081] text-white hover:bg-[#ff0081]/90"
            >
              Click Me (I Disappear!)
            </BubblyButton>
          ) : (
            <div className="h-10 flex items-center text-muted-foreground text-sm">
              Reappearing in 4 seconds...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
