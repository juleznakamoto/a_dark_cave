import { describe, it, expect, vi, afterEach } from "vitest";
import {
  tickObsidianOrbFocus,
  OBSIDIAN_ORB_FOCUS_INTERVAL_MS,
  MAX_FOCUS_POINTS,
} from "./obsidianOrb";
import type { GameState } from "@shared/schema";

const baseState = (): Pick<
  GameState,
  "relics" | "obsidianOrbState" | "focusState" | "idleModeState"
> => ({
  relics: { obsidian_orb: true },
  obsidianOrbState: { nextFocusGainTime: 0 },
  focusState: { isActive: false, endTime: 0, points: 0 },
  idleModeState: { isActive: false },
});

describe("tickObsidianOrbFocus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("at max focus, aligns next gain to now + interval (no interval backlog)", () => {
    const now = 10_000_000;
    vi.useFakeTimers({ now });

    const laggingNext = now - 5 * OBSIDIAN_ORB_FOCUS_INTERVAL_MS;
    const patch = tickObsidianOrbFocus({
      ...baseState(),
      focusState: { isActive: false, endTime: 0, points: MAX_FOCUS_POINTS },
      obsidianOrbState: { nextFocusGainTime: laggingNext },
    });

    expect(patch).not.toBeNull();
    expect(patch!.totalFocusEarned).toBe(0);
    expect(patch!.obsidianOrbState.nextFocusGainTime).toBe(
      now + OBSIDIAN_ORB_FOCUS_INTERVAL_MS,
    );

    const second = tickObsidianOrbFocus({
      ...baseState(),
      focusState: { isActive: false, endTime: 0, points: MAX_FOCUS_POINTS },
      obsidianOrbState: patch!.obsidianOrbState,
    });
    expect(second).toBeNull();
  });

  it("when hitting max mid-catchup, does not bank extra intervals", () => {
    const now = 20_000_000;
    vi.useFakeTimers({ now });

    const laggingNext = now - 10 * OBSIDIAN_ORB_FOCUS_INTERVAL_MS;
    const patch = tickObsidianOrbFocus({
      ...baseState(),
      focusState: {
        isActive: false,
        endTime: 0,
        points: MAX_FOCUS_POINTS - 1,
      },
      obsidianOrbState: { nextFocusGainTime: laggingNext },
    });

    expect(patch!.totalFocusEarned).toBe(1);
    expect(patch!.focusState.points).toBe(MAX_FOCUS_POINTS);
    expect(patch!.obsidianOrbState.nextFocusGainTime).toBe(
      now + OBSIDIAN_ORB_FOCUS_INTERVAL_MS,
    );

    const afterCap = tickObsidianOrbFocus({
      ...baseState(),
      focusState: patch!.focusState,
      obsidianOrbState: patch!.obsidianOrbState,
    });
    expect(afterCap).toBeNull();

    const spendOne = tickObsidianOrbFocus({
      ...baseState(),
      focusState: { ...patch!.focusState, points: MAX_FOCUS_POINTS - 1 },
      obsidianOrbState: patch!.obsidianOrbState,
    });
    expect(spendOne).toBeNull();
  });

  it("grants one point per elapsed interval when below max", () => {
    const now = 30_000_000;
    vi.useFakeTimers({ now });

    const twoDue = now - 2 * OBSIDIAN_ORB_FOCUS_INTERVAL_MS;
    const patch = tickObsidianOrbFocus({
      ...baseState(),
      focusState: { isActive: false, endTime: 0, points: 5 },
      obsidianOrbState: { nextFocusGainTime: twoDue },
    });

    expect(patch!.totalFocusEarned).toBe(2);
    expect(patch!.focusState.points).toBe(7);
    expect(patch!.obsidianOrbState.nextFocusGainTime).toBe(
      twoDue + 2 * OBSIDIAN_ORB_FOCUS_INTERVAL_MS,
    );
  });
});
