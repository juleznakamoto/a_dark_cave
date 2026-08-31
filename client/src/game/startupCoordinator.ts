import type { StartScreenPreferences } from "@/components/game/StartScreen";
import {
  isCrazyGamesEdition,
  isGalaxyEdition,
  isSteamBuild,
  shouldHideSteamStoreLink,
  type DevGameMode,
} from "@/lib/edition";
import {
  readStartupSaveHeaderResult,
  type StartupSaveHeader,
} from "./startupSaveHeader";
import {
  isOfflinePortalBootEdition,
  peekPreferStartScreen,
  peekStartupSaveHeader,
  shouldBootGameSurface,
} from "./startupBootSurface";
import { type StartupLocation } from "./startupIntent";

export type StartupResolution =
  | { surface: "game" }
  | {
    surface: "start";
    preferences: StartScreenPreferences;
    devGameMode: DevGameMode;
    steamEditionActive: boolean;
    steamDesktopEditionActive: boolean;
    crazyGamesEditionActive: boolean;
    hideSteamStoreLink: boolean;
  };

const DEFAULT_PREFERENCES: StartScreenPreferences = {
  cruelMode: false,
  musicMuted: false,
  sfxMuted: false,
  musicVolume: 1,
  sfxVolume: 1,
};

export function peekStartScreenResolution(): Extract<
  StartupResolution,
  { surface: "start" }
> {
  const header = peekStartupSaveHeader();
  return createStartResolution(
    preferencesFromHeader(header),
    header?.devGameMode ?? "normal",
  );
}

function preferencesFromHeader(
  header: Pick<
    StartupSaveHeader,
    | "cruelMode"
    | "musicMuted"
    | "sfxMuted"
    | "musicVolume"
    | "sfxVolume"
  > | null,
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
): Extract<StartupResolution, { surface: "start" }> {
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
    crazyGamesEditionActive:
      isCrazyGamesEdition() ||
      (import.meta.env.DEV && !isSteamBuild && devGameMode === "crazyGamesDemo"),
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
  if (shouldBootGameSurface(location)) {
    return { surface: "game" };
  }

  const preferStartScreen = peekPreferStartScreen();

  const headerResult = await readStartupSaveHeaderResult();
  if (headerResult.status === "error") throw headerResult.error;
  const header =
    headerResult.status === "loaded" ? headerResult.header : null;

  // Portal editions still resume a started save when the header was missing
  // from the sync peek (CrazyGames Data module / Steam Cloud).
  if (
    isOfflinePortalBootEdition() &&
    header?.gameStarted &&
    !preferStartScreen
  ) {
    return { surface: "game" };
  }

  const needsFullReconciliation =
    isOfflinePortalBootEdition() &&
    (headerResult.status === "not-found" || header == null);

  if (needsFullReconciliation) {
    const useGameStore = await withStartupTimeout(
      import("./startupGameLoader").then(({ loadStoreForStartupCheck }) =>
        loadStoreForStartupCheck(),
      ),
    );
    const state = useGameStore.getState();
    if (state.flags.gameStarted && !preferStartScreen) {
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
