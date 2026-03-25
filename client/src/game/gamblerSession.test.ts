import { describe, expect, it } from "vitest";
import {
  createDefaultGamblerSession,
  gamblerDiceResumeOnLoad,
  resolveGamblerSessionForHydrate,
} from "./gamblerSession";
import type { GameState } from "@shared/schema";

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

  it("resolveGamblerSessionForHydrate defaults legacy wager-only saves to playerTurn", () => {
    const gg = {
      wager: 50,
      stakeNotYetDeducted: true,
    } as NonNullable<GameState["gamblerGame"]>;
    const s = resolveGamblerSessionForHydrate(gg);
    expect(s.phase).toBe("playerTurn");
    expect(s.playerTotal).toBe(0);
  });

  it("resolveGamblerSessionForHydrate strips legacy hasReroll from session", () => {
    const session = {
      ...createDefaultGamblerSession("playerTurn"),
      hasReroll: true,
    } as NonNullable<GameState["gamblerGame"]>["session"] & { hasReroll: boolean };
    const gg = {
      wager: 10,
      stakeNotYetDeducted: true,
      session,
    } as NonNullable<GameState["gamblerGame"]>;
    const s = resolveGamblerSessionForHydrate(gg);
    expect("hasReroll" in s).toBe(false);
  });
});
