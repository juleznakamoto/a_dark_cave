import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
} from "react";

/** Ignore leftover / accidental clicks when a dialog first appears. */
export const DIALOG_OPEN_CLICK_LOCK_MS = 800;

const ACTIVATION_KEYS = new Set(["Enter", " ", "Escape"]);

/**
 * Blocks pointer activation and Enter/Space/Escape for `durationMs` after mount
 * or `resetKey` change. After the timer, also swallows the rest of a press that
 * started while the dialog was still locked.
 */
export function useDialogOpenClickLock(
  durationMs: number = DIALOG_OPEN_CLICK_LOCK_MS,
  resetKey?: string | number,
) {
  const [lockActive, setLockActive] = useState(durationMs > 0);
  const pointerDownDuringLockRef = useRef(false);

  useEffect(() => {
    pointerDownDuringLockRef.current = false;
    if (durationMs <= 0) {
      setLockActive(false);
      return;
    }
    setLockActive(true);
    const id = window.setTimeout(() => setLockActive(false), durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs, resetKey]);

  const lockEnabled = durationMs > 0;

  const onActivationCapture = useCallback(
    (event: SyntheticEvent) => {
      if (!lockEnabled) return;
      if (lockActive) {
        if (event.type === "pointerdown") {
          pointerDownDuringLockRef.current = true;
        }
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.type === "pointerdown") {
        pointerDownDuringLockRef.current = false;
        return;
      }
      // Completing a press that started while the dialog was still locked.
      if (pointerDownDuringLockRef.current) {
        event.preventDefault();
        event.stopPropagation();
        if (event.type === "click") pointerDownDuringLockRef.current = false;
      }
    },
    [lockActive, lockEnabled],
  );

  const onKeyDownCapture = useCallback(
    (event: ReactKeyboardEvent) => {
      if (!lockEnabled || !lockActive) return;
      if (ACTIVATION_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [lockActive, lockEnabled],
  );

  const preventDismiss = useCallback(
    (event: { preventDefault: () => void }) => {
      if (lockEnabled && lockActive) event.preventDefault();
    },
    [lockActive, lockEnabled],
  );

  return { lockActive, onActivationCapture, onKeyDownCapture, preventDismiss };
}
