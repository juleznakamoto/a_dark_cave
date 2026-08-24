import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { choiceEvents } from "./eventsChoices";
import { resolveEventLogMessage } from "@/i18n/resolveGameText";

function baseState() {
  return gameStateSchema.parse({
    buildings: { woodenHut: 4 },
    villagers: { free: 5, gatherer: 0, hunter: 0, iron_miner: 0, coal_miner: 0 },
    resources: { food: 100, steel: 0 },
    stats: { strength: 10, madnessFromEvents: 2 },
    story: { seen: {} },
  });
}

describe("slaveTrader condition", () => {
  it("does not appear before the player has ever had steel", () => {
    const state = baseState();
    expect(choiceEvents.slaveTrader.condition(state)).toBe(false);
  });

  it("can appear after the player has obtained steel", () => {
    const state = {
      ...baseState(),
      resources: { ...baseState().resources, steel: 1 },
    };
    expect(choiceEvents.slaveTrader.condition(state)).toBe(true);
  });

  it("can still appear if steel was obtained and then spent", () => {
    const state = {
      ...baseState(),
      resources: { ...baseState().resources, steel: 0 },
      seenResources: ["steel"],
    };
    expect(choiceEvents.slaveTrader.condition(state)).toBe(true);
  });
});

describe("slaveTrader freeSlaves", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves failure log from catalog outcome2 key", () => {
    const msg = resolveEventLogMessage("slaveTrader", "outcome2", {
      actualDeaths: 2,
    });
    expect(msg.length).toBeGreaterThan(20);
    expect(msg).toContain("2");
  });

  it("applies success rewards and outcome log key", () => {
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    const state = baseState();
    const result = choice.effect(state);

    expect(result._logMessageKey).toBe("outcome1");
    expect(result.resources?.steel).toBe(100);
    expect(result.villagers?.free).toBe(8);
    expect(result.stats?.madnessFromEvents).toBe(1);
    expect(result.story?.seen?.slaveTraderEvent).toBe(true);
  });

  it("always succeeds even when roll would have failed", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    const state = baseState();
    const result = choice.effect(state);

    expect(result._logMessageKey).toBe("outcome1");
    expect(result.resources?.steel).toBe(100);
    expect(result.villagers?.free).toBe(8);
    expect(result.stats?.madnessFromEvents).toBe(1);
    expect(result.story?.seen?.slaveTraderEvent).toBe(true);
  });

  it("reports 100% success chance", () => {
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    expect(choice.success_chance!(baseState())).toBe(1);
  });
});
