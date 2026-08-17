import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialState, useGameStore } from "@/game/state";
import { calculateTotalEffects } from "@/game/rules/effectsCalculation";
import { buildGameState, hydrateLoadedGameState } from "@/game/stateHelpers";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { parseLocaleJson } from "../../../scripts/parse-locale-json.mjs";
import {
  ABSOLUTION_INSIGHT_COST,
  canAbsolveItem,
  getAbsolvedItemMadnessAmount,
  getItemMadnessAmount,
  isItemAbsolved,
  shouldShowAbsolveBadge,
} from "./itemAbsolution";

function withBookAndRelic(
  relicId: string,
  extras?: {
    insight?: number;
    clerksHut?: number;
    absolved?: boolean;
    feedingRing?: boolean;
  },
) {
  const state = createInitialState();
  state.books.book_of_absolution = true;
  state.buildings.clerksHut = extras?.clerksHut ?? 1;
  (state.relics as Record<string, boolean>)[relicId] = true;
  if (extras?.feedingRing) state.clothing.feeding_ring = true;
  state.resources.insight = extras?.insight ?? ABSOLUTION_INSIGHT_COST;
  if (extras?.absolved) {
    state.absolvedItems = { [relicId]: true };
  }
  return state;
}

describe("itemAbsolution", () => {
  it("shows the badge for a madness relic once the book is owned", () => {
    const state = withBookAndRelic("unnamed_book", { insight: 0 });
    expect(getItemMadnessAmount(state, "unnamed_book")).toBeGreaterThan(0);
    expect(shouldShowAbsolveBadge(state, "unnamed_book")).toBe(true);
    expect(canAbsolveItem(state, "unnamed_book")).toBe(false);
  });

  it("allows a cleanse when Insight is enough, then hides the badge", () => {
    const state = withBookAndRelic("unnamed_book");
    expect(canAbsolveItem(state, "unnamed_book")).toBe(true);

    const after = {
      ...state,
      absolvedItems: { unnamed_book: true },
    };
    expect(isItemAbsolved(after, "unnamed_book")).toBe(true);
    expect(shouldShowAbsolveBadge(after, "unnamed_book")).toBe(false);
    expect(canAbsolveItem(after, "unnamed_book")).toBe(false);
  });

  it("excludes the Feeding Ring", () => {
    const state = withBookAndRelic("unnamed_book", { feedingRing: true });
    expect(getItemMadnessAmount(state, "feeding_ring")).toBeGreaterThan(0);
    expect(shouldShowAbsolveBadge(state, "feeding_ring")).toBe(false);
    expect(canAbsolveItem(state, "feeding_ring")).toBe(false);
  });

  it("does not show without the book", () => {
    const state = withBookAndRelic("unnamed_book");
    state.books.book_of_absolution = false;
    expect(shouldShowAbsolveBadge(state, "unnamed_book")).toBe(false);
  });

  it("reduces item madness by 1 in total effects", () => {
    const before = withBookAndRelic("unnamed_book");
    const after = withBookAndRelic("unnamed_book", { absolved: true });
    const beforeMadness = calculateTotalEffects(before).statBonuses.madness;
    const afterMadness = calculateTotalEffects(after).statBonuses.madness;
    expect(afterMadness).toBe(beforeMadness - 1);
    expect(getAbsolvedItemMadnessAmount(after, "unnamed_book")).toBe(
      getItemMadnessAmount(after, "unnamed_book") - 1,
    );
  });

  it("absolveItem spends Insight and records the item once", () => {
    useGameStore.getState().initialize(withBookAndRelic("unnamed_book"));

    const ok = useGameStore.getState().absolveItem("unnamed_book");
    expect(ok).toBe(true);

    const next = useGameStore.getState();
    expect(next.absolvedItems.unnamed_book).toBe(true);
    expect(next.resources.insight).toBe(0);
    expect(useGameStore.getState().absolveItem("unnamed_book")).toBe(false);
  });

  it("keeps the rite through save allowlist + load hydrate", () => {
    useGameStore.getState().initialize(withBookAndRelic("unnamed_book"));
    expect(useGameStore.getState().absolveItem("unnamed_book")).toBe(true);

    const persisted = buildGameState(useGameStore.getState());
    expect(persisted.absolvedItems.unnamed_book).toBe(true);
    expect(persisted.resources.insight).toBe(0);

    const hydrated = hydrateLoadedGameState(persisted);
    expect(hydrated.absolvedItems.unnamed_book).toBe(true);
    expect(isItemAbsolved(hydrated, "unnamed_book")).toBe(true);
    expect(shouldShowAbsolveBadge(hydrated, "unnamed_book")).toBe(false);
    expect(calculateTotalEffects(hydrated).statBonuses.madness).toBe(
      calculateTotalEffects(withBookAndRelic("unnamed_book")).statBonuses
        .madness - 1,
    );
  });
});

describe("itemAbsolution — i18n parity", () => {
  it("defines the absolve tooltip in every supported language", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const path = `client/src/i18n/locales/${locale}/ui/tooltips.json`;
      const json = parseLocaleJson(fs.readFileSync(path, "utf8")) as {
        tooltips?: { absolveMadnessForInsight?: string };
      };
      expect(
        json.tooltips?.absolveMadnessForInsight,
        `absolveMadnessForInsight missing in ${locale}`,
      ).toBeTruthy();
    }
  });
});
