import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
} from "@/lib/gameFooterSocialLinks";
import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import { useState, useEffect } from "react";
import { isTraderShopUnlocked } from "@/game/stateHelpers";

export default function GameFooter() {
  const {
    setShopDialogOpen,
    isPaused,
    togglePause,
    musicMuted,
    sfxMuted,
    setMusicMuted,
    setSfxMuted,
    cruelMode,
    idleModeDialog,
    playTime,
    devMode,
    setFullGamePurchaseDialogOpen,
    fullGamePurchaseDialogOpen,
    BTP,
    leaderboardDialogOpen,
    story,
    traderDialogOpens,
  } = useGameStore();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState("");

  // Trigger glow animation when pause state changes
  useEffect(() => {
    setGlowingButton("pause");
    const timer = setTimeout(() => setGlowingButton(null), 500);
    return () => clearTimeout(timer);
  }, [isPaused]);

  // Update display time every second in dev mode
  useEffect(() => {
    if (!devMode) return;

    const formatPlayTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    setDisplayTime(formatPlayTime(playTime));

    const interval = setInterval(() => {
      setDisplayTime(formatPlayTime(useGameStore.getState().playTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [devMode, playTime]);

  const handleOfferTribute = () => {
    window.open("https://www.buymeacoffee.com/julez.b", "_blank");
  };

  const toggleMusic = () => {
    const next = !musicMuted;
    setMusicMuted(next);
    audioManager.musicMute(next);
  };

  const toggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    audioManager.sfxMute(next);
  };

  // Check if gameplay time is less than 30 minutes
  const isEarlyGameplay = playTime < 30 * 60 * 1000; // 30 minutes in milliseconds
  const traderShopUnlocked = isTraderShopUnlocked({ story, traderDialogOpens });

  const emphasizeFooterSocialIcons =
    isPaused || idleModeDialog.isOpen || leaderboardDialogOpen;
  const socialIconClass = `hover:opacity-100 transition-opacity duration-[2000ms] ease-in-out flex items-center justify-center w-4 h-4 text-neutral-300 ${emphasizeFooterSocialIcons ? "opacity-90" : "opacity-60"
    }`;

  return (
    <>
      <FullGamePurchaseDialog
        isOpen={fullGamePurchaseDialogOpen}
        onClose={() => setFullGamePurchaseDialogOpen(false)}
        openedFromFooter={true}
      />
      <footer className="border-t border-border px-2 py-2 text-xs text-muted-foreground pointer-events-auto z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-0 flex-1">
            {devMode && (
              <div className="px-1 py-1 text-xs font-mono">{displayTime}</div>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={togglePause}
              data-testid="button-pause-game"
              disabled={idleModeDialog.isOpen}
              className={`px-1 py-1 text-xs hover ${idleModeDialog.isOpen ? "opacity-30 cursor-not-allowed" : ""} ${isPaused ? "text-red-600 hover:text-red-500" : ""} ${isPaused && !idleModeDialog.isOpen ? "continue-pause-flash" : ""}`}
            >
              {isPaused ? "▶" : "❚❚"}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleMusic}
              data-testid="button-toggle-music"
              className="px-1 py-1 text-xs hover"
              title={musicMuted ? "Unmute music" : "Mute music"}
            >
              <img
                src={musicMuted ? "/music_off.png" : "/music_on.png"}
                alt={musicMuted ? "Unmute music" : "Mute music"}
                className="w-4 h-4 opacity-60"
                style={{ filter: "invert(1)" }}
              />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleSfx}
              data-testid="button-toggle-sfx"
              className="px-1 py-1 text-xs hover"
              title={sfxMuted ? "Unmute sound effects" : "Mute sound effects"}
            >
              <img
                src={sfxMuted ? "/sound_off.png" : "/sound_on.png"}
                alt={sfxMuted ? "Unmute sound effects" : "Mute sound effects"}
                className="w-4 h-4 opacity-60"
                style={{ filter: "invert(1)" }}
              />
            </Button>

            {BTP === 1 ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setFullGamePurchaseDialogOpen(true)}
                className="px-1 py-1 text-xs hover"
              >
                Full Game
              </Button>
            ) : traderShopUnlocked ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShopDialogOpen(true)}
                className={`px-1 py-1 text-xs hover text-neutral-300 ${isEarlyGameplay ? "opacity-50" : "opacity-100"} hover:!opacity-100`}
              >
                Trader
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleOfferTribute}
              className={`px-1 py-1 text-xs hover text-neutral-300 ${isEarlyGameplay ? "opacity-50" : "opacity-100"} hover:!opacity-100`}
            >
              Donate
            </Button>
            {cruelMode && (
              <TooltipWrapper
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    Cruel Mode activated
                  </div>
                }
                tooltipId="cruel-mode-indicator"
                disabled
                className="px-1 py-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity flex items-center"
              >
                <span className="font-noto-symbols-2 text-red-600 text-xs font-bold">⛤</span>
              </TooltipWrapper>
            )}
          </div>
          <div className="flex-1 flex justify-end gap-2 items-center">
            {GAME_FOOTER_RIGHT_ICON_ORDER.map((platform) => {
              const { href, title } =
                GAME_FOOTER_RIGHT_ICON_LINKS[platform];
              return (
                <a
                  key={platform}
                  href={href}
                  {...(href.startsWith("http")
                    ? {
                      target: "_blank",
                      rel: "noopener noreferrer me",
                    }
                    : {})}
                  className={socialIconClass}
                  title={title}
                >
                  <FooterSocialIcon platform={platform} />
                </a>
              );
            })}
            <a
              href="/privacy"
              className="hover:opacity-100 transition-opacity opacity-35 text-currentColor"
            >
              Privacy
            </a>
            <a
              href="/imprint"
              className="hover:opacity-100 transition-opacity opacity-35 text-currentColor"
            >
              Imprint
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
