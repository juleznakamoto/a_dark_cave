import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { GameHeaderControls, GameHeaderRewardsShortcut } from "./ProfileMenu";
import {
  DemoEndHeaderLink,
  SteamDemoHeaderStoreLink,
} from "./SteamDemoStoreLink";
import { GAME_CHROME_NO_BG_HOVER, GAME_CHROME_RULE_BOTTOM } from "./gameChrome";
import { useGameStore } from "@/game/state";
import { useFadePresence } from "@/hooks/useFadePresence";
import { useMobileGameChrome } from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatDurationMs } from "@/lib/utils";
import { logger } from "@/lib/logger";

const HEADER_PAUSE_BTN =
  `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;

function HeaderPausedPlayTime() {
  // Null while playing, so playTime ticks do not re-render the header.
  const pausedPlayTimeMs = useGameStore((s) =>
    s.isPaused ? (s.playTime ?? 0) : null,
  );
  const { t } = useUiTranslation();
  const fade = useFadePresence(pausedPlayTimeMs !== null);
  const textRef = useRef("00:00:00");
  if (pausedPlayTimeMs !== null) {
    textRef.current = formatDurationMs(pausedPlayTimeMs);
  }
  const text = textRef.current;
  const name = t("footer.playTime", {
    defaultValue: "Play time of this playthrough",
  });
  if (!fade.mounted) return null;

  return (
    <TooltipWrapper
      tooltip={name}
      tooltipId="header-paused-play-time"
      disabled
      side="bottom"
      className={`inline-flex items-center ${fade.visible ? "" : "pointer-events-none"}`}
      tooltipTriggerClassName="inline-flex items-center"
    >
      <span
        className={`pause-ui-fade ml-1 select-none whitespace-nowrap text-xs tabular-nums leading-none text-neutral-300 ${fade.visible ? "opacity-100" : "opacity-0"}`}
        data-testid="header-paused-play-time"
        aria-label={`${name} ${text}`}
      >
        {text}
      </span>
    </TooltipWrapper>
  );
}

function HeaderPauseButton() {
  const { t } = useUiTranslation();
  const isPaused = useGameStore((s) => s.isPaused);
  const togglePause = useGameStore((s) => s.togglePause);
  const idleModeDialogOpen = useGameStore((s) => s.idleModeDialog.isOpen);

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={togglePause}
      button_id="header-pause"
      data-testid="button-pause-game"
      disabled={idleModeDialogOpen}
      aria-label={isPaused ? t("footer.resumeGame") : t("footer.pauseGame")}
      className={`${HEADER_PAUSE_BTN} touch-manipulation ${idleModeDialogOpen ? "opacity-30 cursor-not-allowed" : ""} ${isPaused ? "!text-red-600 !opacity-100" : "text-neutral-300"} ${isPaused && !idleModeDialogOpen ? "continue-pause-flash" : ""}`}
    >
      <GameUiIcon
        name={isPaused ? "unpause" : "pause"}
        sizeClassName="game-header-accent-icon"
        className={isPaused ? undefined : "opacity-80"}
      />
    </Button>
  );
}

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
  const mobileGameChrome = useMobileGameChrome();

  const handleReturnToStart = () => {
    if (returningToStart) return;
    setReturningToStart(true);
    void saveAndReturnToStartScreen().catch((error) => {
      setReturningToStart(false);
      logger.error("[HEADER] Failed to return to start screen:", error);
    });
  };

  return (
    <header className={`relative z-50 flex min-h-9 flex-shrink-0 items-center ${GAME_CHROME_RULE_BOTTOM} px-1 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible md:pl-4 md:pr-2`}>
      <div className="relative flex w-full items-center justify-between gap-2">
        {mobileGameChrome ? (
          <div className="flex shrink-0 items-center">
            <HeaderPauseButton />
            <HeaderPausedPlayTime />
          </div>
        ) : (
          <button
            type="button"
            data-testid="button-return-to-start"
            disabled={returningToStart}
            onClick={handleReturnToStart}
            className={`shrink-0 bg-transparent p-0 text-sm font-medium tracking-wide text-neutral-300 hover:text-neutral-100 disabled:opacity-50 ${GAME_CHROME_NO_BG_HOVER}`}
          >
            A Dark Cave
          </button>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-2">
            <SteamDemoHeaderStoreLink />
            <DemoEndHeaderLink />
            <GameHeaderRewardsShortcut />
          </div>
        </div>
        <GameHeaderControls />
      </div>
    </header>
  );
}
