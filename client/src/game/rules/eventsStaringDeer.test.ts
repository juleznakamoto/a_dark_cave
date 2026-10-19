import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  STARING_DEER_DURATION_MS,
  getStaringDeerStage,
  staringDeerEvent,
} from "./eventsStaringDeer";

function deerState(
  buildings: Partial<GameState["buildings"]>,
  seen: Record<string, boolean | number> = {},
  hunters = 2,
): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    buildings: { ...initial.buildings, ...buildings },
    villagers: { ...initial.villagers, hunter: hunters },
    staringDeerState: { isActive: false, endTime: 0 },
    story: {
      ...initial.story,
      seen: { ...initial.story.seen, ...seen },
    },
  };
}

describe("staring deer stages", () => {
  it("maps hut counts to one stage each", () => {
    expect(getStaringDeerStage(deerState({ woodenHut: 2 }))).toBeNull();
    expect(getStaringDeerStage(deerState({ woodenHut: 3 }))).toBe(0);
    expect(getStaringDeerStage(deerState({ woodenHut: 5 }))).toBe(0);
    expect(getStaringDeerStage(deerState({ woodenHut: 6 }))).toBe(1);
    expect(getStaringDeerStage(deerState({ woodenHut: 8 }))).toBe(1);
    expect(getStaringDeerStage(deerState({ woodenHut: 9 }))).toBe(2);
    expect(getStaringDeerStage(deerState({ woodenHut: 9, stoneHut: 2 }))).toBe(2);
    expect(getStaringDeerStage(deerState({ woodenHut: 9, stoneHut: 3 }))).toBe(3);
    expect(getStaringDeerStage(deerState({ stoneHut: 5 }))).toBe(3);
    expect(getStaringDeerStage(deerState({ stoneHut: 6 }))).toBe(4);
    expect(getStaringDeerStage(deerState({ stoneHut: 8 }))).toBe(4);
    expect(getStaringDeerStage(deerState({ stoneHut: 9 }))).toBe(5);
  });

  it("can fire once at a stage, then waits for the next hut stage", () => {
    const firstVisit = deerState({ woodenHut: 3 });
    expect(staringDeerEvent.condition(firstVisit)).toBe(true);

    const afterFirst = staringDeerEvent.choices![0]!.effect!(firstVisit) as Partial<GameState>;
    const sameStage = deerState(
      { woodenHut: 5 },
      afterFirst.story?.seen as Record<string, boolean | number>,
    );
    expect(staringDeerEvent.condition(sameStage)).toBe(false);

    const nextStage = deerState(
      { woodenHut: 6 },
      afterFirst.story?.seen as Record<string, boolean | number>,
    );
    expect(staringDeerEvent.condition(nextStage)).toBe(true);
  });

  it("needs at least 2 hunters", () => {
    expect(staringDeerEvent.condition(deerState({ woodenHut: 3 }, {}, 1))).toBe(
      false,
    );
    expect(staringDeerEvent.condition(deerState({ woodenHut: 3 }, {}, 2))).toBe(
      true,
    );
  });

  it("runs for 15 minutes", () => {
    const before = Date.now();
    const result = staringDeerEvent.choices![0]!.effect!(
      deerState({ woodenHut: 3 }),
    ) as Partial<GameState>;
    expect(result.staringDeerState?.endTime).toBeGreaterThanOrEqual(
      before + STARING_DEER_DURATION_MS,
    );
    expect(STARING_DEER_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it("does not refire at 5 wooden huts after a legacy multi-fire count", () => {
    const legacySameStage = deerState(
      { woodenHut: 5 },
      { staringDeerCount: 3 },
    );
    expect(staringDeerEvent.condition(legacySameStage)).toBe(false);

    const nextStage = deerState(
      { woodenHut: 6 },
      { staringDeerCount: 3 },
    );
    expect(staringDeerEvent.condition(nextStage)).toBe(true);
  });
});
