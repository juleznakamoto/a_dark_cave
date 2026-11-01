import { describe, expect, it } from "vitest";
import {
  applyGamblerRage,
  createDefaultGamblerSession,
  GAMBLER_BANNED_SEEN_KEY,
  GAMBLER_ENRAGED_SEEN_KEY,
  GAMBLER_EVENT_SEEN_KEY,
  gamblerCoinOfferOnWin,
  gamblerDiceResumeOnLoad,
  gamblerRageOnWin,
  getGamblerTutorialPlaysRemaining,
  hasGamblerAppearedOnce,
  isGamblerPaidWin,
  resolveGamblerSessionForHydrate,
} from "./gamblerSession";
import { EventManager } from "./rules/events";
import { gamblerEvents } from "./rules/eventsGambler";
import type { GameState } from "@shared/schema";
import { createInitialState } from "./state";

const activeGamblerTab = {
  isActive: true,
  event: {
    id: "gambler-resume-test",
    message: "test",
    timestamp: Date.now(),
    type: "event" as const,
  },
  expiryTime: Date.now() + 600_000,
};

describe("hasGamblerAppearedOnce", () => {
  it("does not require playing a gambler round", () => {
    const state = {
      ...createInitialState(),
      story: {
        seen: { [GAMBLER_EVENT_SEEN_KEY]: true },
        merchantPurchases: 0,
      },
    };
    expect(hasGamblerAppearedOnce(state)).toBe(true);
  });

  it("is set when the gambler timed tab opens", async () => {
    const { useGameStore } = await import("./state");
    useGameStore.getState().initialize();
    await useGameStore.getState().setTimedEventTab(
      true,
      {
        id: "gambler-test",
        eventId: "gambler",
        message: "A stranger offers dice.",
        title: "The Obsessed Gambler",
        type: "event",
        timestamp: Date.now(),
      },
      4 * 60 * 1000,
    );

    const after = useGameStore.getState();
    expect(after.story?.seen?.[GAMBLER_EVENT_SEEN_KEY]).toBe(true);
    expect(hasGamblerAppearedOnce(after)).toBe(true);
  });
});

describe("gamblerSession", () => {
  it("gamblerDiceResumeOnLoad opens timed tab when gambler event is active and round is in progress", () => {
    expect(
      gamblerDiceResumeOnLoad({
        timedEventTab: activeGamblerTab,
        gamblerGame: {
          wager: 50,
          stakeNotYetDeducted: true,
          session: createDefaultGamblerSession("playerTurn"),
        },
      }),
    ).toEqual({
      activeTab: "timedevent",
      gamblerDiceDialogOpen: true,
    });
  });

  it("gamblerDiceResumeOnLoad opens timed tab when outcome screen is persisted", () => {
    expect(
      gamblerDiceResumeOnLoad({
        timedEventTab: activeGamblerTab,
        gamblerGame: {
          wager: 50,
          outcome: "win",
          outcomeSnapshot: { playerTotal: 10, npcTotal: 8, goal: 15 },
        },
      }),
    ).toEqual({
      activeTab: "timedevent",
      gamblerDiceDialogOpen: true,
    });
  });

  it("gamblerDiceResumeOnLoad stays on cave when timed tab is not the gambler", () => {
    expect(
      gamblerDiceResumeOnLoad({
        timedEventTab: {
          ...activeGamblerTab,
          event: { ...activeGamblerTab.event, id: "merchant-1" },
        },
        gamblerGame: {
          wager: 50,
          session: createDefaultGamblerSession("playerTurn"),
        },
      }),
    ).toEqual({ activeTab: "cave", gamblerDiceDialogOpen: false });
  });

  it("gamblerDiceResumeOnLoad stays on cave when gambler timed event is inactive", () => {
    expect(
      gamblerDiceResumeOnLoad({
        timedEventTab: { isActive: false, event: null, expiryTime: 0 },
        gamblerGame: {
          wager: 50,
          session: createDefaultGamblerSession("playerTurn"),
        },
      }),
    ).toEqual({ activeTab: "cave", gamblerDiceDialogOpen: false });
  });

  it("gamblerDiceResumeOnLoad opens timed tab when only bone-dice round credits remain", () => {
    expect(
      gamblerDiceResumeOnLoad({
        timedEventTab: activeGamblerTab,
        gamblerGame: { roundsRemainingThisEvent: 1 },
      }),
    ).toEqual({
      activeTab: "timedevent",
      gamblerDiceDialogOpen: true,
    });
  });

  it("resolveGamblerSessionForHydrate uses stored session when present", () => {
    const session = createDefaultGamblerSession("npcTurn");
    session.playerTotal = 11;
    const gg = {
      wager: 25,
      stakeNotYetDeducted: true,
      session,
    } as NonNullable<GameState["gamblerGame"]>;
    expect(resolveGamblerSessionForHydrate(gg).phase).toBe("npcTurn");
    expect(resolveGamblerSessionForHydrate(gg).playerTotal).toBe(11);
  });

  it("resolveGamblerSessionForHydrate defaults missing session to playerTurn", () => {
    const gg = {
      wager: 50,
      stakeNotYetDeducted: true,
    } as NonNullable<GameState["gamblerGame"]>;
    const s = resolveGamblerSessionForHydrate(gg);
    expect(s.phase).toBe("playerTurn");
    expect(s.playerTotal).toBe(0);
  });
});

