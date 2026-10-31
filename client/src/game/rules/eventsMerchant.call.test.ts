import { afterEach, describe, expect, it, vi } from "vitest";
import { setGameTabHiddenForTests } from "@/lib/tabVisibility";
import { createInitialState } from "../state";
import { EventManager } from "./events";
import { merchantEvents } from "./eventsMerchant";

function merchantIntervalMinutes(
  buildings: {
    tradePost?: number;
    grandBazaar?: number;
    merchantsGuild?: number;
    stoneHut?: number;
  },
  btp = 0,
  seen: Record<string, boolean> = {},
) {
  const base = createInitialState();
  const minutes = merchantEvents.merchant.timeProbability;
  if (typeof minutes !== "function") {
    throw new Error("merchant timeProbability must depend on state");
  }
  return minutes({
    ...base,
    BTP: btp,
    buildings: { ...base.buildings, woodenHut: 3, ...buildings },
    story: { ...base.story, seen: { ...base.story.seen, ...seen } },
  });
}

function merchantRollState(calling: boolean) {
  const base = createInitialState();
  return {
    ...base,
    buildings: { ...base.buildings, woodenHut: 3 },
    executionStartTimes: calling ? { callMerchant: 1 } : {},
    timedEventTab: { isActive: false, lastEndedAt: 0 },
  };
}

describe("merchant event while calling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setGameTabHiddenForTests(null);
  });

  it("does not spawn while Call Merchant is in progress", () => {
    setGameTabHiddenForTests(false);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { stateChanges } = EventManager.checkEvents(
      merchantRollState(true),
      [merchantEvents.merchant],
    );

    expect(stateChanges._timedTabEvent).toBeUndefined();
  });

  it("can spawn once the call is not in progress", () => {
    setGameTabHiddenForTests(false);
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { stateChanges } = EventManager.checkEvents(
      merchantRollState(false),
      [merchantEvents.merchant],
    );

    expect(stateChanges._timedTabEvent).toMatchObject({ id: "merchant" });
  });
});

describe("merchant visit interval", () => {
  it("starts at 10 minutes and ignores the Steam edition", () => {
    expect(merchantIntervalMinutes({})).toBe(10);
    expect(merchantIntervalMinutes({}, 1)).toBe(10);
  });

  it("adds 10 minutes once Call Merchant is unlocked, plus each trade building", () => {
    expect(merchantIntervalMinutes({ tradePost: 1 })).toBe(21);
    expect(
      merchantIntervalMinutes({ tradePost: 1, grandBazaar: 1 }),
    ).toBe(22.5);
    expect(
      merchantIntervalMinutes({
        tradePost: 1,
        grandBazaar: 1,
        merchantsGuild: 1,
      }),
    ).toBe(24.5);
    expect(merchantIntervalMinutes({ tradePost: 1 }, 1)).toBe(21);
  });

  it("adds 5 minutes at stone hut 5, stone hut 10, wave 5, and wave 10", () => {
    expect(merchantIntervalMinutes({ stoneHut: 4 })).toBe(10);
    expect(merchantIntervalMinutes({ stoneHut: 5 })).toBe(15);
    expect(merchantIntervalMinutes({ stoneHut: 9 })).toBe(15);
    expect(merchantIntervalMinutes({ stoneHut: 10 })).toBe(20);
    expect(merchantIntervalMinutes({}, 0, { fifthWaveVictory: true })).toBe(15);
    expect(merchantIntervalMinutes({}, 0, { tenthWaveVictory: true })).toBe(15);
    expect(
      merchantIntervalMinutes({ tradePost: 1, stoneHut: 10 }, 0, {
        fifthWaveVictory: true,
        tenthWaveVictory: true,
      }),
    ).toBe(41);
  });
});
