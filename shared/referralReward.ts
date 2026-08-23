import { REFERRAL_REWARD_GOLD, type GameState } from "./schema";

const INVITEE_LOG_NEEDLE = "invited by someone";

export function hasInviteeReferralLog(
  log: GameState["log"] | undefined,
): boolean {
  return (log ?? []).some(
    (entry) =>
      typeof entry?.message === "string" &&
      entry.message.includes(INVITEE_LOG_NEEDLE),
  );
}

/**
 * Grant invitee gold once when referralProcessed flips false → true.
 * Does not copy gold from a cloud snapshot (that snapshot may be stale).
 * If the invitee log is already present, only restore the processed flag:
 * a wiped flag on an already-paid save must not pay again.
 */
export function withInviteeReferralGold<T extends Pick<GameState, "resources" | "log">>(
  state: T,
  referralCode?: string,
): T & { referralProcessed: true; referralCode?: string } {
  const alreadyPaid = hasInviteeReferralLog(state.log);
  const next = {
    ...state,
    referralProcessed: true as const,
    ...(referralCode ? { referralCode } : {}),
  };

  if (alreadyPaid) {
    return next;
  }

  return {
    ...next,
    resources: {
      ...state.resources,
      gold: (state.resources?.gold ?? 0) + REFERRAL_REWARD_GOLD,
    },
    log: [
      ...(state.log ?? []),
      {
        id: `referral-bonus-new-${Date.now()}`,
        message: `You were invited by someone to this world! +${REFERRAL_REWARD_GOLD} Gold`,
        timestamp: Date.now(),
        type: "system" as const,
      },
    ].slice(-100),
  };
}
