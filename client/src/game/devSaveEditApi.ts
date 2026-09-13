import { StateManager, useGameStore } from "@/game/state";
import {
  DEV_SAVE_IDS,
  parseDevSaveId,
  type DevSaveId,
} from "@/game/devSaveIds";
import { applyDevSaveToStore } from "@/game/devSaves";
import type { GameTab } from "@/game/types";

const GAME_TABS = [
  "cave",
  "village",
  "forest",
  "bastion",
  "estate",
  "achievements",
  "timedevent",
] as const satisfies readonly GameTab[];

const NESTED_OBJECT_KEYS = [
  "resources",
  "buildings",
  "villagers",
  "flags",
  "tools",
  "weapons",
  "clothing",
  "relics",
  "blessings",
  "books",
  "schematics",
  "stats",
  "heartfireState",
  "idleModeState",
  "investmentHallState",
  "damagedBuildings",
] as const;

export type DevSaveSnapshot = {
  ok: true;
  fixture: DevSaveId | null;
  tab: GameTab;
  paused: boolean;
  resources: Record<string, number>;
  buildings: Record<string, number>;
  villagers: Record<string, number>;
  flags: Record<string, boolean>;
  tools: Record<string, boolean>;
  weapons: Record<string, boolean>;
};

export type DevSaveEditResult =
  | DevSaveSnapshot
  | { ok: false; error: string };

export type DevSaveEditApi = {
  fixtures: readonly DevSaveId[];
  load: (id: string) => DevSaveEditResult;
  get: () => DevSaveSnapshot;
  patch: (partial: Record<string, unknown>) => DevSaveEditResult;
  pause: () => DevSaveEditResult;
  resume: () => DevSaveEditResult;
  tab: (name: string) => DevSaveEditResult;
};

function isGameTab(value: unknown): value is GameTab {
  return (
    typeof value === "string" &&
    (GAME_TABS as readonly string[]).includes(value)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function getDevSaveSnapshot(): DevSaveSnapshot {
  const state = useGameStore.getState();
  return {
    ok: true,
    fixture: state.activeDevSaveId,
    tab: state.activeTab,
    paused: Boolean(state.isPaused),
    resources: { ...state.resources },
    buildings: { ...state.buildings },
    villagers: { ...state.villagers },
    flags: { ...state.flags },
    tools: { ...state.tools },
    weapons: { ...state.weapons },
  };
}

export function loadDevSave(id: string): DevSaveEditResult {
  const parsed = parseDevSaveId(id);
  if (!parsed) {
    return {
      ok: false,
      error: `Unknown fixture "${id}". Use one of: ${DEV_SAVE_IDS.join(", ")}`,
    };
  }
  applyDevSaveToStore(parsed);
  return getDevSaveSnapshot();
}

function requireFixture(): DevSaveEditResult | null {
  if (useGameStore.getState().activeDevSaveId) return null;
  return {
    ok: false,
    error:
      "Load a fixture first so the edit does not persist. Example: __adcDevSave.load(\"village\")",
  };
}

function sanitizePartial(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (key === "activeDevSaveId") continue;
    if (typeof value === "function") continue;
    next[key] = value;
  }
  return next;
}

function mergeNestedState(
  state: ReturnType<typeof useGameStore.getState>,
  partial: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...partial };

  for (const key of NESTED_OBJECT_KEYS) {
    const incoming = asRecord(partial[key]);
    if (!incoming) continue;
    const current = asRecord(state[key as keyof typeof state]);
    next[key] = { ...(current ?? {}), ...incoming };
  }

  const incomingStory = asRecord(partial.story);
  if (incomingStory) {
    const currentStory = asRecord(state.story) ?? {};
    const currentSeen = asRecord(currentStory.seen) ?? {};
    const incomingSeen = asRecord(incomingStory.seen);
    next.story = {
      ...currentStory,
      ...incomingStory,
      seen: incomingSeen ? { ...currentSeen, ...incomingSeen } : currentSeen,
    };
  }

  if (partial.activeTab !== undefined && !isGameTab(partial.activeTab)) {
    delete next.activeTab;
  }

  return next;
}

function applyStorePatch(partial: Record<string, unknown>): DevSaveSnapshot {
  const state = useGameStore.getState();
  useGameStore.setState(
    mergeNestedState(state, sanitizePartial(partial)) as Partial<
      typeof state
    >,
  );
  StateManager.scheduleEffectsUpdate(useGameStore.getState);
  StateManager.schedulePopulationUpdate(useGameStore.getState);
  return getDevSaveSnapshot();
}

export function patchDevSave(
  partial: Record<string, unknown> | null | undefined,
): DevSaveEditResult {
  const blocked = requireFixture();
  if (blocked) return blocked;
  if (!asRecord(partial)) {
    return { ok: false, error: "patch() needs a plain object." };
  }
  return applyStorePatch(partial);
}

export function setDevSavePaused(paused: boolean): DevSaveEditResult {
  const blocked = requireFixture();
  if (blocked) return blocked;
  return applyStorePatch({ isPaused: paused });
}

export function setDevSaveTab(name: string): DevSaveEditResult {
  const blocked = requireFixture();
  if (blocked) return blocked;
  if (!isGameTab(name)) {
    return {
      ok: false,
      error: `Unknown tab "${name}". Use one of: ${GAME_TABS.join(", ")}`,
    };
  }
  return applyStorePatch({ activeTab: name });
}

export function createDevSaveEditApi(): DevSaveEditApi {
  return {
    fixtures: DEV_SAVE_IDS,
    load: loadDevSave,
    get: getDevSaveSnapshot,
    patch: patchDevSave,
    pause: () => setDevSavePaused(true),
    resume: () => setDevSavePaused(false),
    tab: setDevSaveTab,
  };
}

export function installDevSaveEditApi(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  window.__adcDevSave = createDevSaveEditApi();
}
