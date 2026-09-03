import type { GameState } from "@shared/schema";
import { createInitialState, StateManager, useGameStore } from "@/game/state";
import { applyGameStateLoadMigrations } from "@/game/stateHelpers";
import { calculateTotalEffects } from "@/game/rules/effectsCalculation";
import { calculateBastionStats } from "@/game/bastionStats";
import { scheduleSleepDialogRestore } from "@/game/loop";
import {
  TAB_UNLOCK_BLINK_SEEN_KEYS,
  type TabUnlockBlinkId,
} from "@/game/tabUnlockBlink";
import {
  DEV_SAVE_CATALOG,
  type DevSaveId,
} from "@/game/devSaveIds";
import { SOCIAL_PROMPT_AUTO_OPEN_COUNT } from "@/game/socialPromptAuto";

const DEV_SAVE_GAME_ID_PREFIX = "dev-save-";

function withStartedRun(base: GameState, playTimeMs: number): GameState {
  return {
    ...base,
    gameId: `${DEV_SAVE_GAME_ID_PREFIX}${playTimeMs}`,
    playTime: playTimeMs,
    startTime: Date.now() - playTimeMs,
    flags: {
      ...base.flags,
      gameStarted: true,
      hasLitFire: true,
      villagerCapsEnabled: true,
    },
    villageHotkeyTutorialShown: true,
    // Skip play-time auto prompts so browser tests land on the fixture, not a modal.
    feedbackPromptShown: true,
    socialPromptMilestoneIndex: SOCIAL_PROMPT_AUTO_OPEN_COUNT,
    playlightExitIntentMilestoneIndex: 8,
  };
}

function withSeenTabBlinks(
  state: GameState,
  tabs: TabUnlockBlinkId[],
): GameState {
  const seen = { ...state.story?.seen };
  for (const tab of tabs) {
    seen[TAB_UNLOCK_BLINK_SEEN_KEYS[tab]] = true;
  }
  return {
    ...state,
    story: {
      ...state.story,
      seen,
    },
  };
}

function withVillage(base: GameState): GameState {
  return withSeenTabBlinks(
    {
      ...base,
      flags: {
        ...base.flags,
        villageUnlocked: true,
      },
      tools: {
        ...base.tools,
        stone_axe: true,
      },
      buildings: {
        ...base.buildings,
        woodenHut: 2,
      },
      villagers: {
        ...base.villagers,
        gatherer: 2,
        hunter: 1,
        free: 0,
      },
      resources: {
        ...base.resources,
        wood: 80,
        food: 40,
        stone: 30,
        fur: 8,
      },
      story: {
        ...base.story,
        seen: {
          ...base.story?.seen,
          hasStoneAxe: true,
          actionCraftStoneAxe: true,
        },
      },
    },
    ["village"],
  );
}

function withInvestHall(base: GameState): GameState {
  return {
    ...base,
    buildings: {
      ...base.buildings,
      coinhouse: 1,
    },
    resources: {
      ...base.resources,
      gold: Math.max(base.resources.gold ?? 0, 250),
    },
    investmentHallState: {
      offers: [
        { durationMin: 5, tier: "A" },
        { durationMin: 15, tier: "B" },
        { durationMin: 30, tier: "D" },
      ],
      active: null,
      nextWavePlayTime: 0,
    },
  };
}

function withEstate(base: GameState): GameState {
  return withSeenTabBlinks(
    {
      ...base,
      buildings: {
        ...base.buildings,
        darkEstate: 1,
      },
    },
    ["estate"],
  );
}

function withForest(base: GameState): GameState {
  return withSeenTabBlinks(
    {
      ...base,
      flags: {
        ...base.flags,
        forestUnlocked: true,
      },
      weapons: {
        ...base.weapons,
        crude_bow: true,
      },
      story: {
        ...base.story,
        seen: {
          ...base.story?.seen,
          hasCrudeBow: true,
          actionCraftCrudeBow: true,
          forestUnlocked: true,
        },
      },
    },
    ["forest"],
  );
}

function withBastionProgress(base: GameState): GameState {
  return withSeenTabBlinks(
    {
      ...base,
      flags: {
        ...base.flags,
        bastionUnlocked: true,
        hasFortress: true,
      },
      buildings: {
        ...base.buildings,
        bastion: 1,
        watchtower: 1,
      },
      weapons: {
        ...base.weapons,
        ashen_dagger: true,
      },
    },
    ["bastion"],
  );
}

function withSleepSession(base: GameState): GameState {
  const startTime = Date.now() - 30_000;
  return {
    ...base,
    idleModeState: {
      isActive: true,
      startTime,
      needsDisplay: true,
    },
  };
}

function finalize(state: GameState, id: DevSaveId): GameState {
  const migrated = applyGameStateLoadMigrations({
    ...state,
    gameId: `${DEV_SAVE_GAME_ID_PREFIX}${id}`,
  });
  return {
    ...migrated,
    effects: calculateTotalEffects(migrated),
    bastion_stats: calculateBastionStats(migrated),
  };
}

const BUILDERS: Record<DevSaveId, () => GameState> = {
  "fresh-start": () =>
    finalize(withStartedRun(createInitialState(), 2 * 60_000), "fresh-start"),
  village: () =>
    finalize(
      withVillage(withStartedRun(createInitialState(), 20 * 60_000)),
      "village",
    ),
  invest: () =>
    finalize(
      withInvestHall(
        withVillage(withStartedRun(createInitialState(), 20 * 60_000)),
      ),
      "invest",
    ),
  "sleep-unlocked": () =>
    finalize(
      withEstate(
        withVillage(withStartedRun(createInitialState(), 90 * 60_000)),
      ),
      "sleep-unlocked",
    ),
  "sleep-active": () =>
    finalize(
      withSleepSession(
        withEstate(
          withVillage(withStartedRun(createInitialState(), 90 * 60_000)),
        ),
      ),
      "sleep-active",
    ),
  bastion: () =>
    finalize(
      withBastionProgress(
        withForest(
          withEstate(
            withVillage(withStartedRun(createInitialState(), 3 * 60 * 60_000)),
          ),
        ),
      ),
      "bastion",
    ),
};

export function buildDevSave(id: DevSaveId): GameState {
  return BUILDERS[id]();
}

export function isDevSaveFixtureGameId(gameId: string | undefined): boolean {
  return typeof gameId === "string" && gameId.startsWith(DEV_SAVE_GAME_ID_PREFIX);
}

/** Hydrate the live store from a named fixture. Does not persist. */
export function applyDevSaveToStore(id: DevSaveId): void {
  const built = buildDevSave(id);
  useGameStore.setState({
    ...built,
    activeDevSaveId: id,
    activeTab: DEV_SAVE_CATALOG[id].activeTab,
  });
  StateManager.scheduleEffectsUpdate(useGameStore.getState);
  scheduleSleepDialogRestore();
  syncDevSaveQueryParam(id);
}

function syncDevSaveQueryParam(id: DevSaveId): void {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("devSave", id);
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState({}, document.title, next);
    }
  } catch {
    // Private mode / non-browser: ignore.
  }
}
