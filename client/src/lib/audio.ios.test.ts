// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { Howler } from "howler";
import { audioManager } from "./audio";

describe("iOS playback", () => {
  const originalUa = navigator.userAgent;

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => originalUa,
    });
    Reflect.deleteProperty(navigator, "audioSession");
  });

  function stubIphone(): { type: string } {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)",
    });
    const audioSession = { type: "auto" };
    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      value: audioSession,
    });
    return audioSession;
  }

  it("does not let Howler unload every sound on the first tap", () => {
    expect(
      (Howler as { _mobileUnloaded?: boolean })._mobileUnloaded,
    ).toBe(true);
  });

  it("sets the audio session to playback before a sound starts", () => {
    const audioSession = stubIphone();

    audioManager.playSound("not-loaded", 1, false);

    expect(audioSession.type).toBe("playback");
  });

  it("leaves the audio session alone off iPhone", () => {
    const audioSession = { type: "auto" };
    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      value: audioSession,
    });

    audioManager.playSound("not-loaded", 1, false);

    expect(audioSession.type).toBe("auto");
  });
});
