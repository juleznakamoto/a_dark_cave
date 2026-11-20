import { useCallback, useRef, useState } from "react";
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
import { PAUSE_UI_FADE_MS } from "@/hooks/useFadePresence";
import {
  PauseHeaderSwapProvider,
  usePauseHeaderChrome,
  usePauseHeaderSwap,
} from "@/hooks/usePauseHeaderSwap";
import { useIosEditionActive } from "@/hooks/useSteamEditionActive";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatDurationMs } from "@/lib/utils";

const HEADER_PAUSE_BTN =
  `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;

function HeaderPausedPlayTime() {
  // Null while playing, so playTime ticks do not re-render the header.
  // Pause and the sleep window share one swap: status marks fade out, then
  // this timer fades in with the pact choices.
  const showTime = useGameStore(
    (s) => s.isPaused || s.idleModeDialog.isOpen,
  );
  const pausedPlayTimeMs = useGameStore((s) =>
    showTime ? (s.playTime ?? 0) : null,
  );
  const { t } = useUiTranslation();
  const fade = usePauseHeaderChrome();
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
  // Sleep uses the resume mark, but it is not a manual pause: no red, no pulse.
  // The button stays inert so it does not toggle pause under the sleep window.
  const showResume = isPaused || idleModeDialogOpen;
  const manualPauseLook = isPaused && !idleModeDialogOpen;

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={togglePause}
      button_id="header-pause"
      data-testid="button-pause-game"
      disabled={idleModeDialogOpen}
      aria-label={showResume ? t("footer.resumeGame") : t("footer.pauseGame")}
      className={`${HEADER_PAUSE_BTN} touch-manipulation ${idleModeDialogOpen ? "disabled:opacity-100" : ""} ${manualPauseLook ? "!text-red-600 !opacity-100 continue-pause-glow" : "text-neutral-300"}`}
    >
      <GameUiIcon
        name={showResume ? "unpause" : "pause"}
        sizeClassName="game-header-pause-icon"
        className={manualPauseLook ? undefined : idleModeDialogOpen ? "opacity-50" : "opacity-80"}
      />
    </Button>
  );
}

export default function GameHeader() {
  const iosEditionActive = useIosEditionActive();
  const idleModeDialogOpen = useGameStore((s) => s.idleModeDialog.isOpen);
  const isPaused = useGameStore((s) => s.isPaused);
  const [effectHoldMs, setEffectHoldMs] = useState(PAUSE_UI_FADE_MS);
  const onEffectsPresence = useCallback((present: boolean) => {
    setEffectHoldMs(present ? PAUSE_UI_FADE_MS : 0);
  }, []);
  // Sleep opens the same header swap as pause: marks out, then timer and pacts.
  const headerChrome = isPaused || idleModeDialogOpen;
  const swap = usePauseHeaderSwap(headerChrome, effectHoldMs);
  const effectsClassName = `pause-ui-fade ${
    swap.effects.visible ? "opacity-100" : "pointer-events-none opacity-0"
  }`;

  return (
    <PauseHeaderSwapProvider value={swap}>
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
            {swap.effects.mounted && (
              <GameHeaderStatusIndicators
                className={effectsClassName}
                onPresenceChange={onEffectsPresence}
              />
            )}
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
    </PauseHeaderSwapProvider>
  );
}
