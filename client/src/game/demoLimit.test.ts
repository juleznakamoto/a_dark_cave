import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteSaveMock,
  restartGameMock,
  setGalaxyTimeUpDialogOpenMock,
  setStateMock,
  woodenHutCountRef,
  galaxyTimeUpDialogOpenRef,
  demoEndDialogDismissedRef,
  eventGateRef,
} = vi.hoisted(() => {
  const woodenHutCountRef = { current: 0 };
  const galaxyTimeUpDialogOpenRef = { current: false };
  const demoEndDialogDismissedRef = { current: false };
  const eventGateRef = {
    current: {
      dialogHandoffPending: false,
      eventDialog: { isOpen: false, currentEvent: null as unknown },
      combatDialog: { isOpen: false },
      rewardDialog: { isOpen: false },
      madnessDialog: { isOpen: false },
      villageEffectDialog: { isOpen: false },
      insightPotionDialog: { isOpen: false },
    },
  };

  return {
    deleteSaveMock: vi.fn(async () => { }),
    restartGameMock: vi.fn(async () => { }),
    setGalaxyTimeUpDialogOpenMock: vi.fn(),
    setStateMock: vi.fn(),
    woodenHutCountRef,
    galaxyTimeUpDialogOpenRef,
    demoEndDialogDismissedRef,
    eventGateRef,
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
      ...eventGateRef.current,
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
      ...eventGateRef.current,
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
  isDemoEndBlockedByOngoingEvent,
  isDemoPlayFrozen,
  canResolveOpenEventDuringDemoEnd,
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
    eventGateRef.current = {
      dialogHandoffPending: false,
      eventDialog: { isOpen: false, currentEvent: null },
      combatDialog: { isOpen: false },
      rewardDialog: { isOpen: false },
      madnessDialog: { isOpen: false },
      villageEffectDialog: { isOpen: false },
      insightPotionDialog: { isOpen: false },
    };
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

  it("waits to open the demo-end dialog while an event is still resolving", () => {
    woodenHutCountRef.current = DEMO_WOODEN_HUT_LIMIT;
    eventGateRef.current.eventDialog = {
      isOpen: true,
      currentEvent: { id: "hiddenLake" },
    };

    processDemoLimit();

    expect(setStateMock).not.toHaveBeenCalled();
    expect(isDemoEndBlockedByOngoingEvent(eventGateRef.current)).toBe(true);
  });

  it("waits to open the demo-end dialog during the conclusion handoff", () => {
    woodenHutCountRef.current = DEMO_WOODEN_HUT_LIMIT;
    eventGateRef.current.dialogHandoffPending = true;

    processDemoLimit();

    expect(setStateMock).not.toHaveBeenCalled();
  });

  it("waits to open the demo-end dialog while an outcome dialog is open", () => {
    woodenHutCountRef.current = DEMO_WOODEN_HUT_LIMIT;
    eventGateRef.current.rewardDialog = { isOpen: true };

    processDemoLimit();

    expect(setStateMock).not.toHaveBeenCalled();
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

  it("lets an open event resolve after the hut cap, until the end screen is up", () => {
    const openLake = {
      buildings: { woodenHut: DEMO_WOODEN_HUT_LIMIT },
      eventDialog: { isOpen: true, currentEvent: { id: "hiddenLake" } },
    };
    expect(canResolveOpenEventDuringDemoEnd(openLake)).toBe(true);
    expect(shouldDismissEventWithoutApplying(openLake, { viewOnly: false })).toBe(
      false,
    );

    const endScreenUp = {
      ...openLake,
      galaxyTimeUpDialogOpen: true,
    };
    expect(canResolveOpenEventDuringDemoEnd(endScreenUp)).toBe(false);
    expect(
      shouldDismissEventWithoutApplying(endScreenUp, { viewOnly: false }),
    ).toBe(true);
  });

  it("starts a new demo run from the dialog", async () => {
    await startNewDemoGame();

    expect(setGalaxyTimeUpDialogOpenMock).toHaveBeenCalledWith(false);
    expect(deleteSaveMock).toHaveBeenCalled();
    expect(restartGameMock).toHaveBeenCalled();
  });
});
