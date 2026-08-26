import { describe, expect, it, beforeAll } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { resolveEventTitle, localizeEventChoices } from "@/i18n/eventText";
import {
  BRIMSTONE_FLUX_DURATION_MS,
  brimstoneFluxEvents,
} from "./eventsBrimstoneFlux";

function fluxState(
  patch: {
    buildings?: Partial<GameState["buildings"]>;
    resources?: Partial<GameState["resources"]>;
    seenResources?: string[];
    seen?: Record<string, boolean>;
    blessings?: Partial<GameState["blessings"]>;
  } = {},
): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    buildings: { ...initial.buildings, ...patch.buildings },
    resources: { ...initial.resources, ...patch.resources },
    seenResources: patch.seenResources ?? initial.seenResources,
    blessings: { ...initial.blessings, ...patch.blessings },
    story: {
      ...initial.story,
      seen: { ...initial.story.seen, ...patch.seen },
    },
  };
}

const readyForVisit1 = () =>
  fluxState({
    buildings: { foundry: 1 },
    seenResources: ["steel"],
    resources: { sulfur: 2000, gold: 80 },
  });

describe("brimstone flux events", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage("en");
  });

  it("resolves English titles and choice labels", () => {
    expect(resolveEventTitle("brimstoneFlux1")).toBe("The Brimstone Flux");
    expect(resolveEventTitle("brimstoneFlux2")).toBe("Another Brimstone Flux");
    expect(resolveEventTitle("brimstoneFlux3")).toBe("The Brimstone Infusion");

    const choices = localizeEventChoices(
      "brimstoneFlux1",
      brimstoneFluxEvents.brimstoneFlux1.choices as never,
    );
    expect(choices?.find((choice) => choice.id === "accept")?.label).toBe(
      "Accept help",
    );
    expect(choices?.find((choice) => choice.id === "sendAway")?.label).toBe(
      "Send away",
    );
  });

  it("visit 1 requires a foundry and seen steel", () => {
    expect(brimstoneFluxEvents.brimstoneFlux1.condition(createInitialState())).toBe(
      false,
    );
    expect(
      brimstoneFluxEvents.brimstoneFlux1.condition(
        fluxState({ buildings: { foundry: 1 } }),
      ),
    ).toBe(false);
    expect(
      brimstoneFluxEvents.brimstoneFlux1.condition(
        fluxState({ seenResources: ["steel"] }),
      ),
    ).toBe(false);
    expect(brimstoneFluxEvents.brimstoneFlux1.condition(readyForVisit1())).toBe(
      true,
    );
  });

  it("visit 1 stays available after send away, not after accept", () => {
    const state = readyForVisit1();
    const sendAway = brimstoneFluxEvents.brimstoneFlux1.choices!.find(
      (choice) => choice.id === "sendAway",
    )!;
    sendAway.effect(state);
    expect(brimstoneFluxEvents.brimstoneFlux1.condition(state)).toBe(true);

    const accept = brimstoneFluxEvents.brimstoneFlux1.choices!.find(
      (choice) => choice.id === "accept",
    )!;
    const afterAccept = accept.effect(state);
    expect(afterAccept.story?.seen.brimstoneFlux1Accepted).toBe(true);
    expect(afterAccept.brimstoneFluxState?.isActive).toBe(true);
    expect(afterAccept.brimstoneFluxState?.endTime).toBeGreaterThan(
      Date.now() + BRIMSTONE_FLUX_DURATION_MS - 1000,
    );
    expect(afterAccept.resources?.sulfur).toBe(1000);
    expect(afterAccept.resources?.gold).toBe(30);

    const acceptedState = fluxState({
      buildings: { foundry: 1 },
      seenResources: ["steel"],
      seen: { brimstoneFlux1Accepted: true },
    });
    expect(brimstoneFluxEvents.brimstoneFlux1.condition(acceptedState)).toBe(
      false,
    );
    expect(brimstoneFluxEvents.brimstoneFlux2.condition(acceptedState)).toBe(
      true,
    );
  });

  it("visit 2 and 3 follow accept flags and grant the permanent blessing", () => {
    expect(
      brimstoneFluxEvents.brimstoneFlux2.condition(readyForVisit1()),
    ).toBe(false);
    expect(
      brimstoneFluxEvents.brimstoneFlux3.condition(readyForVisit1()),
    ).toBe(false);

    const afterTwo = fluxState({
      buildings: { foundry: 1 },
      seenResources: ["steel"],
      resources: { sulfur: 6000, gold: 300 },
      seen: { brimstoneFlux1Accepted: true, brimstoneFlux2Accepted: true },
    });
    expect(brimstoneFluxEvents.brimstoneFlux2.condition(afterTwo)).toBe(false);
    expect(brimstoneFluxEvents.brimstoneFlux3.condition(afterTwo)).toBe(true);

    const accept = brimstoneFluxEvents.brimstoneFlux3.choices!.find(
      (choice) => choice.id === "accept",
    )!;
    const result = accept.effect(afterTwo);
    expect(result.blessings?.brimstone_infusion).toBe(true);
    expect(result.story?.seen.brimstoneFlux3Accepted).toBe(true);
    expect(result.resources?.sulfur).toBe(1000);
    expect(result.resources?.gold).toBe(50);

    const blessed = fluxState({
      buildings: { foundry: 1 },
      seenResources: ["steel"],
      blessings: { brimstone_infusion: true },
    });
    expect(brimstoneFluxEvents.brimstoneFlux1.condition(blessed)).toBe(false);
    expect(brimstoneFluxEvents.brimstoneFlux3.condition(blessed)).toBe(false);
  });

  it("keeps each visit available after send away or timeout", () => {
    for (const visit of [1, 2, 3] as const) {
      const event = brimstoneFluxEvents[`brimstoneFlux${visit}`];
      expect(event.showAsTimedTab).toBe(true);
      expect(event.repeatable).toBe(true);
      expect(event.fallbackChoice?.id).toBe("sendAway");

      const seen =
        visit === 1
          ? {}
          : visit === 2
            ? { brimstoneFlux1Accepted: true }
            : {
              brimstoneFlux1Accepted: true,
              brimstoneFlux2Accepted: true,
            };
      const state = fluxState({
        buildings: { foundry: 1 },
        seenResources: ["steel"],
        seen,
      });
      expect(event.condition(state)).toBe(true);
      event.fallbackChoice!.effect(state);
      expect(event.condition(state)).toBe(true);
    }
  });

  it("visit 2 uses a longer cooldown fraction", () => {
    expect(brimstoneFluxEvents.brimstoneFlux1.timeProbability).toBe(30);
    expect(brimstoneFluxEvents.brimstoneFlux1.cooldownPercent).toBeUndefined();
    expect(brimstoneFluxEvents.brimstoneFlux2.timeProbability).toBe(45);
    expect(brimstoneFluxEvents.brimstoneFlux2.cooldownPercent).toBe(0.5);
    expect(brimstoneFluxEvents.brimstoneFlux3.timeProbability).toBe(45);
    expect(brimstoneFluxEvents.brimstoneFlux3.cooldownPercent).toBe(0.5);
  });
});
