/** Browser memory of the title-screen music and sound-effects switches. */
export const START_AUDIO_CHOICE_KEY = "adc-start-audio";

export interface StartAudioChoice {
  musicMuted: boolean;
  sfxMuted: boolean;
}

export interface StartAudioVisit {
  musicMuted: boolean;
  sfxMuted: boolean;
}

export function parseStartAudioChoice(raw: string | null): StartAudioChoice | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StartAudioChoice>;
    if (
      typeof value.musicMuted !== "boolean" ||
      typeof value.sfxMuted !== "boolean"
    ) {
      return null;
    }
    return { musicMuted: value.musicMuted, sfxMuted: value.sfxMuted };
  } catch {
    return null;
  }
}

export function readStartAudioChoice(): StartAudioChoice | null {
  try {
    return parseStartAudioChoice(localStorage.getItem(START_AUDIO_CHOICE_KEY));
  } catch {
    return null;
  }
}

export function writeStartAudioChoice(choice: StartAudioChoice): void {
  try {
    localStorage.setItem(START_AUDIO_CHOICE_KEY, JSON.stringify(choice));
  } catch {
    // Private mode or a full disk: this visit still uses the in-memory switches.
  }
}

/**
 * A save header wins. Otherwise a choice stored on an earlier visit wins.
 * Neither means this install has not chosen yet: the browser starts off,
 * and Steam starts on.
 */
export function startAudioForVisit(
  header: StartAudioChoice | null,
  firstVisit: StartAudioVisit = { musicMuted: true, sfxMuted: true },
): StartAudioVisit {
  if (header) {
    return {
      musicMuted: header.musicMuted,
      sfxMuted: header.sfxMuted,
    };
  }
  const choice = readStartAudioChoice();
  if (choice) return choice;
  return firstVisit;
}

const START_AUDIO_TOGGLE_TEST_IDS = [
  "button-start-toggle-sfx",
  "button-start-toggle-music",
] as const;

export function isStartAudioToggleTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return START_AUDIO_TOGGLE_TEST_IDS.some((testId) =>
    Boolean(target.closest(`[data-testid="${testId}"]`)),
  );
}

export function isMakeFireTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest('[data-testid="button-make-fire"]'))
  );
}

/** Press or key. A mouse move is not permission to play audio. */
export function isStartAudioGesture(event: Event): boolean {
  if (event.type === "keydown") {
    const key = event as KeyboardEvent;
    return !key.metaKey && !key.ctrlKey && !key.altKey && !key.repeat;
  }
  if (event.type === "pointerdown") {
    return (event as PointerEvent).pointerType === "mouse";
  }
  return event.type === "click" || event.type === "touchend";
}
