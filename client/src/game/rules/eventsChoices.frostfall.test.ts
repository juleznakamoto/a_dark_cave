import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { choiceEvents } from "./eventsChoices";

function frostfallState(timesOccurred: number, cruelMode: boolean) {
  return gameStateSchema.parse({
    buildings: { woodenHut: 3 },
    resources: { wood: 10000, food: 10000, fur: 10000 },
    cruelMode,
    story: { seen: { frostfallCount: timesOccurred } },
  });
}

describe("frostfall prepare cost", () => {
  const prepare = choiceEvents.frostfall.choices!.find(
    (choice) => choice.id === "prepareFrostfall",
  )!;

  it("steps by 250 in normal mode", () => {
    const expected = [500, 750, 1000, 1250, 1500];
    const expectedFur = [250, 500, 750, 1000, 1250];
    expected.forEach((amount, timesOccurred) => {
      const fur = expectedFur[timesOccurred];
      const state = frostfallState(timesOccurred, false);
      expect(prepare.cost).toBeTypeOf("function");
      if (typeof prepare.cost !== "function") return;
      expect(prepare.cost(state)).toBe(
        `${amount} wood, ${amount} food, ${fur} fur`,
      );
      const result = prepare.effect(state);
      expect(result.resources?.wood).toBe(10000 - amount);
      expect(result.resources?.food).toBe(10000 - amount);
      expect(result.resources?.fur).toBe(10000 - fur);
    });
  });

  it("keeps the +500 ladder in cruel mode", () => {
    const expected = [500, 1000, 1500, 2000, 2500];
    const expectedFur = [250, 750, 1250, 1750, 2250];
    expected.forEach((amount, timesOccurred) => {
      const fur = expectedFur[timesOccurred];
      const state = frostfallState(timesOccurred, true);
      expect(prepare.cost).toBeTypeOf("function");
      if (typeof prepare.cost !== "function") return;
      expect(prepare.cost(state)).toBe(
        `${amount} wood, ${amount} food, ${fur} fur`,
      );
      const result = prepare.effect(state);
      expect(result.resources?.wood).toBe(10000 - amount);
      expect(result.resources?.food).toBe(10000 - amount);
      expect(result.resources?.fur).toBe(10000 - fur);
    });
  });
});
