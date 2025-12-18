import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import { ShopDialog } from "./ShopDialog";
import { useState, useEffect } from "react";

export default function GameFooter() {
  const {
    setShopDialogOpen,
    shopDialogOpen,
    isPaused,
    togglePause,
    isMuted,
    setIsMuted,
    shopNotificationSeen,
    setShopNotificationSeen,
    shopNotificationVisible,
    cruelMode,
    story,
    mysteriousNoteShopNotificationSeen,
    mysteriousNoteDonateNotificationSeen,
    idleModeDialog,
    playTime,
    devMode,
  } = useGameStore();
  const mobileTooltip = useMobileTooltip();
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

  const toggleVolume = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    audioManager.globalMute(newMutedState);
  };

  return (
    <>
      <ShopDialog
        isOpen={shopDialogOpen}
        onClose={() => setShopDialogOpen(false)}
      />
      <footer className="border-t border-border px-2 py-2 text-xs text-muted-foreground pointer-events-auto z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-0 flex-1">
            {devMode && (
              <div className="px-2 py-1 text-xs font-mono">{displayTime}</div>
            )}
            <Button
              variant="ghost"
              size="xs"
              onClick={togglePause}
              data-testid="button-pause-game"
              disabled={idleModeDialog.isOpen}
              className={`px-1 py-1 text-xs hover ${idleModeDialog.isOpen ? "opacity-30 cursor-not-allowed" : ""}`}
            >
              {isPaused ? "▶" : "❚❚"}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleVolume}
              data-testid="button-toggle-volume"
              className="px-1 py-1 text-xs hover"
            >
              <img
                src={isMuted ? "/volume_mute.png" : "/volume_up.png"}
                alt={isMuted ? "Unmute" : "Mute"}
                className="w-4 h-4 opacity-60"
                style={{ filter: "invert(1)" }}
              />
            </Button>

            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setShopDialogOpen(true);
                setShopNotificationSeen(true);
                if (
                  story.seen.mysteriousNoteReceived &&
                  !mysteriousNoteShopNotificationSeen
                ) {
                  useGameStore.setState({
                    mysteriousNoteShopNotificationSeen: true,
                  });
                }
              }}
              className="px-1 py-1 text-xs hover relative"
            >
              Shop
              {((shopNotificationVisible && !shopNotificationSeen) ||
                (story.seen.mysteriousNoteReceived &&
                  !mysteriousNoteShopNotificationSeen)) && (
                <span className="absolute -top-[-4px] -right-[-0px] w-1 h-1 bg-red-600 rounded-full notification-pulse" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                handleOfferTribute();
                if (
                  story.seen.mysteriousNoteReceived &&
                  !mysteriousNoteDonateNotificationSeen
                ) {
                  useGameStore.setState({
                    mysteriousNoteDonateNotificationSeen: true,
                  });
                }
              }}
              className="px-1 py-1 text-xs hover relative"
            >
              Donate
              {story.seen.mysteriousNoteReceived &&
                !mysteriousNoteDonateNotificationSeen && (
                  <span className="absolute -top-[-4px] -right-[-0px] w-1 h-1 bg-red-600 rounded-full notification-pulse" />
                )}
            </Button>
            {cruelMode && (
              <TooltipProvider>
                <Tooltip
                  open={mobileTooltip.isTooltipOpen("cruel-mode-indicator")}
                >
                  <TooltipTrigger asChild>
                    <div
                      className="px-1 py-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity flex items-center"
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick(
                          "cruel-mode-indicator",
                          e,
                        )
                      }
                    >
                      <span className="text-red-600 text-xs font-bold">⛤</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs whitespace-nowrap">
                      Cruel Mode activated
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex-1 flex justify-end gap-2 items-center">
            <a
              href="https://www.reddit.com/r/aDarkCave/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Reddit"
            >
              <img
                src="/reddit_logo.svg"
                alt="Reddit"
                className="w-4 h-4 brightness-0 invert opacity-60 hover:opacity-100"
              />
            </a>
            <a
              href="https://www.instagram.com/a_dark_cave/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Instagram"
            >
              <img
                src="/instagram_logo.svg"
                alt="Instagram"
                className="w-4 h-4 brightness-0 invert opacity-60 hover:opacity-100"
              />
            </a>
            <a
              href="https://www.incrementaldb.com/game/a-dark-cave"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Incremental DB"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 26.488 29.926"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.4"
              >
                <g>
                  <path
                    d="m10.613 2.168 1.11-.865a2.286 2.286 0 0 1 2.871 0l1.145.975M17.804 25.986l-2.946 2.531a2.7 2.7 0 0 1-3.4 0l-2.515-2.156M13.148 15.155v13.587M15.853 27.656l9.532-8.166M10.764 27.917.987 19.66M.987 19.66V7.194M25.385 19.66V7.775M3.625 9.196.987 7.194M22.87 9.603l2.638-1.998"
                    strokeLinejoin="round"
                  />
                  <path
                    strokeMiterlimit="10"
                    d="m13.291 6.353 5.204 4.501M13.255 6.389l-5.034 4.213"
                  />
                </g>
              </svg>
            </a>
            <a
              href="mailto:support@a-dark-cave.com"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Contact"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </a>
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