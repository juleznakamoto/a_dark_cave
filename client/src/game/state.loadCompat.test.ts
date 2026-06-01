import { describe, it, expect } from "vitest";
import { createInitialState } from "./state";

describe("legacy save field normalization", () => {
  it("merges missing insight/scholar/revealedEffects like loadGame", () => {
    const defaults = createInitialState();
    const legacy = {
      ...defaults,
      resources: { ...defaults.resources },
      villagers: { ...defaults.villagers },
    } as typeof defaults;
    delete (legacy.resources as Record<string, unknown>).insight;
    delete (legacy.villagers as Record<string, unknown>).scholar;
    delete (legacy as { revealedEffects?: string[] }).revealedEffects;

    const merged = {
      ...legacy,
      resources: { ...defaults.resources, ...legacy.resources },
      villagers: { ...defaults.villagers, ...legacy.villagers },
      revealedEffects: legacy.revealedEffects ?? [],
    };

    expect(merged.resources.insight).toBe(0);
    expect(merged.villagers.scholar).toBe(0);
    expect(merged.revealedEffects).toEqual([]);
  });
});
