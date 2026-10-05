import { afterEach, describe, expect, it, vi } from "vitest";
import { audioManager, EVENT_AMBIENCE_FADE_SECONDS } from "./audio";

describe("background music resume after an event dialog", () => {
  afterEach(() => {
    audioManager.stopEventAmbience("eventDialog", 0);
    audioManager.stopAllSounds();
    audioManager.musicMute(false, { resume: false });
    vi.restoreAllMocks();
  });

  it("waits until the event bed stops before bringing background music back", () => {
    const play = vi
      .spyOn(audioManager as unknown as { playLoopingSound: () => void }, "playLoopingSound")
      .mockImplementation(() => {});

    audioManager.musicMute(false, { resume: false });
    audioManager.startBackgroundMusic(0.3);
    audioManager.startEventAmbience("eventDialog", 0.35, 0);
    play.mockClear();

    expect(audioManager.isEventAmbienceActive()).toBe(true);
    expect(audioManager.tryResumeAfterSimulationPause()).toBe(false);
    expect(play).not.toHaveBeenCalled();

    audioManager.stopEventAmbience("eventDialog", 0);

    expect(audioManager.tryResumeAfterSimulationPause()).toBe(true);
    expect(play).toHaveBeenCalledWith(
      "backgroundMusic",
      0.3,
      false,
      EVENT_AMBIENCE_FADE_SECONDS,
    );
  });
});
