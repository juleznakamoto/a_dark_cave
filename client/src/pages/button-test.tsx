
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ReactDOM from "react-dom";

// ============================================
// PATTERN 1: Portal with External State Manager
// ============================================
interface Bubble {
  id: string;
  startX: number;
  startY: number;
  timestamp: number;
}

class BubbleManager {
  private static instance: BubbleManager;
  private bubbles: Map<string, Bubble> = new Map();
  private listeners: Set<() => void> = new Set();

  static getInstance() {
    if (!BubbleManager.instance) {
      BubbleManager.instance = new BubbleManager();
    }
    return BubbleManager.instance;
  }

  addBubble(bubble: Bubble) {
    this.bubbles.set(bubble.id, bubble);
    this.notify();

    setTimeout(() => {
      this.bubbles.delete(bubble.id);
      this.notify();
    }, 1000);
  }

  getBubbles() {
    return Array.from(this.bubbles.values());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function Pattern1Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    const manager = BubbleManager.getInstance();
    return manager.subscribe(() => {
      setBubbles(manager.getBubbles());
    });
  }, []);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const bubble: Bubble = {
      id: `bubble-${Date.now()}`,
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      timestamp: Date.now(),
    };

    BubbleManager.getInstance().addBubble(bubble);
    onDisappear();
  };

  return (
    <>
      {typeof document !== "undefined" &&
        bubbles.map((bubble) =>
          ReactDOM.createPortal(
            <motion.div
              key={bubble.id}
              className="fixed w-12 h-12 rounded-full bg-red-500"
              style={{ left: bubble.startX, top: bubble.startY, zIndex: 9999 }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 3, y: -100 }}
              transition={{ duration: 1 }}
            />,
            document.body
          )
        )}
      <Button ref={buttonRef} onClick={handleClick}>
        Pattern 1: External Manager
      </Button>
    </>
  );
}

// ============================================
// PATTERN 2: CSS Animations with Animation Events
// ============================================
function Pattern2Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const bubble = document.createElement("div");
    bubble.className = "pattern2-bubble";
    bubble.style.left = `${rect.left + rect.width / 2}px`;
    bubble.style.top = `${rect.top + rect.height / 2}px`;
    document.body.appendChild(bubble);

    bubble.addEventListener("animationend", () => {
      bubble.remove();
    });

    onDisappear();
  };

  return (
    <>
      <style>{`
        .pattern2-bubble {
          position: fixed;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #3b82f6;
          z-index: 9999;
          pointer-events: none;
          animation: pattern2-float 1s ease-out forwards;
        }
        @keyframes pattern2-float {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150px) scale(3); }
        }
      `}</style>
      <Button ref={buttonRef} onClick={handleClick}>
        Pattern 2: CSS Animation Events
      </Button>
    </>
  );
}

// ============================================
// PATTERN 3: Global Animation Queue
// ============================================
interface QueuedAnimation {
  id: string;
  element: JSX.Element;
}

class AnimationQueue {
  private static instance: AnimationQueue;
  private queue: Map<string, QueuedAnimation> = new Map();
  private listeners: Set<() => void> = new Set();

  static getInstance() {
    if (!AnimationQueue.instance) {
      AnimationQueue.instance = new AnimationQueue();
    }
    return AnimationQueue.instance;
  }

  enqueue(animation: QueuedAnimation, duration: number) {
    this.queue.set(animation.id, animation);
    this.notify();

    setTimeout(() => {
      this.queue.delete(animation.id);
      this.notify();
    }, duration);
  }

  getAnimations() {
    return Array.from(this.queue.values());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

function AnimationQueueRenderer() {
  const [animations, setAnimations] = useState<QueuedAnimation[]>([]);

  useEffect(() => {
    const queue = AnimationQueue.getInstance();
    return queue.subscribe(() => {
      setAnimations(queue.getAnimations());
    });
  }, []);

  return (
    <>
      {typeof document !== "undefined" &&
        animations.map((anim) =>
          ReactDOM.createPortal(anim.element, document.body)
        )}
    </>
  );
}

function Pattern3Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const id = `anim-${Date.now()}`;
    const animation: QueuedAnimation = {
      id,
      element: (
        <motion.div
          key={id}
          className="fixed w-12 h-12 rounded-full bg-green-500"
          style={{
            left: rect.left + rect.width / 2,
            top: rect.top + rect.height / 2,
            zIndex: 9999,
          }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 3, x: 100 }}
          transition={{ duration: 1 }}
        />
      ),
    };

    AnimationQueue.getInstance().enqueue(animation, 1000);
    onDisappear();
  };

  return (
    <Button ref={buttonRef} onClick={handleClick}>
      Pattern 3: Global Queue
    </Button>
  );
}

