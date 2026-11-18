/**
 * Semantic haptics for the iOS app. Named by meaning so call sites stay stable
 * when the underlying Capacitor preset is retuned.
 *
 * A plain button tap is Light. A click that already played a stronger cue
 * (Insight, combat, sleep, and so on) must not also play that Light tap.
 * Call `armClickHaptic` at the start of the click, then `playButtonHaptic`.
 *
 * No-op on web/Steam (plugin stubbed) and when the player disables haptics.
 */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isIosBuild } from "@/lib/edition";
import { tryGetBoundGameStore } from "@/game/gameStoreHolder";
import { logger } from "@/lib/logger";

export type HapticEvent =
  | "button"
  | "selection"
  | "makeFire"
  | "feedFire"
  | "blastGate"
  | "priorBadge"
  | "insight"
  | "newVillager"
  | "tabUnlock"
  | "event"
  | "madnessEvent"
  | "villagerDeath"
  | "combatFight"
  | "combatItemOrSkill"
  | "combatVictory"
  | "combatDefeat"
  | "achievement"
  | "claimAchievementReward"
  | "estateSkill"
  | "wanderersLantern"
  | "sleep"
  | "mapCoin"
  | "logFilter";

type HapticPreset =
  | { kind: "impact"; style: (typeof ImpactStyle)[keyof typeof ImpactStyle] }
  | {
      kind: "notification";
      type: (typeof NotificationType)[keyof typeof NotificationType];
    }
  | { kind: "selection" };

const HAPTIC_PRESETS: Record<HapticEvent, HapticPreset> = {
  button: { kind: "impact", style: ImpactStyle.Light },
  selection: { kind: "selection" },
  makeFire: { kind: "impact", style: ImpactStyle.Heavy },
  feedFire: { kind: "impact", style: ImpactStyle.Medium },
  blastGate: { kind: "impact", style: ImpactStyle.Heavy },
  priorBadge: { kind: "impact", style: ImpactStyle.Medium },
  insight: { kind: "impact", style: ImpactStyle.Medium },
  newVillager: { kind: "impact", style: ImpactStyle.Light },
  tabUnlock: { kind: "notification", type: NotificationType.Success },
  event: { kind: "impact", style: ImpactStyle.Medium },
  madnessEvent: { kind: "notification", type: NotificationType.Warning },
  villagerDeath: { kind: "notification", type: NotificationType.Warning },
  combatFight: { kind: "impact", style: ImpactStyle.Heavy },
  combatItemOrSkill: { kind: "impact", style: ImpactStyle.Medium },
  combatVictory: { kind: "notification", type: NotificationType.Success },
  combatDefeat: { kind: "notification", type: NotificationType.Error },
  achievement: { kind: "notification", type: NotificationType.Success },
  claimAchievementReward: { kind: "impact", style: ImpactStyle.Medium },
  estateSkill: { kind: "impact", style: ImpactStyle.Medium },
  wanderersLantern: { kind: "impact", style: ImpactStyle.Medium },
  sleep: { kind: "notification", type: NotificationType.Success },
  mapCoin: { kind: "impact", style: ImpactStyle.Medium },
  logFilter: { kind: "impact", style: ImpactStyle.Light },
};

/** True after this click already played a haptic. Reset by `armClickHaptic`. */
let clickHapticPlayed = false;

export function armClickHaptic(): void {
  clickHapticPlayed = false;
}

function isHapticsMuted(): boolean {
  const store = tryGetBoundGameStore();
  if (!store) return false;
  return store.getState().hapticsMuted === true;
}

/**
 * iOS drops `selectionChanged` until `selectionStart` creates the generator.
 * Keep that generator while +/− is held, then start a fresh one after a pause.
 */
let selectionSession: Promise<void> | null = null;
let selectionTouchedAt = 0;
const SELECTION_SESSION_MS = 1500;

function playSelectionTick(): Promise<void> {
  const now = Date.now();
  if (!selectionSession || now - selectionTouchedAt > SELECTION_SESSION_MS) {
    selectionSession = Haptics.selectionStart().catch((error: unknown) => {
      selectionSession = null;
      throw error;
    });
  }
  selectionTouchedAt = now;
  return selectionSession.then(() => Haptics.selectionChanged()).catch((error: unknown) => {
    selectionSession = null;
    throw error;
  });
}

function fireHaptic(event: HapticEvent): void {
  if (!isIosBuild) return;
  if (isHapticsMuted()) return;

  const preset = HAPTIC_PRESETS[event];
  const run =
    preset.kind === "impact"
      ? Haptics.impact({ style: preset.style })
      : preset.kind === "notification"
        ? Haptics.notification({ type: preset.type })
        : playSelectionTick();

  void run.catch((error) => {
    logger.warn("[haptics] failed:", error);
  });
}

/** Fire a named haptic. Safe to call from any edition; only iOS plays it. */
export function playHaptic(event: HapticEvent): void {
  clickHapticPlayed = true;
  fireHaptic(event);
}

/**
 * Light tap for a button press. Skips when this click already played a cue,
 * so Insight, combat, and sleep do not also buzz as a plain button.
 */
export function playButtonHaptic(): void {
  if (clickHapticPlayed) return;
  playHaptic("button");
}

/** Medium tap when this change actually spent Insight. */
export function playInsightHapticIfSpent(
  before: number | undefined,
  after: number | undefined,
): void {
  if (typeof after === "number" && after < (before ?? 0)) {
    playHaptic("insight");
  }
}
