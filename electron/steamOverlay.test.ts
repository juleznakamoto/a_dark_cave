import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STEAM_OVERLAY_CHROMIUM_SWITCHES,
  STEAM_OVERLAY_REPAINT_MS,
  applySteamOverlayHooks,
  tickSteamOverlayRepaint,
} from "./steam";

type FakeWindow = {
  isDestroyed: () => boolean;
  isMinimized: () => boolean;
  isVisible: () => boolean;
  webContents: {
    isPainting: () => boolean;
    invalidate: () => void;
  };
};

function fakeWindow(options?: {
  destroyed?: boolean;
  painting?: boolean;
  minimized?: boolean;
  hidden?: boolean;
}): { window: FakeWindow; invalidate: ReturnType<typeof vi.fn> } {
  const invalidate = vi.fn();
  return {
    invalidate,
    window: {
      isDestroyed: () => options?.destroyed === true,
      isMinimized: () => options?.minimized === true,
      isVisible: () => options?.hidden !== true,
      webContents: {
        isPainting: () => options?.painting === true,
        invalidate,
      },
    },
  };
}

describe("Steam overlay hooks", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps both switches so a Steam launch paints the game", () => {
    expect([...STEAM_OVERLAY_CHROMIUM_SWITCHES]).toEqual([
      "in-process-gpu",
      "disable-direct-composition",
    ]);
  });

  it("appends only those switches and repaints each window once", () => {
    vi.useFakeTimers();
    const switches: string[] = [];
    const created: Array<(event: unknown, window: FakeWindow) => void> = [];
    const first = fakeWindow();
    const electron = {
      app: {
        commandLine: { appendSwitch: (switchName: string) => switches.push(switchName) },
        on: (
          _event: "browser-window-created",
          listener: (event: unknown, window: FakeWindow) => void,
        ) => {
          created.push(listener);
        },
      },
      BrowserWindow: { getAllWindows: () => [first.window] },
    };

    applySteamOverlayHooks(electron);
    applySteamOverlayHooks(electron);

    expect(switches).toEqual([
      "in-process-gpu",
      "disable-direct-composition",
      "in-process-gpu",
      "disable-direct-composition",
    ]);
    expect(created).toHaveLength(1);

    vi.advanceTimersByTime(STEAM_OVERLAY_REPAINT_MS);
    expect(first.invalidate).toHaveBeenCalledTimes(1);

    const second = fakeWindow();
    created[0]?.({}, second.window);
    created[0]?.({}, second.window);
    vi.advanceTimersByTime(STEAM_OVERLAY_REPAINT_MS);
    expect(second.invalidate).toHaveBeenCalledTimes(1);

    first.window.isDestroyed = () => true;
    second.window.isDestroyed = () => true;
    vi.advanceTimersByTime(STEAM_OVERLAY_REPAINT_MS * 3);
    expect(first.invalidate).toHaveBeenCalledTimes(2);
    expect(second.invalidate).toHaveBeenCalledTimes(1);
  });

  it("invalidates a window that is not painting", () => {
    const { window, invalidate } = fakeWindow({ painting: false });
    expect(tickSteamOverlayRepaint(window)).toBe(false);
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("leaves a painting window alone", () => {
    const { window, invalidate } = fakeWindow({ painting: true });
    expect(tickSteamOverlayRepaint(window)).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("stops the repaint hook after the window is destroyed", () => {
    const { window, invalidate } = fakeWindow({ destroyed: true });
    expect(tickSteamOverlayRepaint(window)).toBe(true);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("skips a minimized window and repaints again once it is shown", () => {
    let minimized = true;
    const { window, invalidate } = fakeWindow();
    window.isMinimized = () => minimized;

    expect(tickSteamOverlayRepaint(window)).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();

    minimized = false;
    expect(tickSteamOverlayRepaint(window)).toBe(false);
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("skips a hidden window and keeps the hook running", () => {
    const { window, invalidate } = fakeWindow({ hidden: true });
    expect(tickSteamOverlayRepaint(window)).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
