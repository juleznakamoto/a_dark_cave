/** @vitest-environment jsdom */

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const syncCrazyGamesGameplay = vi.fn(() => Promise.resolve());

vi.mock("@/lib/crazyGames", () => ({
  syncCrazyGamesGameplay: (...args: unknown[]) => syncCrazyGamesGameplay(...args),
}));

import { useCrazyGamesGameplay } from "./useCrazyGamesGameplay";

describe("useCrazyGamesGameplay", () => {
  beforeEach(() => {
    syncCrazyGamesGameplay.mockClear();
  });

  it("starts only while the cave is playable", () => {
    const { rerender, unmount } = renderHook(
      ({ gameStarted, isPaused }) => useCrazyGamesGameplay(gameStarted, isPaused),
      { initialProps: { gameStarted: false, isPaused: false } },
    );

    expect(syncCrazyGamesGameplay).toHaveBeenLastCalledWith(false);

    rerender({ gameStarted: true, isPaused: false });
    expect(syncCrazyGamesGameplay).toHaveBeenLastCalledWith(true);

    rerender({ gameStarted: true, isPaused: true });
    expect(syncCrazyGamesGameplay).toHaveBeenLastCalledWith(false);

    unmount();
    expect(syncCrazyGamesGameplay).toHaveBeenLastCalledWith(false);
  });
});
