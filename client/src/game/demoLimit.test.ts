import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteSaveMock,
  restartGameMock,
  setGalaxyTimeUpDialogOpenMock,
  setStateMock,
  woodenHutCountRef,
  galaxyTimeUpDialogOpenRef,
  demoEndDialogDismissedRef,
} = vi.hoisted(() => {
  const woodenHutCountRef = { current: 0 };
  const galaxyTimeUpDialogOpenRef = { current: false };
  const demoEndDialogDismissedRef = { current: false };

  return {
    deleteSaveMock: vi.fn(async () => { }),
    restartGameMock: vi.fn(async () => { }),
    setGalaxyTimeUpDialogOpenMock: vi.fn(),
    setStateMock: vi.fn(),
    woodenHutCountRef,
    galaxyTimeUpDialogOpenRef,
    demoEndDialogDismissedRef,
  };
});

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isDemoEdition: vi.fn(() => true),
  };
});

vi.mock("@/game/save", () => ({
  deleteSave: deleteSaveMock,
}));

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({
      buildings: { woodenHut: woodenHutCountRef.current },
      galaxyTimeUpDialogOpen: galaxyTimeUpDialogOpenRef.current,
      demoEndDialogDismissed: demoEndDialogDismissedRef.current,
      setGalaxyTimeUpDialogOpen: setGalaxyTimeUpDialogOpenMock,
      restartGame: restartGameMock,
    }),
    setState: setStateMock,
  },
}));

vi.mock("@/game/gameStoreHolder", () => ({
  getBoundGameStore: () => ({
    getState: () => ({
      buildings: { woodenHut: woodenHutCountRef.current },
      galaxyTimeUpDialogOpen: galaxyTimeUpDialogOpenRef.current,
      demoEndDialogDismissed: demoEndDialogDismissedRef.current,
    }),
    setState: setStateMock,
  }),
}));

import {
  DEMO_DARK_ESTATE_RESOURCE_COST,
  DEMO_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
  DEMO_WOODEN_HUT_LIMIT,
  FULL_DARK_ESTATE_RESOURCE_COST,
  FULL_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
  CRUEL_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
  getDarkEstateResourceCost,
  getDemoProgressCompleted,
  getDemoProgressSegmentCount,
  getDisgracedPriorMinWoodenHuts,
  isDemoLimitReached,
  isDemoLimitReachedFromState,
  isDemoPlayFrozen,
  shouldDismissEventWithoutApplying,
  processDemoLimit,
  startNewDemoGame,
} from "./demoLimit";
import { isDemoEdition, setDevGameModeOverride } from "@/lib/edition";

const isDemoEditionMock = vi.mocked(isDemoEdition);

describe("demoLimit", () => {
  beforeEach(() => {
    woodenHutCountRef.current = 0;
    galaxyTimeUpDialogOpenRef.current = false;
    demoEndDialogDismissedRef.current = false;
    deleteSaveMock.mockClear();
    restartGameMock.mockClear();
    setGalaxyTimeUpDialogOpenMock.mockClear();
    setStateMock.mockClear();
    setDevGameModeOverride("normal");
    isDemoEditionMock.mockReturnValue(true);
  });

  it("halves Dark Estate cost and lowers the Prior hut gate in demo", () => {
    expect(getDarkEstateResourceCost()).toBe(DEMO_DARK_ESTATE_RESOURCE_COST);
    expect(getDisgracedPriorMinWoodenHuts(false)).toBe(
      DEMO_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
    );
    expect(getDisgracedPriorMinWoodenHuts(true)).toBe(
      DEMO_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
    );
  });

  it("keeps full-game Dark Estate cost and Prior hut gates outside demo", () => {
    isDemoEditionMock.mockReturnValue(false);
    expect(getDarkEstateResourceCost()).toBe(FULL_DARK_ESTATE_RESOURCE_COST);
    expect(getDisgracedPriorMinWoodenHuts(false)).toBe(
      FULL_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
    );
    expect(getDisgracedPriorMinWoodenHuts(true)).toBe(
      CRUEL_DISGRACED_PRIOR_MIN_WOODEN_HUTS,
    );
  });

  it("detects when the wooden hut limit is reached", () => {
    expect(isDemoLimitReached(DEMO_WOODEN_HUT_LIMIT - 1)).toBe(false);
    expect(isDemoLimitReached(DEMO_WOODEN_HUT_LIMIT)).toBe(true);
  });

  it("reads wooden hut count from game state", () => {
    expect(
      isDemoLimitReachedFromState({
        buildings: { woodenHut: DEMO_WOODEN_HUT_LIMIT },
      }),
    ).toBe(true);
  });

  it("uses eight wooden-hut progress segments", () => {
    expect(getDemoProgressSegmentCount()).toBe(8);
    expect(
      getDemoProgressCompleted({ woodenHut: 8, stoneHut: 99 }),
    ).toBe(8);
    expect(getDemoProgressCompleted({ woodenHut: 3 })).toBe(3);
  });

  it("opens the demo-end dialog when the limit is reached", () => {
    woodenHutCountRef.current = DEMO_WOODEN_HUT_LIMIT;

    processDemoLimit();

    expect(setStateMock).toHaveBeenCalledWith({
      galaxyTimeUpDialogOpen: true,
    });
  });

  it("does not reopen the dialog after the player closes it", () => {
    woodenHutCountRef.current = DEMO_WOODEN_HUT_LIMIT;
    demoEndDialogDismissedRef.current = true;

    processDemoLimit();

    expect(setStateMock).not.toHaveBeenCalled();
  });

  it("does not reopen the dialog when it is already open", () => {
    woodenHutCountRef.current = DEMO_WOODEN_HUT_LIMIT;
    galaxyTimeUpDialogOpenRef.current = true;

    processDemoLimit();

    expect(setStateMock).not.toHaveBeenCalled();
  });

  it("freezes play at the wooden hut cap", () => {
    expect(isDemoPlayFrozen({ buildings: { woodenHut: DEMO_WOODEN_HUT_LIMIT - 1 } })).toBe(false);
    expect(isDemoPlayFrozen({ buildings: { woodenHut: DEMO_WOODEN_HUT_LIMIT } })).toBe(true);
  });

  it("freezes play in DEV Demo End mode before the hut cap", () => {
    setDevGameModeOverride("demoEnd");
    expect(isDemoPlayFrozen({ buildings: { woodenHut: 0 } })).toBe(true);
  });

  it("dismisses view-only and demo-end event dialogs without applying", () => {
    expect(
      shouldDismissEventWithoutApplying(
        { buildings: { woodenHut: 0 } },
        { viewOnly: true },
      ),
    ).toBe(true);
    expect(
      shouldDismissEventWithoutApplying(
        { buildings: { woodenHut: 0 } },
        { viewOnly: false },
      ),
    ).toBe(false);
    setDevGameModeOverride("demoEnd");
    expect(
      shouldDismissEventWithoutApplying(
        { buildings: { woodenHut: 0 } },
        { viewOnly: false },
      ),
    ).toBe(true);
  });

  it("starts a new demo run from the dialog", async () => {
    await startNewDemoGame();

    expect(setGalaxyTimeUpDialogOpenMock).toHaveBeenCalledWith(false);
    expect(deleteSaveMock).toHaveBeenCalled();
    expect(restartGameMock).toHaveBeenCalled();
  });
});
