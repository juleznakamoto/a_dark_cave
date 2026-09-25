// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  START_AUDIO_CHOICE_KEY,
  isMakeFireTarget,
  isStartAudioGesture,
  isStartAudioToggleTarget,
  startAudioForVisit,
  writeStartAudioChoice,
} from "./startScreenAudioChoice";

describe("startAudioForVisit", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts a first visit with music and sound effects off", () => {
    expect(startAudioForVisit(null)).toEqual({
      musicMuted: true,
      sfxMuted: true,
    });
  });

  it("starts a Steam first visit with music and sound effects on", () => {
    expect(
      startAudioForVisit(null, { musicMuted: false, sfxMuted: false }),
    ).toEqual({
      musicMuted: false,
      sfxMuted: false,
    });
  });

  it("keeps a stored Steam choice over the on default", () => {
    writeStartAudioChoice({ musicMuted: true, sfxMuted: true });

    expect(
      startAudioForVisit(null, { musicMuted: false, sfxMuted: false }),
    ).toEqual({
      musicMuted: true,
      sfxMuted: true,
    });
  });

  it("keeps a choice from an earlier visit when there is no save", () => {
    writeStartAudioChoice({ musicMuted: false, sfxMuted: true });

    expect(startAudioForVisit(null)).toEqual({
      musicMuted: false,
      sfxMuted: true,
    });
    expect(localStorage.getItem(START_AUDIO_CHOICE_KEY)).toContain(
      '"sfxMuted":true',
    );
  });

  it("uses the save header instead of a stored choice", () => {
    writeStartAudioChoice({ musicMuted: false, sfxMuted: false });

    expect(
      startAudioForVisit({ musicMuted: true, sfxMuted: false }),
    ).toEqual({
      musicMuted: true,
      sfxMuted: false,
    });
  });
});

describe("start-screen audio gestures", () => {
  it("accepts a mouse press, click, tap end, and key", () => {
    const mouseDown = new PointerEvent("pointerdown", { pointerType: "mouse" });
    const touchDown = new PointerEvent("pointerdown", { pointerType: "touch" });
    const key = new KeyboardEvent("keydown", { key: "a" });

    expect(isStartAudioGesture(mouseDown)).toBe(true);
    expect(isStartAudioGesture(touchDown)).toBe(false);
    expect(isStartAudioGesture(new Event("click"))).toBe(true);
    expect(isStartAudioGesture(new Event("touchend"))).toBe(true);
    expect(isStartAudioGesture(key)).toBe(true);
    expect(isStartAudioGesture(new Event("mousemove"))).toBe(false);
    expect(isStartAudioGesture(new Event("touchstart"))).toBe(false);
    expect(
      isStartAudioGesture(new KeyboardEvent("keydown", { key: "a", repeat: true })),
    ).toBe(false);
    expect(
      isStartAudioGesture(new KeyboardEvent("keydown", { key: "a", metaKey: true })),
    ).toBe(false);
  });

  it("leaves the footer switches to their own clicks", () => {
    document.body.innerHTML = `
      <button data-testid="button-start-toggle-sfx"><span id="sfx-icon"></span></button>
      <button data-testid="button-make-fire"></button>
    `;

    expect(isStartAudioToggleTarget(document.getElementById("sfx-icon"))).toBe(
      true,
    );
    expect(isMakeFireTarget(document.querySelector("[data-testid='button-make-fire']"))).toBe(
      true,
    );
    expect(isStartAudioToggleTarget(document.body)).toBe(false);
  });
});
