import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import {
  VOLUME_SLIDER,
  settingsVolumeThumbWidthPx,
  volumeFromClientX,
} from "@/components/game/volumeSlider";

function capturePointer(target: HTMLElement, pointerId: number): void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Moves that stay on the hit target still update the volume.
  }
}

function releasePointer(target: HTMLElement, pointerId: number): void {
  try {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  } catch {
    // Capture was already released.
  }
}

interface SettingsVolumeSliderProps {
  /** Accessible name. Same string the mute control uses. */
  label: string;
  muted: boolean;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

/**
 * Ambience and sound in Settings.
 *
 * A native iOS range stops tracking when the finger drifts off its short
 * box. The drag is handled here: pointer capture keeps the gesture, and
 * only the horizontal position sets the volume, so moving up and down
 * while sliding does not freeze the knob.
 */
export default function SettingsVolumeSlider({
  label,
  muted,
  volume,
  onVolumeChange,
}: SettingsVolumeSliderProps) {
  const hitRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const shown = muted ? 0 : volume;
  const lastSentRef = useRef(shown);

  useEffect(() => {
    lastSentRef.current = shown;
  }, [shown]);

  useEffect(() => {
    const hit = hitRef.current;
    if (!hit) return;
    const blockScroll = (event: TouchEvent) => {
      event.preventDefault();
    };
    hit.addEventListener("touchmove", blockScroll, { passive: false });
    return () => hit.removeEventListener("touchmove", blockScroll);
  }, []);

  const applyPointer = (clientX: number) => {
    const input = inputRef.current;
    if (!input || muted) return;
    const rect = input.getBoundingClientRect();
    const next = volumeFromClientX(
      clientX,
      rect.left,
      rect.width,
      settingsVolumeThumbWidthPx(),
    );
    if (next === lastSentRef.current) return;
    lastSentRef.current = next;
    onVolumeChange(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (muted || event.button !== 0) return;
    pointerIdRef.current = event.pointerId;
    capturePointer(event.currentTarget, event.pointerId);
    // Focusing during a touch makes iOS cancel the gesture. Mouse and pen
    // can focus so the arrow keys keep working after a click.
    if (event.pointerType !== "touch") {
      inputRef.current?.focus({ preventScroll: true });
    }
    applyPointer(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    applyPointer(event.clientX);
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    releasePointer(event.currentTarget, event.pointerId);
  };

  return (
    <div
      ref={hitRef}
      className={`flex min-h-11 w-full touch-none select-none items-center ${muted ? "cursor-not-allowed" : "cursor-pointer"}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={shown}
        disabled={muted}
        aria-label={label}
        tabIndex={muted ? -1 : 0}
        style={{ "--slider-fill": `${shown * 100}%` } as CSSProperties}
        onChange={(event) => {
          if (muted) return;
          const next = Number(event.target.value);
          lastSentRef.current = next;
          onVolumeChange(next);
        }}
        className={`pointer-events-none ${VOLUME_SLIDER} ${muted ? "opacity-40" : ""}`}
      />
    </div>
  );
}
