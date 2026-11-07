import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { gameStateSchema } from "@shared/schema";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { choiceEvents } from "./eventsChoices";
import { getTotalStrength } from "./effectsCalculation";
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
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage("en");
  });

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

  it("always succeeds outside cruel mode even when the roll would have failed", () => {
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

  it("subtracts 1 from a negative event-madness total", () => {
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    const state = {
      ...baseState(),
      stats: { ...baseState().stats, madnessFromEvents: -19 },
    };
    const result = choice.effect(state);

    expect(result.stats?.madnessFromEvents).toBe(-20);
  });

  it("reports 100% success chance outside cruel mode", () => {
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    expect(choice.success_chance!(baseState())).toBe(1);
  });

  it("is 40% plus 1% per strength in cruel mode", () => {
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    const cruel = { ...baseState(), cruelMode: true };
    const strong = {
      ...cruel,
      weapons: { ...cruel.weapons, manhunter_bow: true },
    };

    expect(choice.success_chance!(cruel)).toBeCloseTo(
      0.4 + getTotalStrength(cruel) * 0.01,
    );
    expect(getTotalStrength(strong)).toBe(getTotalStrength(cruel) + 4);
    expect(choice.success_chance!(strong)).toBeCloseTo(
      0.4 + getTotalStrength(strong) * 0.01,
    );
    expect(choice.success_chance!(strong)).toBeGreaterThan(
      choice.success_chance!(cruel),
    );
  });

  it("can lose the fight in cruel mode", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "freeSlaves",
    )!;
    const result = choice.effect({ ...baseState(), cruelMode: true });

    expect(result._logMessageKey).toBe("outcome2");
    expect(result._logMessageVars).toEqual({ actualDeaths: 3 });
    expect(result.resources?.steel).toBeUndefined();
    expect(result.villagers?.free).toBe(2);
    expect(result.stats?.madnessFromEvents).toBe(1);
    expect(result.story?.seen?.slaveTraderEvent).toBe(true);
  });
});

describe("slaveTrader sellVillagers", () => {
  it("adds 1 to event madness", () => {
    const choice = choiceEvents.slaveTrader.choices!.find(
      (c) => c.id === "sellVillagers",
    )!;
    const result = choice.effect(baseState());

    expect(result._logMessageKey).toBe("outcome0");
    expect(result.stats?.madnessFromEvents).toBe(3);
  });
});
