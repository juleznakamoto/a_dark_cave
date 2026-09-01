import type { GameTab } from "@/game/types";

/**
 * Named mid-game fixtures for local DEV testing (URL `?devSave=` and Settings).
 * Keep this file free of `state.ts` so the start screen can parse the query
 * without pulling the game store.
 */
export const DEV_SAVE_IDS = [
  "fresh-start",
  "village",
  "sleep-unlocked",
  "sleep-active",
  "bastion",
] as const;

export type DevSaveId = (typeof DEV_SAVE_IDS)[number];

export type DevSaveMeta = {
  id: DevSaveId;
  label: string;
  /** When an agent or human should load this fixture. */
  useWhen: string;
  activeTab: GameTab;
};

export const DEV_SAVE_CATALOG: Record<DevSaveId, DevSaveMeta> = {
  "fresh-start": {
    id: "fresh-start",
    label: "Fresh start",
    useWhen: "Cave-only first minutes after Make Fire",
    activeTab: "cave",
  },
  village: {
    id: "village",
    label: "Village",
    useWhen: "Village tab, huts, jobs, or production",
    activeTab: "village",
  },
  "sleep-unlocked": {
    id: "sleep-unlocked",
    label: "Sleep unlocked",
    useWhen: "Estate tab or the Sleep button (not yet sleeping)",
    activeTab: "estate",
  },
  "sleep-active": {
    id: "sleep-active",
    label: "Sleep active",
    useWhen: "Already sleeping: fog, wake, header clicks, sleep restore",
    activeTab: "estate",
  },
  bastion: {
    id: "bastion",
    label: "Bastion",
    useWhen: "Bastion, Forest, or combat-adjacent chrome (not the combat sandbox)",
    activeTab: "bastion",
  },
};

export function isDevSaveId(value: string | null | undefined): value is DevSaveId {
  return (
    typeof value === "string" &&
    (DEV_SAVE_IDS as readonly string[]).includes(value)
  );
}

export function parseDevSaveId(
  raw: string | null | undefined,
): DevSaveId | null {
  if (!isDevSaveId(raw)) return null;
  return raw;
}
