import { useState, useRef, useEffect } from "react";
import { BubblyButton } from "@/components/ui/bubbly-button";
import { Button } from "@/components/ui/button";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";

// ============================================================
// PATTERN 1: Global Animation Manager (Singleton)
// ============================================================
interface AnimationData {
  id: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

class GlobalAnimationManager {
  private static instance: GlobalAnimationManager;
  private animations: AnimationData[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): GlobalAnimationManager {
    if (!GlobalAnimationManager.instance) {
      GlobalAnimationManager.instance = new GlobalAnimationManager();
    }
    return GlobalAnimationManager.instance;
  }

  addAnimation(x: number, y: number, color: string) {
    const id = `anim-${Date.now()}-${Math.random()}`;
    this.animations.push({ id, x, y, color, timestamp: Date.now() });
    this.notifyListeners();

    // Auto-cleanup after animation duration
    setTimeout(() => {
      this.removeAnimation(id);
    }, 1000);
  }

  removeAnimation(id: string) {
    this.animations = this.animations.filter((a) => a.id !== id);
    this.notifyListeners();
  }

  getAnimations() {
    return this.animations;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

function Pattern1Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      GlobalAnimationManager.getInstance().addAnimation(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        "#8b7355"
      );
    }
    onDisappear();
  };

  return (
    <Button ref={buttonRef} onClick={handleClick} variant="outline">
      Pattern 1: Global Manager
    </Button>
  );
}

function GlobalAnimationRenderer() {
  const [animations, setAnimations] = useState<AnimationData[]>([]);

  useEffect(() => {
    const manager = GlobalAnimationManager.getInstance();
    const updateAnimations = () => setAnimations([...manager.getAnimations()]);
    updateAnimations();
    return manager.subscribe(updateAnimations);
  }, []);

  return (
    <>
      {animations.map((anim) => (
        <BubbleSet key={anim.id} x={anim.x} y={anim.y} color={anim.color} />
      ))}
    </>
  );
}

// ============================================================
// PATTERN 2: Portal with Delayed Cleanup
// ============================================================
function Pattern2Button({ onDisappear }: { onDisappear: () => void }) {
  const [bubbles, setBubbles] = useState<{ id: string; x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bubblesRef = useRef(bubbles);

  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  useEffect(() => {
    // On unmount, don't clear bubbles immediately - let them finish
    return () => {
      const currentBubbles = bubblesRef.current;
      // Keep bubbles alive for animation duration
      setTimeout(() => {
        setBubbles([]);
      }, 1000);
    };
  }, []);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const id = `bubble-${Date.now()}`;
      setBubbles((prev) => [
        ...prev,
        { id, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      ]);

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== id));
      }, 1000);
    }
    onDisappear();
  };

  return (
    <>
      {typeof document !== "undefined" &&
        bubbles.map((bubble) =>
          ReactDOM.createPortal(
            <BubbleSet key={bubble.id} x={bubble.x} y={bubble.y} color="#8b7355" />,
            document.body
          )
        )}
      <Button ref={buttonRef} onClick={handleClick} variant="outline">
        Pattern 2: Portal Delayed
      </Button>
    </>
  );
}

// ============================================================
// PATTERN 3: Parent State Hoisting
// ============================================================
function Pattern3Container() {
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
        <Pattern3Button onClick={handleButtonClick} />
      ) : (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing...
        </div>
      )}
    </>
  );
}

function Pattern3Button({
  onClick,
}: {
  onClick: (x: number, y: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      onClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  };

  return (
    <Button ref={buttonRef} onClick={handleClick} variant="outline">
      Pattern 3: State Hoisting
    </Button>
  );
}

// ============================================================
// PATTERN 4: Ref-based (No State)
// ============================================================
function Pattern4Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create a persistent container that outlives the component
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.pointerEvents = "none";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
    containerRef.current = container;

    return () => {
      // Delay cleanup to allow animations to finish
      setTimeout(() => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 1000);
    };
  }, []);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const container = containerRef.current;

    if (rect && container) {
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      // Create bubble elements directly in DOM
      for (let i = 0; i < 9; i++) {
        const bubble = document.createElement("div");
        const size = 10 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 30;

        bubble.style.position = "absolute";
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.borderRadius = "50%";
        bubble.style.backgroundColor = "#8b7355";
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.style.transition = "all 0.75s ease-out";

        container.appendChild(bubble);

        requestAnimationFrame(() => {
          bubble.style.transform = `translate(${Math.cos(angle) * distance}px, ${
            Math.sin(angle) * distance
          }px) scale(0.1)`;
          bubble.style.opacity = "0";
        });

        setTimeout(() => {
          if (bubble.parentNode) {
            bubble.parentNode.removeChild(bubble);
          }
        }, 750);
      }
    }

    onDisappear();
  };

  return (
    <Button ref={buttonRef} onClick={handleClick} variant="outline">
      Pattern 4: Ref-based
    </Button>
  );
}

