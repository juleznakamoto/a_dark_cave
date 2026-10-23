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
import { resetMadnessLevelLogBaseline } from "@/game/madnessLevelLog";

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
  // Crowded mid-village: many real build/craft/job buttons, still pre-forest /
  // pre-estate / pre-bastion. Leave iron tools and next-tier buildings unowned
  // so Cave craft and Village upgrade buttons stay visible.
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
        stone_pickaxe: true,
      },
      clothing: {
        ...base.clothing,
        fang_charm: true,
      },
      buildings: {
        ...base.buildings,
        woodenHut: 8,
        cabin: 1,
        blacksmith: 1,
        supplyHut: 1,
        storehouse: 1,
        tradePost: 1,
        clerksHut: 1,
        buildersLodge: 1,
        heartfire: 1,
        tannery: 1,
        traps: 2,
      },
      villagers: {
        ...base.villagers,
        // Cap = woodenHut * 2 = 16
        gatherer: 5,
        hunter: 3,
        scholar: 2,
        tanner: 2,
        free: 4,
      },
      resources: {
        ...base.resources,
        wood: 900,
        food: 450,
        stone: 600,
        fur: 90,
        bones: 70,
        iron: 220,
        coal: 80,
        torch: 25,
        leather: 50,
        silver: 40,
        gold: 55,
        insight: 350,
      },
      story: {
        ...base.story,
        seen: {
          ...base.story?.seen,
          hasWood: true,
          actionCraftTorch: true,
          caveExplored: true,
          hasStoneAxe: true,
          actionCraftStoneAxe: true,
          hasStonePickaxe: true,
          actionCraftStonePickaxe: true,
          venturedDeeper: true,
          // Village Produce section stays hidden until the first villager arrives.
          hasVillagers: true,
          villageTrapsSuggested: true,
          longhouseUnlocked: true,
          furTentsUnlocked: true,
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
        { durationMin: 10, tier: "B" },
        { durationMin: 15, tier: "D" },
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
  // Late-game chrome on top of village + forest + estate: mining tier, altar,
  // fortifications, iron tools (steel left false so Cave craft stays busy).
  return withSeenTabBlinks(
    {
      ...base,
      flags: {
        ...base.flags,
        bastionUnlocked: true,
        hasFortress: true,
      },
      tools: {
        ...base.tools,
        iron_axe: true,
        iron_pickaxe: true,
        iron_lantern: true,
      },
      weapons: {
        ...base.weapons,
        iron_sword: true,
        ashen_dagger: true,
      },
      clothing: {
        ...base.clothing,
        fur_cloak: true,
        explorer_pack: true,
      },
      relics: {
        ...base.relics,
        survivors_notes: true,
        bone_dice: true,
        odd_trinket: true,
      },
      buildings: {
        ...base.buildings,
        woodenHut: Math.max(base.buildings.woodenHut ?? 0, 10),
        stoneHut: Math.max(base.buildings.stoneHut ?? 0, 2),
        shallowPit: 1,
        foundry: 1,
        alchemistHall: 1,
        altar: 1,
        bastion: 1,
        watchtower: 2,
        palisades: 1,
        coinhouse: Math.max(base.buildings.coinhouse ?? 0, 1),
      },
      villagers: {
        ...base.villagers,
        // Cap ≈ 10*2 + 2*4 = 28; keep gatherers/hunters for Sleep production
        gatherer: 6,
        hunter: 4,
        iron_miner: 3,
        coal_miner: 2,
        steel_forger: 2,
        scholar: 2,
        tanner: 2,
        powder_maker: 1,
        free: 6,
      },
      resources: {
        ...base.resources,
        wood: 2500,
        food: 2000,
        stone: 2000,
        fur: 200,
        bones: 400,
        bone_totem: 12,
        leather: 120,
        iron: 500,
        coal: 400,
        steel: 250,
        sulfur: 120,
        black_powder: 60,
        ember_bomb: 12,
        ashfire_bomb: 4,
        torch: 40,
        silver: 180,
        gold: 350,
        insight: 900,
        obsidian: 80,
      },
      story: {
        ...base.story,
        seen: {
          ...base.story?.seen,
          portalBlasted: true,
          hasIronAxe: true,
          hasIronPickaxe: true,
          hasIronLantern: true,
          hasIronSword: true,
          descendedFurther: true,
          herbGardenUnlocked: true,
          boneyardUnlocked: true,
        },
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

function withFreshStartChrome(base: GameState): GameState {
  // Still cave-only after Make Fire, but show Torches + a stocked side panel.
  return {
    ...base,
    resources: {
      ...base.resources,
      wood: 35,
      stone: 8,
      food: 12,
      torch: 2,
    },
    story: {
      ...base.story,
      seen: {
        ...base.story?.seen,
        hasWood: true,
        firstWoodGathered: true,
      },
    },
  };
}

const BUILDERS: Record<DevSaveId, () => GameState> = {
  "fresh-start": () =>
    finalize(
      withFreshStartChrome(withStartedRun(createInitialState(), 2 * 60_000)),
      "fresh-start",
    ),
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

/** DEV URL `?blastGate=1` (with a fixture) shows Blast Gate on the Cave tab. */
export function isBlastGateDevPreviewQuery(search: string): boolean {
  return new URLSearchParams(search).get("blastGate") === "1";
}

export function applyBlastGateDevPreviewToStore(): void {
  const state = useGameStore.getState();
  useGameStore.setState({
    resources: {
      ...state.resources,
      ember_bomb: Math.max(10, state.resources.ember_bomb ?? 0),
    },
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        portalDiscovered: true,
        portalBlasted: false,
      },
    },
    activeTab: "cave",
    isPaused: true,
  });
}

/** Hydrate the live store from a named fixture. Does not persist. */
export function applyDevSaveToStore(id: DevSaveId): void {
  const built = buildDevSave(id);
  resetMadnessLevelLogBaseline();
  useGameStore.setState({
    ...built,
    activeDevSaveId: id,
    activeTab: DEV_SAVE_CATALOG[id].activeTab,
  });
  if (
    typeof window !== "undefined" &&
    isBlastGateDevPreviewQuery(window.location.search)
  ) {
    applyBlastGateDevPreviewToStore();
  }
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
