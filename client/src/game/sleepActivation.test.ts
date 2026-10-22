import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useGameStore } from "./state";
import { buildDevSave } from "./devSaves";
import * as saveModule from "./save";
import {
  beginSleepMode,
  canActivateSleep,
  isEstateUnlocked,
  shouldAutoSleepOnInactivity,
} from "./sleepActivation";
import { handleInactivity, startGameLoop, stopGameLoop } from "./loop";

describe("sleepActivation", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
    vi.spyOn(saveModule, "saveGame").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    stopGameLoop();
    vi.restoreAllMocks();
  });

  it("treats Dark Estate as estate unlock", () => {
    expect(isEstateUnlocked(buildDevSave("village"))).toBe(false);
    expect(isEstateUnlocked(buildDevSave("sleep-unlocked"))).toBe(true);
  });

  it("requires wood and food production for sleep", () => {
    expect(canActivateSleep(buildDevSave("village"))).toBe(true);
    expect(canActivateSleep(buildDevSave("fresh-start"))).toBe(false);
  });

  it("auto-sleeps on AFK only with estate + sleep prereqs", () => {
    expect(shouldAutoSleepOnInactivity(buildDevSave("sleep-unlocked"))).toBe(
      true,
    );
    expect(shouldAutoSleepOnInactivity(buildDevSave("village"))).toBe(false);
    expect(shouldAutoSleepOnInactivity(buildDevSave("fresh-start"))).toBe(
      false,
    );
  });

  it("beginSleepMode opens the sleep dialog and persists a session", async () => {
    useGameStore.getState().initialize(buildDevSave("sleep-unlocked"));

    const started = await beginSleepMode();

    expect(started).toBe(true);
    const state = useGameStore.getState();
    expect(state.idleModeDialog.isOpen).toBe(true);
    expect(state.idleModeState.isActive).toBe(true);
    expect(state.idleModeState.startTime).toBeGreaterThan(0);
    expect(state.inactivityDialogOpen).toBe(false);
    expect(saveModule.saveGame).toHaveBeenCalled();
  });
});

describe("handleInactivity auto-sleep", () => {
  beforeEach(() => {
    const listenerTarget = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", listenerTarget);
    vi.stubGlobal("document", listenerTarget);
    vi.stubGlobal("performance", { now: () => Date.now() });
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
    useGameStore.getState().initialize();
    vi.spyOn(saveModule, "saveGame").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    stopGameLoop();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts sleep instead of the inactivity dialog when estate + sleep ready", async () => {
    useGameStore.getState().initialize(buildDevSave("sleep-unlocked"));
    startGameLoop();

    await handleInactivity();

    const state = useGameStore.getState();
    expect(state.idleModeDialog.isOpen).toBe(true);
    expect(state.idleModeState.isActive).toBe(true);
    expect(state.inactivityDialogOpen).toBe(false);
    expect(state.isGameLoopActive).toBe(true);
  });

  it("shows the inactivity dialog when estate is not unlocked", async () => {
    useGameStore.getState().initialize(buildDevSave("village"));
    startGameLoop();

    await handleInactivity();

    const state = useGameStore.getState();
    expect(state.inactivityDialogOpen).toBe(true);
    expect(state.inactivityReason).toBe("timeout");
    expect(state.idleModeDialog.isOpen).toBe(false);
    expect(state.isGameLoopActive).toBe(false);
  });

  it("shows the inactivity dialog when sleep production prereqs fail", async () => {
    useGameStore.getState().initialize(buildDevSave("sleep-unlocked"));
    useGameStore.setState({
      villagers: {
        ...useGameStore.getState().villagers,
        gatherer: 0,
        hunter: 0,
        free: 3,
      },
    });
    expect(canActivateSleep(useGameStore.getState())).toBe(false);
    startGameLoop();

    await handleInactivity();

    const state = useGameStore.getState();
    expect(state.inactivityDialogOpen).toBe(true);
    expect(state.idleModeDialog.isOpen).toBe(false);
  });
});
