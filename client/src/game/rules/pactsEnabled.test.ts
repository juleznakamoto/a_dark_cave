import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isSteamDesktopEditionActive: vi.fn(() => false),
  };
});

import { isSteamDesktopEditionActive } from "@/lib/edition";
import { PACTS_ENABLED } from "@/lib/featureFlags";
import { gamblerDoubleOfferOnWin, gamblerRageOnWin } from "@/game/gamblerSession";
import { createInitialState } from "@/game/state";
import { getSidePanelModel } from "@/game/sidePanelModel";
import {
  applyTradePostBuyCost,
  getHeartfireProductionPerLevel,
  getPactMadness,
  hasAllPactsActive,
  hasChosenPact,
  hasEarnedPactOffer,
  hasHuntressPriorSlot,
  HEARTFIRE_BASE_PRODUCTION_PER_LEVEL,
  PACT_IDS,
  resolvePactOfferForLoad,
  resolvePactOfferForNewRun,
  shouldOpenPactOffer,
} from "./pacts";

afterEach(() => {
  vi.mocked(isSteamDesktopEditionActive).mockReset();
  vi.mocked(isSteamDesktopEditionActive).mockReturnValue(false);
});

describe("PACTS_ENABLED", () => {
  it("runs pact boons on non-Steam versions", () => {
    expect(PACTS_ENABLED).toBe(true);
    expect(hasEarnedPactOffer(1)).toBe(true);
    expect(shouldOpenPactOffer(3)).toBe(true);
    expect(
      hasChosenPact({ chosenPacts: ["blazesmith"] }, "blazesmith"),
    ).toBe(true);
    expect(getPactMadness(["blazesmith", "full_larders"])).toBe(6);
    expect(hasAllPactsActive([...PACT_IDS])).toBe(true);
    expect(
      getHeartfireProductionPerLevel({
        blessings: { ebon_grace: true },
        chosenPacts: ["blazesmith"],
      }),
    ).toBe(HEARTFIRE_BASE_PRODUCTION_PER_LEVEL * 3);
    expect(
      applyTradePostBuyCost("tradeGoldForFood", 100, {
        chosenPacts: ["cunning_trader"],
      }),
    ).toBe(80);
    expect(
      hasHuntressPriorSlot({
        chosenPacts: ["full_larders"],
        fellowship: { ashwraith_huntress: true },
        story: { seen: { huntressHunts: true } },
      }),
    ).toBe(true);
    expect(
      gamblerDoubleOfferOnWin(
        { chosenPacts: ["avid_apprentices"] },
        50,
        () => 0,
      ),
    ).toBe(true);
    expect(
      gamblerRageOnWin(
        { chosenPacts: ["avid_apprentices"] },
        true,
        () => 0,
      ),
    ).toBe(false);

    const withPact = {
      ...createInitialState(),
      chosenPacts: ["blazesmith" as const],
    };
    expect(getSidePanelModel(withPact).pactIds).toEqual(["blazesmith"]);
    expect(getSidePanelModel(withPact).madnessFromPacts).toBe(3);

    expect(resolvePactOfferForNewRun(2)).toEqual({
      pactOfferPending: true,
      pactOfferDialogOpen: true,
    });
    expect(resolvePactOfferForNewRun(0)).toEqual({
      pactOfferPending: false,
      pactOfferDialogOpen: false,
    });
    expect(resolvePactOfferForLoad(2, true)).toEqual({
      pactOfferPending: true,
      pactOfferDialogOpen: true,
    });
    expect(resolvePactOfferForLoad(0, true)).toEqual({
      pactOfferPending: false,
      pactOfferDialogOpen: false,
    });
  });

  it("keeps pacts off on the Steam desktop version", () => {
    vi.mocked(isSteamDesktopEditionActive).mockReturnValue(true);

    expect(hasEarnedPactOffer(1)).toBe(true);
    expect(shouldOpenPactOffer(3)).toBe(false);
    expect(
      hasChosenPact({ chosenPacts: ["blazesmith"] }, "blazesmith"),
    ).toBe(false);
    expect(getPactMadness(["blazesmith", "full_larders"])).toBe(0);
    expect(hasAllPactsActive([...PACT_IDS])).toBe(false);
    expect(
      getHeartfireProductionPerLevel({
        blessings: { ebon_grace: true },
        chosenPacts: ["blazesmith"],
      }),
    ).toBe(HEARTFIRE_BASE_PRODUCTION_PER_LEVEL * 2);
    expect(
      applyTradePostBuyCost("tradeGoldForFood", 100, {
        chosenPacts: ["cunning_trader"],
      }),
    ).toBe(100);
    expect(
      hasHuntressPriorSlot({
        chosenPacts: ["full_larders"],
        fellowship: { ashwraith_huntress: true },
        story: { seen: { huntressHunts: true } },
      }),
    ).toBe(false);
    expect(
      gamblerDoubleOfferOnWin(
        { chosenPacts: ["avid_apprentices"] },
        50,
        () => 0,
      ),
    ).toBe(false);

    const withPact = {
      ...createInitialState(),
      chosenPacts: ["blazesmith" as const],
    };
    expect(getSidePanelModel(withPact).pactIds).toEqual([]);
    expect(getSidePanelModel(withPact).madnessFromPacts).toBe(0);

    expect(resolvePactOfferForNewRun(2)).toEqual({
      pactOfferPending: true,
      pactOfferDialogOpen: false,
    });
    expect(resolvePactOfferForLoad(2, true)).toEqual({
      pactOfferPending: true,
      pactOfferDialogOpen: false,
    });
  });
});
