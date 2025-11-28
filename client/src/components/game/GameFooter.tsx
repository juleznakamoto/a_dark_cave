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
    setShowEndScreen,
    isMuted,
    setIsMuted,
    shopNotificationSeen,
    setShopNotificationSeen,
    shopNotificationVisible,
    cruelMode,
    story,
    mysteriousNoteShopNotificationSeen,
    mysteriousNoteDonateNotificationSeen,
  } = useGameStore();
  const mobileTooltip = useMobileTooltip();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  // Trigger glow animation when pause state changes
  useEffect(() => {
    setGlowingButton("pause");
    const timer = setTimeout(() => setGlowingButton(null), 500);
    return () => clearTimeout(timer);
  }, [isPaused]);

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
      <footer className="border-t border-border px-2 py-2 text-xs text-muted-foreground">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-0 flex-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={togglePause}
              data-testid="button-pause-game"
              className={`px-1 py-1 text-xs hover`}
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
                <span className="absolute -top-[-4px] -right-[-0px] w-1 h-1 bg-red-600 rounded-full shop-notification-pulse" />
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
                  <span className="absolute -top-[-4px] -right-[-0px] w-1 h-1 bg-red-600 rounded-full shop-notification-pulse" />
                )}
            </Button>
            {/* Added button to trigger end screen */}
            {import.meta.env.DEV && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowEndScreen(true)}
                className="px-1 py-1 text-xs hover"
              >
                ES
              </Button>
            )}
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
              href="mailto:support@a-dark-cave.com"
              className="hover:text-foreground transition-colors opacity-35 hover:opacity-100"
            >
              Contact
            </a>
            <a
              href="/privacy"
              className="hover:text-foreground transition-colors opacity-35 hover:opacity-100"
            >
              Privacy
            </a>
            <a
              href="/imprint"
              className="hover:text-foreground transition-colors opacity-35 hover:opacity-100"
            >
              Imprint
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}