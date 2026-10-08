import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import { toolEffects } from "@/game/rules/effects";
import { wanderersLanternEvents } from "@/game/rules/eventsWanderersLantern";
import {
  WANDERERS_LANTERN_ACTIVE_MS,
  WANDERERS_LANTERN_CODE,
  matchesWanderersLanternCode,
  WANDERERS_LANTERN_COOLDOWN_MS,
  WANDERERS_LANTERN_EVENT_ID,
  WANDERERS_LANTERN_LUCK,
  WANDERERS_LANTERN_SILVER_AMOUNT,
  WANDERERS_LANTERN_TOOL_ID,
  activateWanderersLantern,
  isWanderersLanternCooling,
  isWanderersLanternEdition,
  isWanderersLanternEventReady,
  isWanderersLanternLit,
  isWanderersLanternReady,
  ownsWanderersLantern,
  wanderersLanternSilverPatch,
} from "@/game/wanderersLantern";

function lanternState(
  patch: {
    tools?: Partial<GameState["tools"]>;
    seen?: GameState["story"]["seen"];
    triggeredEvents?: GameState["triggeredEvents"];
    devGameMode?: "steamGame" | "normal";
  } = {},
): GameState & { devGameMode?: "steamGame" | "normal" } {
  const base = createInitialState();
  return {
    ...base,
    tools: { ...base.tools, ...patch.tools },
    story: {
      ...base.story,
      seen: { ...base.story.seen, ...patch.seen },
    },
    triggeredEvents: patch.triggeredEvents ?? base.triggeredEvents,
    devGameMode: patch.devGameMode ?? "steamGame",
  };
}

describe("wanderers lantern", () => {
  it("accepts the gift code in any capitalization", () => {
    expect(WANDERERS_LANTERN_CODE).toBe("WANDERER");
    expect(matchesWanderersLanternCode("WANDERER")).toBe(true);
    expect(matchesWanderersLanternCode("wanderer")).toBe(true);
    expect(matchesWanderersLanternCode(" Wanderer ")).toBe(true);
    expect(matchesWanderersLanternCode("WANDER")).toBe(false);
  });

  it("is a steam-only edition, including demo and playtest copies in DEV", () => {
    expect(isWanderersLanternEdition("steamGame")).toBe(true);
    expect(isWanderersLanternEdition("steamPlaytest")).toBe(true);
    expect(isWanderersLanternEdition("steamDemo")).toBe(true);
    expect(isWanderersLanternEdition("demoEnd")).toBe(true);
    expect(isWanderersLanternEdition("crazyGamesDemo")).toBe(false);
    expect(isWanderersLanternEdition("normal")).toBe(false);
    expect(isWanderersLanternEdition(undefined)).toBe(false);
  });

  it("grants +2 luck on the tool", () => {
    expect(
      toolEffects[WANDERERS_LANTERN_TOOL_ID]?.bonuses.generalBonuses?.luck,
    ).toBe(WANDERERS_LANTERN_LUCK);
  });

  it("is ready the moment it is received", () => {
    const state = lanternState({
      tools: { wanderers_lantern: true },
    });
    expect(ownsWanderersLantern(state)).toBe(true);
    expect(isWanderersLanternReady(state, 1_000)).toBe(true);
  });

  it("stays lit for 5 minutes, then cools down for 15", () => {
    const now = 10_000;
    const owned = lanternState({ tools: { wanderers_lantern: true } });
    const lit = {
      ...owned,
      story: activateWanderersLantern(owned, now).story!,
    };
    expect(isWanderersLanternLit(lit, now + 1)).toBe(true);
    expect(isWanderersLanternReady(lit, now + 1)).toBe(false);
    expect(isWanderersLanternCooling(lit, now + 1)).toBe(false);

    const coolingAt = now + WANDERERS_LANTERN_ACTIVE_MS;
    expect(isWanderersLanternLit(lit, coolingAt)).toBe(false);
    expect(isWanderersLanternCooling(lit, coolingAt)).toBe(true);
    expect(wanderersLanternSilverPatch(lit, coolingAt, 0)).toBeNull();

    const readyAt = coolingAt + WANDERERS_LANTERN_COOLDOWN_MS;
    expect(isWanderersLanternCooling(lit, readyAt)).toBe(false);
    expect(isWanderersLanternReady(lit, readyAt)).toBe(true);
  });

  it("finds 10 silver on a successful roll only while lit", () => {
    const now = 5_000;
    const dark = lanternState({ tools: { wanderers_lantern: true } });
    expect(wanderersLanternSilverPatch(dark, now, 0)).toBeNull();

    const lit = {
      ...dark,
      story: activateWanderersLantern(dark, now).story!,
    };
    expect(wanderersLanternSilverPatch(lit, now + 1, 0.2)).toBeNull();
    const found = wanderersLanternSilverPatch(lit, now + 1, 0);
    expect(found?.resources?.silver).toBe(WANDERERS_LANTERN_SILVER_AMOUNT);
  });

  it("offers the find event only after the code, on a steam edition, once", () => {
    const event = wanderersLanternEvents[WANDERERS_LANTERN_EVENT_ID];
    expect(event.timeProbability).toBe(0.1);
    expect(event.showAsTimedTab).toBeUndefined();
    expect(event.repeatable).toBe(false);
    expect(event.choices).toBeUndefined();
    expect(event.skipEventLog).toBe(true);
    const granted = event.effect?.(
      lanternState({ seen: { wanderersLanternCode: true } }),
    );
    expect(granted?.tools?.wanderers_lantern).toBe(true);

    expect(isWanderersLanternEventReady(lanternState())).toBe(false);
    expect(
      isWanderersLanternEventReady(
        lanternState({
          seen: { wanderersLanternCode: true },
        }),
      ),
    ).toBe(true);
    expect(
      isWanderersLanternEventReady(
        lanternState({
          seen: { wanderersLanternCode: true },
          tools: { wanderers_lantern: true },
        }),
      ),
    ).toBe(false);
  });
});
