import { beforeEach, describe, expect, it } from "vitest";
import { useGameStore } from "./state";

describe("setDevGameMode", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
    useGameStore.setState({
      settingsDialogOpen: true,
      galaxyTimeUpDialogOpen: false,
      demoEndDialogDismissed: false,
    });
  });

  it("closes settings when Demo End is chosen", () => {
    useGameStore.getState().setDevGameMode("demoEnd");

    const state = useGameStore.getState();
    expect(state.devGameMode).toBe("demoEnd");
    expect(state.settingsDialogOpen).toBe(false);
    expect(state.galaxyTimeUpDialogOpen).toBe(true);
  });

  it("leaves settings open for other game modes", () => {
    useGameStore.getState().setDevGameMode("steamDemo");

    const state = useGameStore.getState();
    expect(state.devGameMode).toBe("steamDemo");
    expect(state.settingsDialogOpen).toBe(true);
    expect(state.galaxyTimeUpDialogOpen).toBe(false);
  });
});
