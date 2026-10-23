import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { caveEvents } from "./eventsCave";
import { getTorchBagEventId } from "@/game/store/rewards";

describe("torch bag found", () => {
  it("registers a one-choice cave event", () => {
    const event = caveEvents.torchBagFound;
    expect(event).toBeDefined();
    expect(event.i18nKey).toBe("torchBagFound");
    expect(event.repeatable).toBe(false);

    const state = gameStateSchema.parse({ resources: { torch: 3 } });
    const choices =
      typeof event.choices === "function" ? event.choices(state) : event.choices;
    expect(choices).toHaveLength(1);
    expect(choices?.[0]?.id).toBe("continue");
  });

  it("grants 25 torches and marks the find on continue", () => {
    const state = gameStateSchema.parse({ resources: { torch: 3 } });
    const choices =
      typeof caveEvents.torchBagFound.choices === "function"
        ? caveEvents.torchBagFound.choices(state)
        : caveEvents.torchBagFound.choices;
    const continueChoice = choices?.find((c) => c.id === "continue");
    expect(continueChoice).toBeDefined();

    const result = continueChoice!.effect!(state);
    expect(result.resources?.torch).toBe(28);
    expect(result.story?.seen?.torchBagFound).toBe(true);
    expect(result._logMessageKey).toBe("outcome0");
  });

  it("identifies torch bag log entries for reward dialog auto-apply", () => {
    expect(
      getTorchBagEventId({
        id: "torchBagFound-123",
        eventId: "torchBagFound",
        message: "bag",
        timestamp: 0,
      } as any),
    ).toBe("torchBagFound");
    expect(
      getTorchBagEventId({
        id: "caveWallMarkingsExploreCave-1",
        eventId: "caveWallMarkingsExploreCave",
        message: "marks",
        timestamp: 0,
      } as any),
    ).toBeNull();
  });
});
