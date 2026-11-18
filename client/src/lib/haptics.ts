/**
 * Semantic haptics for the iOS app. Named by meaning so call sites stay stable
 * when the underlying Capacitor preset is retuned.
 *
 * No-op on web/Steam (plugin stubbed) and when the player disables haptics.
 */
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isIosBuild } from "@/lib/edition";
import { tryGetBoundGameStore } from "@/game/gameStoreHolder";
import { logger } from "@/lib/logger";

export type HapticEvent =
  | "makeFire"
  | "feedFire"
  | "craftOnce"
  | "construct"
  | "purchase"
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
  | "sleep";

type HapticPreset =
  | { kind: "impact"; style: (typeof ImpactStyle)[keyof typeof ImpactStyle] }
  | {
      kind: "notification";
      type: (typeof NotificationType)[keyof typeof NotificationType];
    };

const HAPTIC_PRESETS: Record<HapticEvent, HapticPreset> = {
  makeFire: { kind: "impact", style: ImpactStyle.Heavy },
  feedFire: { kind: "impact", style: ImpactStyle.Light },
  craftOnce: { kind: "impact", style: ImpactStyle.Light },
  construct: { kind: "impact", style: ImpactStyle.Light },
  purchase: { kind: "impact", style: ImpactStyle.Medium },
  newVillager: { kind: "impact", style: ImpactStyle.Light },
  tabUnlock: { kind: "impact", style: ImpactStyle.Light },
  event: { kind: "impact", style: ImpactStyle.Medium },
  madnessEvent: { kind: "notification", type: NotificationType.Warning },
  villagerDeath: { kind: "notification", type: NotificationType.Warning },
  combatFight: { kind: "impact", style: ImpactStyle.Heavy },
  combatItemOrSkill: { kind: "impact", style: ImpactStyle.Medium },
  combatVictory: { kind: "notification", type: NotificationType.Success },
  combatDefeat: { kind: "notification", type: NotificationType.Error },
  achievement: { kind: "notification", type: NotificationType.Success },
  sleep: { kind: "notification", type: NotificationType.Success },
};

function isHapticsMuted(): boolean {
  const store = tryGetBoundGameStore();
  if (!store) return false;
  return store.getState().hapticsMuted === true;
}

/** Fire a named haptic. Safe to call from any edition; only iOS plays it. */
export function playHaptic(event: HapticEvent): void {
  if (!isIosBuild) return;
  if (isHapticsMuted()) return;

  const preset = HAPTIC_PRESETS[event];
  const run =
    preset.kind === "impact"
      ? Haptics.impact({ style: preset.style })
      : Haptics.notification({ type: preset.type });

  void run.catch((error) => {
    logger.warn("[haptics] failed:", error);
  });
}
