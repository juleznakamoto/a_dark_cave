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
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
              <div className="px-2 py-1 text-xs font-mono">
                {displayTime}
              </div>
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
                  <path d="m10.613 2.168 1.11-.865a2.286 2.286 0 0 1 2.871 0l1.145.975M17.804 25.986l-2.946 2.531a2.7 2.7 0 0 1-3.4 0l-2.515-2.156M13.148 15.155v13.587M15.853 27.656l9.532-8.166M10.764 27.917.987 19.66M.987 19.66V7.194M25.385 19.66V7.775M3.625 9.196.987 7.194M22.87 9.603l2.638-1.998" strokeLinejoin="round"/>
                  <path strokeMiterlimit="10" d="m13.291 6.353 5.204 4.501M13.255 6.389l-5.034 4.213"/>
                </g>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/a_dark_cave/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Instagram"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://www.reddit.com/user/Pure-Map-6717/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Reddit"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
            </a>
            <a
              href="mailto:support@a-dark-cave.com"
              className="hover:opacity-100 transition-opacity opacity-35"
              title="Contact"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
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