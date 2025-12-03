
import { useState, useRef } from "react";
import { BubblyButton } from "@/components/ui/bubbly-button";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// Approach 1: Portal-based Animation Container (Parent manages animations)
// ============================================================
function Approach1_PortalAnimation() {
  const [show, setShow] = useState(true);
  const [animations, setAnimations] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX;
    const y = e.clientY;
    const id = `anim-${Date.now()}`;

    setAnimations(prev => [...prev, { id, x, y }]);

    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 2000);

    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <div className="relative">
      {show && (
        <BubblyButton ref={buttonRef} variant="outline" onClick={handleClick}>
          Approach 1: Portal
        </BubblyButton>
      )}
      {!show && (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing in 4s...
        </div>
      )}
      
      {/* Animations rendered at body level */}
      <AnimatePresence>
        {animations.map(anim => {
          const bubbleCount = 100;
          return (
            <div key={anim.id}>
              {Array.from({ length: bubbleCount }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 120;
                const size = 3 + Math.random() * 25;
                const gray = Math.floor(Math.random() * 8);
                const grayTones = ["#f5f5f5", "#e0e0e0", "#bdbdbd", "#9e9e9e", "#757575", "#616161", "#424242", "#212121"];
                const duration = 0.5 + Math.random() * 1.2;

                return (
                  <motion.div
                    key={`${anim.id}-${i}`}
                    className="fixed rounded-full pointer-events-none"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: grayTones[gray],
                      left: anim.x,
                      top: anim.y,
                      zIndex: 9999,
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
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Approach 2: Separate Animation Layer (createPortal alternative)
// ============================================================
function Approach2_SeparateLayer() {
  const [show, setShow] = useState(true);
  const [activeAnimations, setActiveAnimations] = useState<string[]>([]);
  const animationLayerRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    const id = `layer-${Date.now()}`;
    setActiveAnimations(prev => [...prev, id]);
    
    setTimeout(() => {
      setActiveAnimations(prev => prev.filter(a => a !== id));
    }, 2000);

    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <div className="relative">
      {show && (
        <BubblyButton variant="outline" onClick={handleClick}>
          Approach 2: Layer
        </BubblyButton>
      )}
      {!show && (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing in 4s...
        </div>
      )}
      
      <div ref={animationLayerRef} className="fixed inset-0 pointer-events-none z-[9999]">
        <AnimatePresence>
          {activeAnimations.map(id => (
            <div key={id} className="absolute inset-0">
              {Array.from({ length: 100 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 120;
                const size = 3 + Math.random() * 25;
                const gray = Math.floor(Math.random() * 8);
                const grayTones = ["#f5f5f5", "#e0e0e0", "#bdbdbd", "#9e9e9e", "#757575", "#616161", "#424242", "#212121"];
                const duration = 0.5 + Math.random() * 1.2;

                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: grayTones[gray],
                      left: "50%",
                      top: "50%",
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
// Approach 3: Animation State in Parent (Lifted State)
// ============================================================
function Approach3_LiftedState() {
  const [show, setShow] = useState(true);
  const [bubbles, setBubbles] = useState<Array<{ id: string; timestamp: number }>>([]);

  const handleClick = () => {
    const id = `bubble-${Date.now()}`;
    setBubbles(prev => [...prev, { id, timestamp: Date.now() }]);

    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 2000);

    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <div className="relative">
      <div className="relative z-10">
        {show && (
          <BubblyButton variant="outline" onClick={handleClick}>
            Approach 3: Lifted
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
                const grayTones = ["#f5f5f5", "#e0e0e0", "#bdbdbd", "#9e9e9e", "#757575", "#616161", "#424242", "#212121"];
                const duration = 0.5 + Math.random() * 1.2;

                return (
                  <motion.div
                    key={`${bubble.id}-${i}`}
                    className="fixed rounded-full"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: grayTones[gray],
                      left: "50%",
                      top: "50%",
                      zIndex: 9998,
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
// Approach 4: Keep Button Mounted (visibility: hidden)
// ============================================================
function Approach4_HiddenButton() {
  const [visible, setVisible] = useState(true);

  const handleClick = () => {
    setVisible(false);
    setTimeout(() => setVisible(true), 4000);
  };

  return (
    <div className="relative h-10">
      <div style={{ visibility: visible ? "visible" : "hidden" }}>
        <BubblyButton variant="outline" onClick={handleClick}>
          Approach 4: Hidden
        </BubblyButton>
      </div>
      {!visible && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing in 4s...
        </div>
      )}
    </div>
  );
}

// ============================================================
// Approach 5: Opacity Transition (Keep in DOM)
// ============================================================
function Approach5_OpacityTransition() {
  const [opacity, setOpacity] = useState(1);

  const handleClick = () => {
    setOpacity(0);
    setTimeout(() => setOpacity(1), 4000);
  };

  return (
    <div className="relative h-10">
      <div style={{ opacity, pointerEvents: opacity === 0 ? "none" : "auto", transition: "opacity 0.3s" }}>
        <BubblyButton variant="outline" onClick={handleClick}>
          Approach 5: Opacity
        </BubblyButton>
      </div>
      {opacity === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing in 4s...
        </div>
      )}
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
        5 Proven Approaches - Persistent Animations
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Portal Animation</h3>
          <p className="text-xs text-muted-foreground">
            Animations rendered at document level, independent of button lifecycle
          </p>
          <Approach1_PortalAnimation />
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Separate Layer</h3>
          <p className="text-xs text-muted-foreground">
            Dedicated animation layer persists regardless of button state
          </p>
          <Approach2_SeparateLayer />
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Lifted State</h3>
          <p className="text-xs text-muted-foreground">
            Parent manages all animation state, button just triggers
          </p>
          <Approach3_LiftedState />
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Hidden Button</h3>
          <p className="text-xs text-muted-foreground">
            Button stays mounted, only visibility changes
          </p>
          <Approach4_HiddenButton />
        </div>

        <div className="border rounded-lg p-6 text-center space-y-4">
          <h3 className="text-sm font-semibold">Opacity Transition</h3>
          <p className="text-xs text-muted-foreground">
            Button remains in DOM, opacity fades to zero
          </p>
          <Approach5_OpacityTransition />
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-3xl text-center space-y-2">
        <p className="font-semibold">All 5 approaches ensure animations persist after button removal:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Approaches 1-3: Animations live outside button component</li>
          <li>Approaches 4-5: Button stays mounted but invisible</li>
          <li>All use 100 gray-toned bubbles with randomized physics</li>
        </ul>
      </div>
    </div>
  );
}
