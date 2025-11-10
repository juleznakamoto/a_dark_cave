import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";
import { useState, useEffect } from "react";
import { getCurrentUser, signOut } from "@/game/auth";
import AuthDialog from "./AuthDialog";
import { useToast } from "@/hooks/use-toast";
import { ShopDialog } from "./ShopDialog";
import { audioManager } from "@/lib/audio";

const VERSION = "0.15.1";

export default function GameFooter() {
  const {
    restartGame,
    loadGame,
    setAuthDialogOpen: setGameAuthDialogOpen,
    setShopDialogOpen,
    shopDialogOpen,
    isPaused,
    togglePause,
    setShowEndScreen, // Added this line
    isMuted,
    setIsMuted,
  } = useGameStore();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const { toast } = useToast();

  // Trigger glow animation when pause state changes
  useEffect(() => {
    setGlowingButton("pause");
    const timer = setTimeout(() => setGlowingButton(null), 500);
    return () => clearTimeout(timer);
  }, [isPaused]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
  };

  const handleSetAuthDialogOpen = (isOpen: boolean) => {
    setAuthDialogOpen(isOpen);
    setGameAuthDialogOpen(isOpen);
  };

  const handleAuthSuccess = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    // Reload game to get cloud save
    await loadGame();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      handleSetAuthDialogOpen(false); // Close auth dialog on sign out
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleRestartGame = async () => {
    if (
      confirm(
        "Restarting the game will delete your current progress. Are you sure to restart?",
      )
    ) {
      await deleteSave();
      restartGame();
    }
  };

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
              className={`px-2 py-1 text-xs hover`}
            >
              {isPaused ? "▶" : "❚❚"}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleVolume}
              data-testid="button-toggle-volume"
              className="px-2 py-1 text-xs hover"
            >
              <img
                src={isMuted ? "/volume_mute.png" : "/volume_up.png"}
                alt={isMuted ? "Unmute" : "Mute"}
                className="w-4 h-4 opacity-60"
                style={{ filter: "invert(1)" }}
              />
            </Button>
            {currentUser ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleSignOut}
                className="px-2 py-1 text-xs hover"
              >
                Sign Out
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleSetAuthDialogOpen(true)}
                className="px-2 py-1 text-xs hover"
              >
                Sign In/Up
              </Button>
            )}

            <Button
              variant="ghost"
              size="xs"
              onClick={handleRestartGame}
              data-testid="button-restart-game"
              className="px-2 py-1 text-xs hover"
            >
              New
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShopDialogOpen(true)}
              className="px-2 py-1 text-xs hover"
            >
              Shop
            </Button>
            {/* <Button
              variant="ghost"
              size="xs"
              onClick={handleOfferTribute}
              className="px-2 py-1 text-xs hover"
            >
              Offer Tribute
            </Button> */}
            {/* Added button to trigger end screen */}
            {import.meta.env.DEV && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowEndScreen(true)}
                className="px-2 py-1 text-xs hover"
              >
                End Screen
              </Button>
            )}
          </div>
          <div className="flex gap-4 items-center">
            <a
              href="mailto:support@a-dark-cave.com"
              className="hover:text-foreground transition-colors opacity-40 hover:opacity-100"
            >
              Feedback
            </a>
            <a
              href="/privacy"
              className="hover:text-foreground transition-colors opacity-40 hover:opacity-100"
            >
              Privacy
            </a>
            <a
              href="/imprint"
              className="hover:text-foreground transition-colors opacity-40 hover:opacity-100"
            >
              Imprint
            </a>

            <span data-testid="game-version">v{VERSION}</span>
          </div>
        </div>
      </footer>
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => handleSetAuthDialogOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
