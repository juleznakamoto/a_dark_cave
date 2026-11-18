import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { GameHeaderControls } from "./ProfileMenu";
import { GameHeaderStatusIndicators } from "./GameHeaderStatusIndicators";
import {
  DemoEndHeaderLink,
  SteamDemoHeaderStoreLink,
} from "./SteamDemoStoreLink";
import {
  GAME_CHROME_NO_BG_HOVER,
  GAME_CHROME_RULE_BOTTOM,
  GAME_HEADER_SAFE_AREA_TOP,
} from "./gameChrome";
import { useGameStore } from "@/game/state";
import { useFadePresence } from "@/hooks/useFadePresence";
import { useIosEditionActive } from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatDurationMs } from "@/lib/utils";

const HEADER_PAUSE_BTN =
  `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;

function HeaderPausedPlayTime() {
  // Null while playing, so playTime ticks do not re-render the header.
  // Sleep hides the status rings and freezes play time, so show it here too.
  const pausedPlayTimeMs = useGameStore((s) =>
    s.isPaused || s.idleModeDialog.isOpen ? (s.playTime ?? 0) : null,
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
      className={`${HEADER_PAUSE_BTN} touch-manipulation ${idleModeDialogOpen ? "opacity-30 cursor-not-allowed" : ""} ${isPaused ? "!text-red-600 !opacity-100" : "text-neutral-300"} ${isPaused && !idleModeDialogOpen ? "continue-pause-glow" : ""}`}
    >
      <GameUiIcon
        name={isPaused ? "unpause" : "pause"}
        sizeClassName="game-header-pause-icon"
        className={isPaused ? undefined : "opacity-80"}
      />
    </Button>
  );
}

export default function GameHeader() {
  const iosEditionActive = useIosEditionActive();
  const idleModeDialogOpen = useGameStore((s) => s.idleModeDialog.isOpen);

  return (
    <header
      className={`relative z-50 flex min-h-9 flex-shrink-0 items-center bg-background ${GAME_CHROME_RULE_BOTTOM} px-1 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible`}
      style={
        iosEditionActive
          ? { paddingTop: GAME_HEADER_SAFE_AREA_TOP }
          : undefined
      }
    >
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <HeaderPauseButton />
            <HeaderPausedPlayTime />
          </div>
          {!idleModeDialogOpen && <GameHeaderStatusIndicators />}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex max-w-[min(100%,42rem)] flex-wrap items-center justify-center gap-2 px-12">
            <SteamDemoHeaderStoreLink />
            <DemoEndHeaderLink />
          </div>
        </div>
        <GameHeaderControls />
      </div>
    </header>
  );
}
