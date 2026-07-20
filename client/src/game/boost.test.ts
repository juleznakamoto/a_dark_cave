import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import {
  applySaveBoost,
  BOOST_APPLIED_LOG_MESSAGE,
  canApplySaveBoost,
} from "@/game/boost";
import { applyGameStateLoadMigrations } from "@/game/stateHelpers";

describe("save boost", () => {
  it("createInitialState always materialises buildings.woodenHut", () => {
    const fresh = createInitialState();
    expect(fresh.buildings).toBeDefined();
    expect(fresh.buildings.woodenHut).toBe(0);
  });

  it("can apply only when the game has started and boost was not used", () => {
    const fresh = createInitialState();
    expect(canApplySaveBoost(fresh)).toBe(false);

    const started = {
      ...fresh,
      flags: { ...fresh.flags, gameStarted: true },
    };
    expect(canApplySaveBoost(started)).toBe(true);

    const used = { ...started, boostApplied: true };
    expect(canApplySaveBoost(used)).toBe(false);
  });

  it("adds resource bonuses and a system log entry", () => {
    const state = {
      ...createInitialState(),
      flags: { ...createInitialState().flags, gameStarted: true },
      resources: {
        ...createInitialState().resources,
        wood: 10,
        gold: 5,
      },
    };

    const { resources, logEntry } = applySaveBoost(state);

    expect(resources.wood).toBe(5010);
    expect(resources.gold).toBe(5005);
    expect(resources.steel).toBe(500);
    expect(logEntry.message).toBe(BOOST_APPLIED_LOG_MESSAGE);
    expect(logEntry.logKey).toBe("boostApplied");
    expect(logEntry.type).toBe("system");
  });

  it("migrates legacy boostMode saves to boostApplied", () => {
    const legacy = {
      ...createInitialState(),
      boostMode: true,
    } as ReturnType<typeof createInitialState> & { boostMode: boolean };

    const migrated = applyGameStateLoadMigrations(legacy);
    expect(migrated.boostApplied).toBe(true);
  });
});
