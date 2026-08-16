import type { StartScreenPreferences } from "@/components/game/StartScreen";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamBuild,
  shouldHideSteamStoreLink,
  type DevGameMode,
} from "@/lib/edition";
import { AUTH_STORAGE_KEY } from "@/lib/supabase";
import {
  readStartupSaveHeaderResult,
  type StartupSaveHeader,
} from "./startupSaveHeader";
import { parseStartupIntent, type StartupLocation } from "./startupIntent";

export type StartupResolution =
  | { surface: "game" }
  | {
    surface: "start";
    preferences: StartScreenPreferences;
    devGameMode: DevGameMode;
    steamEditionActive: boolean;
    steamDesktopEditionActive: boolean;
    hideSteamStoreLink: boolean;
  };

const DEFAULT_PREFERENCES: StartScreenPreferences = {
  cruelMode: false,
  musicMuted: false,
  sfxMuted: false,
  musicVolume: 1,
  sfxVolume: 1,
};

function hasPersistedAuthSessionHint(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as {
      access_token?: unknown;
      user?: unknown;
    } | null;
    return (
      typeof session?.access_token === "string" &&
      session.access_token.length > 0 &&
      session.user !== null &&
      typeof session.user === "object"
    );
  } catch {
    return false;
  }
}

function preferencesFromHeader(
  header: StartupSaveHeader | null,
): StartScreenPreferences {
  if (!header) return DEFAULT_PREFERENCES;
  return {
    cruelMode: header.cruelMode,
    musicMuted: header.musicMuted,
    sfxMuted: header.sfxMuted,
    musicVolume: header.musicVolume,
    sfxVolume: header.sfxVolume,
  };
}

function createStartResolution(
  preferences: StartScreenPreferences,
  devGameMode: DevGameMode,
): StartupResolution {
  const devSteamMode =
    import.meta.env.DEV && !isSteamBuild && devGameMode !== "normal";
  return {
    surface: "start",
    preferences,
    devGameMode,
    steamEditionActive:
      isSteamBuild ||
      isGalaxyEdition() ||
      isCrazyGamesEdition() ||
      devSteamMode,
    steamDesktopEditionActive:
      isSteamBuild || isCrazyGamesEdition() || devSteamMode,
    hideSteamStoreLink: shouldHideSteamStoreLink(devGameMode),
  };
}

async function withStartupTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Game startup check timed out")),
          15000,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * Resolve which surface a visit should show. React pages render this result but
 * do not need to understand persistence, auth hints, or edition branching.
 */
export async function resolveStartupVisit(
  location: StartupLocation = window.location,
): Promise<StartupResolution> {
  if (parseStartupIntent(location).forceGame) {
    return { surface: "game" };
  }

  const headerResult = await readStartupSaveHeaderResult();
  if (headerResult.status === "error") throw headerResult.error;
  const header =
    headerResult.status === "loaded" ? headerResult.header : null;

  if (header?.gameStarted) {
    return { surface: "game" };
  }

  // A valid unstarted header already has start-screen preferences. Full
  // reconciliation is only needed when no header exists and a cloud/Steam
  // save may still be present.
  const needsFullReconciliation =
    (isSteamBuild || hasPersistedAuthSessionHint()) &&
    (headerResult.status === "not-found" || header == null);

  if (needsFullReconciliation) {
    const useGameStore = await withStartupTimeout(
      import("./startupGameLoader").then(({ loadStoreForStartupCheck }) =>
        loadStoreForStartupCheck(),
      ),
    );
    const state = useGameStore.getState();
    if (state.flags.gameStarted) {
      return { surface: "game" };
    }
    return createStartResolution(
      {
        cruelMode: state.cruelMode,
        musicMuted: state.musicMuted,
        sfxMuted: state.sfxMuted,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
      },
      state.devGameMode,
    );
  }

  return createStartResolution(
    preferencesFromHeader(header),
    header?.devGameMode ?? "normal",
  );
}
