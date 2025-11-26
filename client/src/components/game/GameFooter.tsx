import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";
import { useState, useEffect } from "react";
import { getCurrentUser, signOut } from "@/game/auth";
import AuthDialog from "./AuthDialog";
import { useToast } from "@/hooks/use-toast";
import { ShopDialog } from "./ShopDialog";
import { audioManager } from "@/lib/audio";
import SocialMediaRewards from "./SocialMediaRewards";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export default function GameFooter() {
  const {
    restartGame,
    loadGame,
    setAuthDialogOpen: setGameAuthDialogOpen,
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
    authNotificationSeen,
    setAuthNotificationSeen,
    authNotificationVisible,
    setIsUserSignedIn,
    cruelMode,
    story,
    mysteriousNoteShopNotificationSeen,
    mysteriousNoteDonateNotificationSeen,
    referralCount,
  } = useGameStore();
  const mobileTooltip = useMobileTooltip();
  const isMobile = useIsMobile();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { toast } = useToast();
  // Trigger glow animation when pause state changes
  useEffect(() => {
    setGlowingButton("pause");
    const timer = setTimeout(() => setGlowingButton(null), 500);
    return () => clearTimeout(timer);
  }, [isPaused]);

  useEffect(() => {
    checkAuth();

    // Check if there's a referral code in URL
    const params = new URLSearchParams(window.location.search);
    const hasReferralCode = params.has("ref");

    // If there's a referral code and user is not signed in, activate the notification
    if (hasReferralCode && !currentUser) {
      setAuthNotificationSeen(false);
    }
  }, []);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    setIsUserSignedIn(!!user);

    // Check if there's a referral code in URL after we know the auth state
    const params = new URLSearchParams(window.location.search);
    const hasReferralCode = params.has("ref");

    // If there's a referral code and user is not signed in, activate the notification
    if (hasReferralCode && !user) {
      setAuthNotificationSeen(false);
      useGameStore.setState({ authNotificationVisible: true });
    }
  };

  const handleSetAuthDialogOpen = (isOpen: boolean) => {
    setAuthDialogOpen(isOpen);
    setGameAuthDialogOpen(isOpen);
    if (isOpen) {
      setAccountDropdownOpen(false);
    }
  };

  const handleAuthSuccess = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    setIsUserSignedIn(!!user);
    // Reload game to get cloud save
    await loadGame();
  };

  // Close dropdown when shop dialog opens
  useEffect(() => {
    if (shopDialogOpen) {
      setAccountDropdownOpen(false);
    }
  }, [shopDialogOpen]);

  const handleSignOut = async () => {
    try {
      setAccountDropdownOpen(false);
      await signOut();
      setCurrentUser(null);
      setIsUserSignedIn(false);
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
      // Stop all sounds before restarting
      audioManager.stopAllSounds();
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

  const handleCopyInviteLink = async () => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "You need to sign in to get your invite link.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has reached the referral limit
    if ((referralCount || 0) >= 10) {
      toast({
        title: "Referral limit reached",
        description:
          "You have already invited 10 friends. For collaboration requests, click on Feedback.",
        variant: "destructive",
      });
      return;
    }

    const inviteLink = `${window.location.origin}?ref=${currentUser.id}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Invite link copied!",
        description: "Share it with your friends to earn 100 gold each.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually: " + inviteLink,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <ShopDialog
        isOpen={shopDialogOpen}
        onClose={() => setShopDialogOpen(false)}
      />
      {/* Account Dropdown - Absolute positioned in upper right */}
      <div className="fixed top-2 right-2 z-30 pointer-events-auto">
        <DropdownMenu
          open={accountDropdownOpen}
          onOpenChange={(open) => {
            setAccountDropdownOpen(open);
            if (open) {
              setAuthNotificationSeen(true);
            }
          }}
          modal={false}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="px-2 py-1 text-xs hover relative bg-background/80  text-neutral-300 backdrop-blur-sm border border-border"
            >
              Profile
              {authNotificationVisible &&
                !authNotificationSeen &&
                !currentUser && (
                  <span className="absolute -top-[4px] -right-[4px] w-2 h-2 !bg-red-600 rounded-full shop-notification-pulse !opacity-100" />
                )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-50 text-xs">
            {currentUser ? (
              <>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    handleSetAuthDialogOpen(true);
                    setAuthNotificationSeen(true);
                  }}
                >
                  Sign In/Up
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleRestartGame}>
              New Game
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyInviteLink}>
              <div className="flex items-center justify-between w-full">
                <span>Invite Friends&nbsp;</span>
                <span className="font-semibold">+100 Gold</span>
                <TooltipProvider>
                  <Tooltip
                    open={
                      isMobile
                        ? mobileTooltip.isTooltipOpen("referral-info")
                        : undefined
                    }
                  >
                    <TooltipTrigger asChild>
                      <span
                        className="ml-2 text-muted-foreground cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (isMobile) {
                            mobileTooltip.handleTooltipClick(
                              "referral-info",
                              e,
                            );
                          }
                        }}
                      >
                        ⓘ{" "}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Share your invite link to earn 100 gold for each friend
                        who signs up ({referralCount || 0}/10 invited).
                        <br />
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SocialMediaRewards />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
                E S
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
              Feedback
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
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => handleSetAuthDialogOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
