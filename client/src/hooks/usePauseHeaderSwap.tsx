import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PAUSE_UI_FADE_MS, pauseUiDurationMs } from "@/hooks/useFadePresence";

export type PauseHeaderFade = { mounted: boolean; visible: boolean };

type PauseHeaderSwap = {
  effects: PauseHeaderFade;
  chrome: PauseHeaderFade;
};

type Resident = "effects" | "chrome";

const PauseHeaderSwapContext = createContext<PauseHeaderSwap | null>(null);

/**
 * Manual pause: header status marks fade out, then the play-time and pact
 * choices fade in. Resume reverses that so the two groups do not overlap.
 * `holdMs` is how long the outgoing group stays up (0 when nothing is showing).
 */
export function usePauseHeaderSwap(
  paused: boolean,
  holdMs = PAUSE_UI_FADE_MS,
): PauseHeaderSwap {
  const [resident, setResident] = useState<Resident>(paused ? "chrome" : "effects");
  const [visible, setVisible] = useState(true);
  const holdRef = useRef(holdMs);
  const visibleRef = useRef(visible);
  holdRef.current = holdMs;
  visibleRef.current = visible;

  useEffect(() => {
    const next: Resident = paused ? "chrome" : "effects";
    if (resident !== next) {
      setVisible(false);
      // Empty status row: show the timer immediately. Leaving the timer always
      // waits out its fade, even when no status marks will come back.
      const wait = resident === "effects" ? holdRef.current : PAUSE_UI_FADE_MS;
      const id = window.setTimeout(
        () => setResident(next),
        pauseUiDurationMs(wait),
      );
      return () => window.clearTimeout(id);
    }
    if (visibleRef.current) return;
    // Two frames so the opacity-0 paint lands before the fade to 1.
    // setTimeout(0) can run before that paint, and the icons then pop in.
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      window.cancelAnimationFrame(outer);
      window.cancelAnimationFrame(inner);
    };
  }, [paused, resident]);

  return {
    effects: {
      mounted: resident === "effects",
      visible: resident === "effects" && visible,
    },
    chrome: {
      mounted: resident === "chrome",
      visible: resident === "chrome" && visible,
    },
  };
}

export function PauseHeaderSwapProvider({
  value,
  children,
}: {
  value: PauseHeaderSwap;
  children: ReactNode;
}) {
  return (
    <PauseHeaderSwapContext.Provider value={value}>
      {children}
    </PauseHeaderSwapContext.Provider>
  );
}

/** Play time and pact choices. Hidden while the game is running. */
export function usePauseHeaderChrome(): PauseHeaderFade {
  const swap = useContext(PauseHeaderSwapContext);
  return swap?.chrome ?? { mounted: false, visible: false };
}
