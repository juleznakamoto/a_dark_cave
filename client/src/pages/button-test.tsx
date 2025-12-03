import { useState, useRef } from "react";
import { BubblyButton } from "@/components/ui/bubbly-button";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// Approach 3: Animation State in Parent (Lifted State)
// ============================================================
function Approach3_LiftedState() {
  const [show, setShow] = useState(true);
  const [bubbles, setBubbles] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    const id = `bubble-${Date.now()}`;

    setBubbles(prev => [...prev, { id, x, y }]);

    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 2000);

    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  const grayTones = ["#f5f5f5", "#e0e0e0", "#bdbdbd", "#9e9e9e", "#757575", "#616161", "#424242", "#212121"];

  return (
    <div className="relative">
      <div className="relative z-10">
        {show && (
          <BubblyButton ref={buttonRef} variant="outline" onClick={handleClick}>
            Disappearing Button
          </BubblyButton>
        )}
        {!show && (
          <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
            Reappearing in 4s...
          </div>
        )}
      </div>

      <div className="fixed inset-0 pointer-events-none z-[9998]">
        <AnimatePresence>
          {bubbles.map(bubble => (
            <div key={bubble.id}>
              {Array.from({ length: 100 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 120;
                const size = 3 + Math.random() * 25;
                const gray = Math.floor(Math.random() * 8);
                const duration = 0.5 + Math.random() * 1.2;

                return (
                  <motion.div
                    key={`${bubble.id}-${i}`}
                    className="fixed rounded-full"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: grayTones[gray],
                      left: bubble.x,
                      top: bubble.y,
                      zIndex: 9998,
                      boxShadow: `0 0 ${size * 0.8}px ${grayTones[gray]}aa, 0 0 ${size * 1.5}px ${grayTones[gray]}55`,
                    }}
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 0.1,
                      x: Math.cos(angle) * distance,
                      y: Math.sin(angle) * distance,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
                  />
                );
              })}
            </div>
          ))}
        </AnimatePresence>
      </div>
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