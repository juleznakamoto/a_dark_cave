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

  it("closes settings when Steam End Screen is chosen", () => {
    useGameStore.getState().setDevGameMode("steamEndScreen");

    const state = useGameStore.getState();
    expect(state.devGameMode).toBe("steamEndScreen");
    expect(state.settingsDialogOpen).toBe(false);
    expect(state.galaxyTimeUpDialogOpen).toBe(false);
  });

  it("leaves settings open for other game modes", () => {
    useGameStore.getState().setDevGameMode("steamDemo");

    const state = useGameStore.getState();
    expect(state.devGameMode).toBe("steamDemo");
    expect(state.settingsDialogOpen).toBe(true);
    expect(state.galaxyTimeUpDialogOpen).toBe(false);
  });

  it("applies Steam Game UI from a live account entitlement", () => {
    useGameStore.getState().applyAccountSteamMode(true);

    const state = useGameStore.getState();
    expect(state.accountSteamMode).toBe(true);
    expect(state.devGameMode).toBe("steamGame");
  });
});
