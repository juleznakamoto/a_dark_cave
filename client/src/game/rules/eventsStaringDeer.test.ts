import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  getStaringDeerStage,
  staringDeerEvent,
} from "./eventsStaringDeer";

function deerState(
  buildings: Partial<GameState["buildings"]>,
  seen: Record<string, boolean | number> = {},
): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    buildings: { ...initial.buildings, ...buildings },
    staringDeerState: { isActive: false, endTime: 0 },
    story: {
      ...initial.story,
      seen: { ...initial.story.seen, ...seen },
    },
  };
}

describe("staring deer stages", () => {
  it("maps hut counts to one stage each", () => {
    expect(getStaringDeerStage(deerState({ woodenHut: 3 }))).toBeNull();
    expect(getStaringDeerStage(deerState({ woodenHut: 4 }))).toBe(0);
    expect(getStaringDeerStage(deerState({ woodenHut: 6 }))).toBe(0);
    expect(getStaringDeerStage(deerState({ woodenHut: 7 }))).toBe(1);
    expect(getStaringDeerStage(deerState({ woodenHut: 10 }))).toBe(2);
    expect(getStaringDeerStage(deerState({ woodenHut: 10, stoneHut: 4 }))).toBe(3);
    expect(getStaringDeerStage(deerState({ stoneHut: 7 }))).toBe(4);
    expect(getStaringDeerStage(deerState({ stoneHut: 10 }))).toBe(5);
  });

  it("can fire once at a stage, then waits for the next hut stage", () => {
    const firstVisit = deerState({ woodenHut: 6 });
    expect(staringDeerEvent.condition(firstVisit)).toBe(true);

    const afterFirst = staringDeerEvent.choices![0]!.effect!(firstVisit) as Partial<GameState>;
    const sameStage = deerState(
      { woodenHut: 6 },
      afterFirst.story?.seen as Record<string, boolean | number>,
    );
    expect(staringDeerEvent.condition(sameStage)).toBe(false);

    const nextStage = deerState(
      { woodenHut: 7 },
      afterFirst.story?.seen as Record<string, boolean | number>,
    );
    expect(staringDeerEvent.condition(nextStage)).toBe(true);
  });

  it("does not refire at 6 wooden huts after a legacy multi-fire count", () => {
    const legacySameStage = deerState(
      { woodenHut: 6 },
      { staringDeerCount: 3 },
    );
    expect(staringDeerEvent.condition(legacySameStage)).toBe(false);

    const nextStage = deerState(
      { woodenHut: 7 },
      { staringDeerCount: 3 },
    );
    expect(staringDeerEvent.condition(nextStage)).toBe(true);
  });
});