// ============================================================
// PATTERN 5: CSS-only with Data Attributes
// ============================================================
function Pattern5Container() {
  const [show, setShow] = useState(true);
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [animationPos, setAnimationPos] = useState({ x: 0, y: 0 });

  const handleButtonClick = (x: number, y: number) => {
    setAnimationPos({ x, y });
    setTriggerAnimation(true);
    setTimeout(() => setTriggerAnimation(false), 1000);

    setShow(false);
    setTimeout(() => setShow(true), 4000);
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        data-animating={triggerAnimation}
        style={
          {
            "--anim-x": `${animationPos.x}px`,
            "--anim-y": `${animationPos.y}px`,
          } as React.CSSProperties
        }
      >
        {triggerAnimation && (
          <div className="pattern5-bubbles">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="pattern5-bubble" />
            ))}
          </div>
        )}
      </div>
      {show ? (
        <Pattern5Button onClick={handleButtonClick} />
      ) : (
        <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
          Reappearing...
        </div>
      )}
    </>
  );
}

function Pattern5Button({
  onClick,
}: {
  onClick: (x: number, y: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      onClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  };

  return (
    <Button ref={buttonRef} onClick={handleClick} variant="outline">
      Pattern 5: CSS-only
    </Button>
  );
}

// ============================================================
// Shared Bubble Animation Component
// ============================================================
function BubbleSet({ x, y, color }: { x: number; y: number; color: string }) {
  const bubbles = Array.from({ length: 9 }).map(() => ({
    size: 10 + Math.random() * 10,
    angle: Math.random() * Math.PI * 2,
    distance: 50 + Math.random() * 30,
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
              backgroundColor: color,
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
// Main Test Page
// ============================================================
export default function ButtonTest() {
  const [show1, setShow1] = useState(true);
  const [show2, setShow2] = useState(true);
  const [show4, setShow4] = useState(true);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <style>{`
        .pattern5-bubbles {
          position: fixed;
          left: var(--anim-x);
          top: var(--anim-y);
        }

        .pattern5-bubble {
          position: absolute;
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background-color: #8b7355;
          animation: pattern5-bubble-anim 0.75s ease-out forwards;
        }

        .pattern5-bubble:nth-child(1) { animation-delay: 0s; --bubble-angle: 0deg; }
        .pattern5-bubble:nth-child(2) { animation-delay: 0s; --bubble-angle: 45deg; }
        .pattern5-bubble:nth-child(3) { animation-delay: 0s; --bubble-angle: 90deg; }
        .pattern5-bubble:nth-child(4) { animation-delay: 0s; --bubble-angle: 135deg; }
        .pattern5-bubble:nth-child(5) { animation-delay: 0s; --bubble-angle: 180deg; }
        .pattern5-bubble:nth-child(6) { animation-delay: 0s; --bubble-angle: 225deg; }
        .pattern5-bubble:nth-child(7) { animation-delay: 0s; --bubble-angle: 270deg; }
        .pattern5-bubble:nth-child(8) { animation-delay: 0s; --bubble-angle: 315deg; }
        .pattern5-bubble:nth-child(9) { animation-delay: 0s; --bubble-angle: 360deg; }

        @keyframes pattern5-bubble-anim {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(
              calc(cos(var(--bubble-angle)) * 60px),
              calc(sin(var(--bubble-angle)) * 60px)
            ) scale(0.1);
          }
        }
      `}</style>

      <h1 className="text-2xl font-bold text-foreground mb-4">
        5 Animation Patterns for Disappearing Buttons
      </h1>

      <GlobalAnimationRenderer />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Pattern 1 */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Pattern 1: Global Manager</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Singleton service manages animations independently
          </p>
          {show1 ? (
            <Pattern1Button onDisappear={() => {
              setShow1(false);
              setTimeout(() => setShow1(true), 4000);
            }} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 2 */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Pattern 2: Portal Delayed</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Portal with delayed cleanup in unmount
          </p>
          {show2 ? (
            <Pattern2Button onDisappear={() => {
              setShow2(false);
              setTimeout(() => setShow2(true), 4000);
            }} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 3 */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Pattern 3: State Hoisting</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Parent component manages animation state
          </p>
          <Pattern3Container />
        </div>

        {/* Pattern 4 */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Pattern 4: Ref-based</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Direct DOM manipulation with refs
          </p>
          {show4 ? (
            <Pattern4Button onDisappear={() => {
              setShow4(false);
              setTimeout(() => setShow4(true), 4000);
            }} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 5 */}
        <div className="border rounded-lg p-4 text-center col-span-1 md:col-span-2">
          <h3 className="text-sm font-semibold mb-2">Pattern 5: CSS-only</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Pure CSS animations with data attributes
          </p>
          <Pattern5Container />
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-2xl text-center space-y-2">
        <p className="font-semibold">Each button disappears for 4 seconds but animations continue!</p>
        <p><strong>Pattern 1:</strong> Best for global animations across the app</p>
        <p><strong>Pattern 2:</strong> Good for component-scoped animations</p>
        <p><strong>Pattern 3:</strong> Best when parent lifecycle is stable</p>
        <p><strong>Pattern 4:</strong> Best for performance-critical animations</p>
        <p><strong>Pattern 5:</strong> Best for simple, declarative animations</p>
      </div>
    </div>
  );
}