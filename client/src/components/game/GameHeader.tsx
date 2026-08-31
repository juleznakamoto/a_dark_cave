import { useState } from "react";
import { GameHeaderControls, GameHeaderRewardsShortcut } from "./ProfileMenu";
import { SteamDemoHeaderStoreLink } from "./SteamDemoStoreLink";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";
import { logger } from "@/lib/logger";

async function saveAndReturnToStartScreen(): Promise<void> {
  const { stopGameLoop } = await import("@/game/loop");
  stopGameLoop();

  try {
    const [{ saveGame }, { buildGameState }, { useGameStore }] =
      await Promise.all([
        import("@/game/save"),
        import("@/game/stateHelpers"),
        import("@/game/state"),
      ]);
    await saveGame(buildGameState(useGameStore.getState()), false, {
      force: true,
    });
  } catch (error) {
    logger.warn("[HEADER] Save before return to start screen failed:", error);
  }

  const { setPreferStartScreen } = await import("@/game/startupBootSurface");
  setPreferStartScreen();
  window.location.reload();
}

export default function GameHeader() {
  const [returningToStart, setReturningToStart] = useState(false);

  const handleReturnToStart = () => {
    if (returningToStart) return;
    setReturningToStart(true);
    void saveAndReturnToStartScreen().catch((error) => {
      setReturningToStart(false);
      logger.error("[HEADER] Failed to return to start screen:", error);
    });
  };

  return (
    <header className="relative z-50 flex min-h-9 flex-shrink-0 items-center border-b border-border px-4 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible md:pl-4 md:pr-2">
      <div className="relative flex w-full items-center justify-between gap-2">
        <button
          type="button"
          data-testid="button-return-to-start"
          disabled={returningToStart}
          onClick={handleReturnToStart}
          className={`shrink-0 bg-transparent p-0 text-sm font-medium tracking-wide text-neutral-300 hover:text-neutral-100 disabled:opacity-50 ${GAME_CHROME_NO_BG_HOVER}`}
        >
          A Dark Cave
        </button>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto">
            <SteamDemoHeaderStoreLink />
            <GameHeaderRewardsShortcut />
          </div>
        </div>
        <GameHeaderControls />
      </div>
    </header>
  );
}