describe("gambler practice and coin offer", () => {
  it("keeps practice rounds on the first playthrough only", () => {
    const first = createInitialState();
    expect(getGamblerTutorialPlaysRemaining(first)).toBe(2);
    expect(
      getGamblerTutorialPlaysRemaining({ ...first, lifetimeGamesWon: 1 }),
    ).toBe(0);
  });

  it("offers the coin after a paid win only with Avid Apprentices", () => {
    const cursed = { chosenCurses: ["avid_apprentices"] as const };
    expect(gamblerCoinOfferOnWin(cursed, 50, () => 0.24)).toBe(true);
    expect(gamblerCoinOfferOnWin(cursed, 50, () => 0.25)).toBe(false);
    expect(gamblerCoinOfferOnWin(cursed, 0, () => 0)).toBe(false);
    expect(gamblerCoinOfferOnWin({ chosenCurses: [] }, 50, () => 0)).toBe(false);
  });
});

describe("gambler rage after a paid win", () => {
  function cursedVillage() {
    const state = createInitialState();
    return {
      ...state,
      chosenCurses: ["avid_apprentices"],
      villagers: { ...state.villagers, free: 4 },
      resources: { ...state.resources, gold: 20 },
      buildings: { ...state.buildings, woodenHut: 4 },
      stats: { ...state.stats, madnessFromEvents: 5 },
    };
  }

  it("rolls only for a cursed paid win while a villager is home", () => {
    const state = cursedVillage();
    expect(isGamblerPaidWin({ wager: 50, outcome: "win", goldDelta: 50 })).toBe(
      true,
    );
    expect(isGamblerPaidWin({ wager: 0, outcome: "win", goldDelta: 0 })).toBe(
      false,
    );
    expect(isGamblerPaidWin({ wager: 50, outcome: "lose", goldDelta: 0 })).toBe(
      false,
    );
    expect(gamblerRageOnWin(state, true, () => 0.19)).toBe(true);
    expect(gamblerRageOnWin(state, true, () => 0.2)).toBe(false);
    expect(gamblerRageOnWin(state, false, () => 0)).toBe(false);
    expect(
      gamblerRageOnWin({ ...state, chosenCurses: [] }, true, () => 0),
    ).toBe(false);
    expect(
      gamblerRageOnWin(
        { ...state, villagers: { ...state.villagers, free: 0 } },
        true,
        () => 0,
      ),
    ).toBe(false);
    expect(
      gamblerRageOnWin(
        {
          ...state,
          story: {
            ...state.story,
            seen: { [GAMBLER_ENRAGED_SEEN_KEY]: true },
          },
        },
        true,
        () => 0,
      ),
    ).toBe(false);
  });

  it("kills one villager once, and banning keeps the gambler away", () => {
    const state = cursedVillage();
    const patch = applyGamblerRage(state);
    expect(patch?.villagers?.free).toBe(3);
    expect(patch?.story?.seen?.[GAMBLER_ENRAGED_SEEN_KEY]).toBe(true);
    expect(patch?.log?.some((entry) => entry.logKey === "gambler.enraged")).toBe(
      true,
    );
    expect(applyGamblerRage({ ...state, villagers: { ...state.villagers, free: 0 } })).toBe(
      null,
    );

    const afterKill = { ...state, ...patch };
    const banned = EventManager.applyEventChoice(afterKill, "ban", "gamblerEnraged");
    expect(banned.stats?.madnessFromEvents).toBe(3);
    expect(banned.story?.seen?.[GAMBLER_BANNED_SEEN_KEY]).toBe(true);

    const spared = EventManager.applyEventChoice(
      afterKill,
      "letReturn",
      "gamblerEnraged",
    );
    expect(spared.story?.seen?.[GAMBLER_BANNED_SEEN_KEY]).toBeUndefined();
    expect(spared.stats?.madnessFromEvents).toBe(6);

    expect(gamblerEvents.gambler.condition(afterKill)).toBe(true);
    expect(
      gamblerEvents.gambler.condition({
        ...afterKill,
        story: banned.story ?? afterKill.story,
      }),
    ).toBe(false);
  });
});
