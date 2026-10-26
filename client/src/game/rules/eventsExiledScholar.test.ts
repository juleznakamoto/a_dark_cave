import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { exiledScholarEvents } from "./eventsExiledScholar";
import { boneDevourerEvents } from "./eventsBoneDevourer";

function scholarState(seen: Record<string, boolean> = {}) {
  return gameStateSchema.parse({
    buildings: { darkEstate: 1 },
    relics: {
      lycan_blood: true,
      necromancer_blood: true,
      bone_devourer_blood: true,
    },
    story: { seen },
  });
}

describe("exiledScholarVisit", () => {
  const condition = exiledScholarEvents.exiledScholarVisit.condition!;

  it("waits until the Veinfire Elixir is unlocked", () => {
    expect(condition(scholarState({ firstWaveTriggered: true }))).toBe(false);
    expect(condition(scholarState({ veinrootDiscovered: true }))).toBe(true);
  });

  it("visits sooner the first time than after the player has paid", () => {
    const timeProbability = exiledScholarEvents.exiledScholarVisit.timeProbability;
    expect(typeof timeProbability).toBe("function");
    if (typeof timeProbability !== "function") return;
    expect(timeProbability(scholarState())).toBe(7);
    const paid = scholarState();
    paid.exiledScholarState.hasPaid = true;
    expect(timeProbability(paid)).toBe(60);
  });
});

describe("boneDevourer sixth sale", () => {
  const condition = boneDevourerEvents.boneDevourer6.condition!;

  function devourerState(stoneHut: number) {
    return gameStateSchema.parse({
      buildings: { stoneHut },
      boneDevourerState: { lastAcceptedLevel: 5 },
    });
  }

  it("opens at 8 stone huts for 25,000 bones", () => {
    expect(condition(devourerState(7))).toBe(false);
    expect(condition(devourerState(8))).toBe(true);
    expect(boneDevourerEvents.boneDevourer6.i18nVars).toMatchObject({
      boneCost: "25'000",
    });
  });
});