// ============================================
// PATTERN 4: React Transition Group (AnimatePresence)
// ============================================
function Pattern4Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [activeAnimations, setActiveAnimations] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newAnim = {
      id: `anim-${Date.now()}`,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setActiveAnimations((prev) => [...prev, newAnim]);

    setTimeout(() => {
      setActiveAnimations((prev) => prev.filter((a) => a.id !== newAnim.id));
    }, 1000);

    onDisappear();
  };

  return (
    <>
      {typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <AnimatePresence>
            {activeAnimations.map((anim) => (
              <motion.div
                key={anim.id}
                className="fixed w-12 h-12 rounded-full bg-purple-500"
                style={{ left: anim.x, top: anim.y, zIndex: 9999 }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 3, y: 100 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            ))}
          </AnimatePresence>,
          document.body
        )}
      <Button ref={buttonRef} onClick={handleClick}>
        Pattern 4: AnimatePresence
      </Button>
    </>
  );
}

// ============================================
// PATTERN 5: Delayed Unmount Pattern
// ============================================
function Pattern5Button({ onDisappear }: { onDisappear: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });

  const handleClick = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    setBubblePos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setIsAnimating(true);

    // Delay the actual unmount
    setTimeout(() => {
      setShouldRender(false);
      setTimeout(() => {
        onDisappear();
        // Reset for reappearance
        setTimeout(() => {
          setShouldRender(true);
          setIsAnimating(false);
        }, 3000);
      }, 1000);
    }, 0);
  };

  if (!shouldRender) {
    return (
      <>
        {typeof document !== "undefined" &&
          isAnimating &&
          ReactDOM.createPortal(
            <motion.div
              className="fixed w-12 h-12 rounded-full bg-yellow-500"
              style={{ left: bubblePos.x, top: bubblePos.y, zIndex: 9999 }}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0, scale: 3, x: -100 }}
              transition={{ duration: 1 }}
            />,
            document.body
          )}
        <div className="h-10 flex items-center justify-center text-muted-foreground text-sm">
          Reappearing...
        </div>
      </>
    );
  }

  return (
    <>
      {typeof document !== "undefined" &&
        isAnimating &&
        ReactDOM.createPortal(
          <motion.div
            className="fixed w-12 h-12 rounded-full bg-yellow-500"
            style={{ left: bubblePos.x, top: bubblePos.y, zIndex: 9999 }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 3, x: -100 }}
            transition={{ duration: 1 }}
          />,
          document.body
        )}
      <Button ref={buttonRef} onClick={handleClick}>
        Pattern 5: Delayed Unmount
      </Button>
    </>
  );
}

// ============================================
// MAIN TEST PAGE
// ============================================
export default function ButtonTest() {
  const [showButtons, setShowButtons] = useState([true, true, true, true, true]);

  const handleDisappear = (index: number) => {
    setShowButtons((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });

    setTimeout(() => {
      setShowButtons((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <AnimationQueueRenderer />

      <h1 className="text-2xl font-bold text-foreground mb-4">
        5 Animation Patterns for Disappearing Buttons
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
        {/* Pattern 1 */}
        <div className="text-center p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground mb-3 h-12">
            External state manager keeps animations alive
          </p>
          {showButtons[0] ? (
            <Pattern1Button onDisappear={() => handleDisappear(0)} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-sm">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 2 */}
        <div className="text-center p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground mb-3 h-12">
            Pure CSS animations complete independently
          </p>
          {showButtons[1] ? (
            <Pattern2Button onDisappear={() => handleDisappear(1)} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-sm">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 3 */}
        <div className="text-center p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground mb-3 h-12">
            Global singleton manages all animations
          </p>
          {showButtons[2] ? (
            <Pattern3Button onDisappear={() => handleDisappear(2)} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-sm">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 4 */}
        <div className="text-center p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground mb-3 h-12">
            AnimatePresence handles exit animations
          </p>
          {showButtons[3] ? (
            <Pattern4Button onDisappear={() => handleDisappear(3)} />
          ) : (
            <div className="h-10 flex items-center justify-center text-muted-foreground text-sm">
              Reappearing...
            </div>
          )}
        </div>

        {/* Pattern 5 */}
        <div className="text-center p-4 border rounded-lg">
          <p className="text-xs text-muted-foreground mb-3 h-12">
            Component stays mounted during animation
          </p>
          <Pattern5Button onDisappear={() => handleDisappear(4)} />
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-2xl">
        <p className="mb-2 font-semibold">Pattern Comparison:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Pattern 1:</strong> Best for complex animations with shared state</li>
          <li><strong>Pattern 2:</strong> Most performant, works without React</li>
          <li><strong>Pattern 3:</strong> Best for centralized animation control</li>
          <li><strong>Pattern 4:</strong> Built-in Framer Motion solution</li>
          <li><strong>Pattern 5:</strong> Simplest but keeps DOM nodes longer</li>
        </ul>
      </div>
    </div>
  );
}
