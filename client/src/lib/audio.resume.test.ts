import { afterEach, describe, expect, it, vi } from "vitest";
import { audioManager, EVENT_AMBIENCE_FADE_SECONDS, SOUND_VOLUME } from "./audio";

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

describe("settings volume controls", () => {
  afterEach(() => {
    audioManager.stopAllSounds();
    audioManager.musicMute(false, { resume: false });
    audioManager.sfxMute(false);
    audioManager.setMusicVolume(1);
    audioManager.setSfxVolume(1);
    vi.restoreAllMocks();
  });

  it("fades background music out on a normal simulation pause", () => {
    vi.spyOn(
      audioManager as unknown as { isSoundPlaying: () => boolean },
      "isSoundPlaying",
    ).mockReturnValue(true);
    const stop = vi
      .spyOn(audioManager, "stopLoopingSound")
      .mockImplementation(() => {});

    audioManager.pauseForSimulation(2);

    expect(stop).toHaveBeenCalledWith("backgroundMusic", 2);
  });

  it("leaves background music playing when settings is the only freeze", () => {
    vi.spyOn(
      audioManager as unknown as { isSoundPlaying: (name: string) => boolean },
      "isSoundPlaying",
    ).mockImplementation((name) => name === "backgroundMusic");
    const stop = vi
      .spyOn(audioManager, "stopLoopingSound")
      .mockImplementation(() => {});

    audioManager.pauseForSimulation(2, { keepBackgroundMusic: true });

    expect(stop).not.toHaveBeenCalled();
  });

  it("does not restart background music that is already at the slider volume", async () => {
    vi.spyOn(
      audioManager as unknown as { isSoundPlaying: () => boolean },
      "isSoundPlaying",
    ).mockReturnValue(true);
    vi.spyOn(
      audioManager as unknown as { getCurrentVolume: () => number },
      "getCurrentVolume",
    ).mockReturnValue(0.3);
    const play = vi
      .spyOn(
        audioManager as unknown as { playLoopingSound: () => void },
        "playLoopingSound",
      )
      .mockImplementation(() => {});

    await audioManager.startBackgroundMusic(0.3);
    play.mockClear();
    await audioManager.resumeSounds(2);

    expect(play).not.toHaveBeenCalled();
  });

  it("plays one hunt snap for the SFX slider and does not stack it", async () => {
    const sounds = (
      audioManager as unknown as { sounds: Map<string, unknown> }
    ).sounds;
    sounds.delete("hunt");
    (
      audioManager as unknown as { sfxPreviewPending: boolean }
    ).sfxPreviewPending = false;

    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});
    const load = vi.spyOn(audioManager, "loadSound").mockResolvedValue();
    audioManager.setSfxVolume(0.5);

    audioManager.previewSfxVolume();
    audioManager.previewSfxVolume();

    expect(load).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith("hunt", SOUND_VOLUME.hunt);

    play.mockClear();
    vi.spyOn(
      audioManager as unknown as { isSoundPlaying: () => boolean },
      "isSoundPlaying",
    ).mockReturnValue(true);
    audioManager.previewSfxVolume();
    expect(play).not.toHaveBeenCalled();
  });
});
