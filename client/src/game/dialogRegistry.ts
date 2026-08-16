/**
 * Single metadata source for transient dialog store keys:
 * save exclusion, reset-on-load, and blocking pause (except rewardDialog).
 */

export type DialogSliceKind = "boolean" | "objectIsOpen";

export type DialogRegistryEntry = {
  id: string;
  storeKey: string;
  kind: DialogSliceKind;
  /** Contributes to isBlockingDialogOpen (rewardDialog is handled separately). */
  blocking: boolean;
  /** eventDialog only blocks when currentEvent is non-null. */
  blockingPredicate?: "eventDialogWithEvent";
  /** Value merged by getTransientDialogResetOnLoad. */
  resetOnLoad: unknown;
};

const CLOSED_EVENT_DIALOG = { isOpen: false, currentEvent: null, lastEndedAt: 0 };
const CLOSED_COMBAT_DIALOG = {
  isOpen: false,
  enemy: null,
  eventTitle: "",
  eventMessage: "",
  onVictory: null,
  onDefeat: null,
};
const CLOSED_DATA_DIALOG = { isOpen: false, data: null };
const CLOSED_IDLE = { isOpen: false };

export const GAME_DIALOG_REGISTRY: readonly DialogRegistryEntry[] = [
  {
    id: "event",
    storeKey: "eventDialog",
    kind: "objectIsOpen",
    blocking: true,
    blockingPredicate: "eventDialogWithEvent",
    resetOnLoad: CLOSED_EVENT_DIALOG,
  },
  {
    id: "combat",
    storeKey: "combatDialog",
    kind: "objectIsOpen",
    blocking: true,
    resetOnLoad: CLOSED_COMBAT_DIALOG,
  },
  {
    id: "auth",
    storeKey: "authDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "shop",
    storeKey: "shopDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "shopFilter",
    storeKey: "shopFilter",
    kind: "boolean",
    blocking: false,
    resetOnLoad: null,
  },
  {
    id: "shopCruelHighlight",
    storeKey: "shopCruelModeHighlight",
    kind: "boolean",
    blocking: false,
    resetOnLoad: false,
  },
  {
    id: "shopCheckout",
    storeKey: "shopCheckoutItemId",
    kind: "boolean",
    blocking: false,
    resetOnLoad: null,
  },
  {
    id: "invest",
    storeKey: "investDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "investmentResult",
    storeKey: "investmentResultDialog",
    kind: "objectIsOpen",
    blocking: true,
    resetOnLoad: CLOSED_DATA_DIALOG,
  },
  {
    id: "idleMode",
    storeKey: "idleModeDialog",
    kind: "objectIsOpen",
    blocking: true,
    resetOnLoad: CLOSED_IDLE,
  },
  {
    id: "inactivity",
    storeKey: "inactivityDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "restart",
    storeKey: "restartGameDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "deleteAccount",
    storeKey: "deleteAccountDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "settings",
    storeKey: "settingsDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "playlightWelcome",
    storeKey: "playlightWelcomeDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "feedback",
    storeKey: "feedbackDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "socialPrompt",
    storeKey: "socialPromptDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "gamblerDice",
    storeKey: "gamblerDiceDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "blessingOffer",
    storeKey: "blessingOfferDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "reward",
    storeKey: "rewardDialog",
    kind: "objectIsOpen",
    // Blocks sim via isModalDialogOpen, but not isBlockingDialogOpen so deferred
    // dialogs can queue behind rewards.
    blocking: false,
    resetOnLoad: CLOSED_DATA_DIALOG,
  },
  {
    id: "dialogHandoff",
    storeKey: "dialogHandoffPending",
    kind: "boolean",
    // Pause is applied in isModalDialogOpen (not isBlockingDialogOpen) so the
    // scheduled follow-up can still open during the handoff gap.
    blocking: false,
    resetOnLoad: false,
  },
  {
    id: "leaderboard",
    storeKey: "leaderboardDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "share",
    storeKey: "shareDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "galaxyTimeUp",
    storeKey: "galaxyTimeUpDialogOpen",
    kind: "boolean",
    blocking: true,
    resetOnLoad: false,
  },
  {
    id: "madness",
    storeKey: "madnessDialog",
    kind: "objectIsOpen",
    blocking: true,
    resetOnLoad: CLOSED_DATA_DIALOG,
  },
  {
    id: "insightPotion",
    storeKey: "insightPotionDialog",
    kind: "objectIsOpen",
    blocking: true,
    resetOnLoad: CLOSED_DATA_DIALOG,
  },
  {
    id: "villageEffect",
    storeKey: "villageEffectDialog",
    kind: "objectIsOpen",
    blocking: true,
    resetOnLoad: CLOSED_DATA_DIALOG,
  },
] as const;

export function getTransientDialogResetFromRegistry(): Record<string, unknown> {
  const reset: Record<string, unknown> = {};
  for (const entry of GAME_DIALOG_REGISTRY) {
    reset[entry.storeKey] = entry.resetOnLoad;
  }
  return reset;
}

export function getDialogRuntimeOnlyKeys(): readonly string[] {
  return GAME_DIALOG_REGISTRY.map((entry) => entry.storeKey);
}

function isObjectOpen(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    "isOpen" in value &&
    (value as { isOpen?: boolean }).isOpen,
  );
}

export function isBlockingDialogOpenFromRegistry(state: Record<string, unknown>): boolean {
  for (const entry of GAME_DIALOG_REGISTRY) {
    if (!entry.blocking) continue;
    const value = state[entry.storeKey];
    if (entry.blockingPredicate === "eventDialogWithEvent") {
      const dialog = value as { isOpen?: boolean; currentEvent?: unknown } | undefined;
      if (dialog?.isOpen && dialog.currentEvent != null) return true;
      continue;
    }
    if (entry.kind === "boolean") {
      if (value === true) return true;
      continue;
    }
    if (isObjectOpen(value)) return true;
  }
  return false;
}
