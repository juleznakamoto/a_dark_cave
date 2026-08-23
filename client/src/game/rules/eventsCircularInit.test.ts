import { describe, expect, it } from "vitest";
// Load the action aggregator first. Vite native ESM used to TDZ
// `attackWaveEvents` / `caveExploreActions` when `rules/index` cycled
// through `actions.ts` or `state.ts`.
import { gameActions } from "./index";
import { gameEvents } from "./events";

describe("event module initialization", () => {
  it("exposes attack wave events after the rules/index ↔ state ↔ events cycle", () => {
    expect(gameEvents.firstWave?.id).toBe("firstWave");
    expect(gameEvents.postCompletionWave?.id).toBe("postCompletionWave");
    expect(gameEvents.wandering_collector?.id).toBe("wandering_collector");
  });

  it("registers cave explore actions after the actions.ts ↔ rules/index cycle", () => {
    expect(gameActions.makeFire?.id).toBe("makeFire");
    expect(gameActions.exploreCave?.id).toBe("exploreCave");
  });
});
