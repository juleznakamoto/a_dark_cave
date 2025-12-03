import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// ============================================================
// Shared Bubble Animation Component
// ============================================================
function BubbleSet({ x, y, color }: { x: number; y: number; color: string }) {
  // Create varied colors for dust/debris theme with more vibrant variations
  const colors = [
    "#8b7355", // brown
    "#a0826d", // lighter brown
    "#6b5d51", // darker brown
    "#d4c5b9", // dust/beige
    "#9c8677", // medium brown
    "#c9a86a", // golden dust
    "#7a6652", // rich earth
    "#e6d5c3", // light sand
    "#b89968", // warm tan
    "#8a7355", // deep brown
  ];
  
  // 90-110 bubbles for maximum satisfaction
  const bubbles = Array.from({ length: 90 + Math.floor(Math.random() * 21) }).map(() => ({
    size: 3 + Math.random() * 22,
    angle: Math.random() * Math.PI * 2,
    distance: 30 + Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <>
      {bubbles.map((b, i) => {
        const endX = x + Math.cos(b.angle) * b.distance;
        const endY = y + Math.sin(b.angle) * b.distance;

        return (
          <motion.div
            key={i}
            className="fixed rounded-full"
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              backgroundColor: b.color,
              left: x,
              top: y,
              zIndex: 9999,
              pointerEvents: "none",
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              opacity: 0,
              scale: 0.1,
              x: endX - x,
              y: endY - y,
            }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

// ============================================================
// Pattern 3: State Hoisting - Regular Button
// ============================================================
function RegularButtonContainer() {
  const [bubbles, setBubbles] = useState<{ id: string; x: number; y: number }[]>([]);

  const handleButtonClick = (x: number, y: number) => {
    const id = `bubble-${Date.now()}`;
    setBubbles((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 1000);
  };

  return (
    <>
      {bubbles.map((bubble) => (
        <BubbleSet key={bubble.id} x={bubble.x} y={bubble.y} color="#8b7355" />
      ))}
      <RegularButton onClick={handleButtonClick} />
    </>
  );
}

function RegularButton({
  onClick,
}: {
  onClick: (x: number, y: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isGlowing, setIsGlowing] = useState(false);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      onClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      // Trigger glow for 1 second
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 1000);
    }
  };

  return (
    <Button 
      ref={buttonRef} 
      onClick={handleClick} 
      variant="outline"
      style={{
        boxShadow: isGlowing 
          ? "0 0 15px #8b735580, 0 0 30px #8b735540" 
          : undefined,
        transition: "box-shadow 0.1s ease-in-out",
      }}
    >
      Regular Button (Stays Visible)
    </Button>
  );
}

// ============================================================
// Pattern 3: State Hoisting - Disappearing Button
// ============================================================
function DisappearingButtonContainer() {
  const [show, setShow] = useState(true);
  const [bubbles, setBubbles] = useState<{ id: string; x: number; y: number }[]>([]);

  const handleButtonClick = (x: number, y: number) => {
    const id = `bubble-${Date.now()}`;
    setBubbles((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 1000);

    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <>
      {bubbles.map((bubble) => (
        <BubbleSet key={bubble.id} x={bubble.x} y={bubble.y} color="#8b7355" />
      ))}
      {show ? (
        <DisappearingButton onClick={handleButtonClick} />
      ) : (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing in 4 seconds...
        </div>
      )}
    </>
  );
}

function DisappearingButton({
  onClick,
}: {
  onClick: (x: number, y: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isGlowing, setIsGlowing] = useState(false);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      onClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
      
      // Trigger glow for 1 second
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 1000);
    }
  };

  return (
    <Button 
      ref={buttonRef} 
      onClick={handleClick} 
      variant="outline"
      style={{
        boxShadow: isGlowing 
          ? "0 0 15px #8b735580, 0 0 30px #8b735540" 
          : undefined,
        transition: "box-shadow 0.1s ease-in-out",
      }}
    >
      Disappearing Button
    </Button>
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
          Parent component manages animation state, so animations complete
          even when the button disappears from the DOM.
        </p>
      </div>
    </div>
  );
}