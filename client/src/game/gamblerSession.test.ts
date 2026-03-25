import { describe, expect, it } from "vitest";
import {
  createDefaultGamblerSession,
  resolveGamblerSessionForHydrate,
} from "./gamblerSession";
import type { GameState } from "@shared/schema";

describe("gamblerSession", () => {
  it("resolveGamblerSessionForHydrate uses stored session when present", () => {
    const session = createDefaultGamblerSession(false, "npcTurn");
    session.playerTotal = 11;
    const gg = {
      wager: 25,
      stakeNotYetDeducted: true,
      session,
    } as NonNullable<GameState["gamblerGame"]>;
    expect(resolveGamblerSessionForHydrate(gg, false).phase).toBe("npcTurn");
    expect(resolveGamblerSessionForHydrate(gg, false).playerTotal).toBe(11);
  });

  it("resolveGamblerSessionForHydrate defaults legacy wager-only saves to playerTurn", () => {
    const gg = {
      wager: 50,
      stakeNotYetDeducted: true,
    } as NonNullable<GameState["gamblerGame"]>;
    const s = resolveGamblerSessionForHydrate(gg, true);
    expect(s.phase).toBe("playerTurn");
    expect(s.playerTotal).toBe(0);
    expect(s.hasReroll).toBe(true);
  });
});
