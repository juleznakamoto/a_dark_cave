import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { collectorRejectedSeenKey } from "./collectorRejectedItems";
import { choiceEvents } from "./eventsChoices";

describe("blackenedMirror timed tab", () => {
  it("treats a timeout like refusing the mirror", () => {
    const event = choiceEvents.blackenedMirror;
    const refuse = event.choices!.find((c) => c.id === "refuseMirror")!;
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 5 },
      resources: { iron: 500 },
    });

    expect(event.showAsTimedTab).toBe(true);
    expect(event.fallbackChoice?.id).toBe("refuseMirror");

    const timedOut = event.fallbackChoice!.effect(state);
    expect(timedOut).toEqual(refuse.effect(state));
    expect(timedOut.story?.seen?.[collectorRejectedSeenKey("blackened_mirror")]).toBe(
      true,
    );
  });
});
