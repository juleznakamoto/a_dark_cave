import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";
import { useState, useEffect } from "react";
import { getCurrentUser, signOut } from "@/game/auth";
import { useToast } from "@/hooks/use-toast";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import { LogEntry } from "@/game/rules/events";
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
import AuthDialog from "./AuthDialog";
import LeaderboardDialog from "./LeaderboardDialog";
import { RestartGameDialog } from "./RestartGameDialog";

// Social media platform configurations
const SOCIAL_PLATFORMS = [
  {
    id: "instagram",
    name: "Instagram",
    icon: "/camera.png",
    url: "https://www.instagram.com/a_dark_cave/",
    reward: 100,
  },
  // Add more platforms here as needed
];

export default function ProfileMenu() {
  const {
    restartGame,
    setAuthDialogOpen: setGameAuthDialogOpen,
    authNotificationSeen,
    setAuthNotificationSeen,
    authNotificationVisible,
    setIsUserSignedIn,
    referralCount,
    updateResource,
    addLogEntry,
    social_media_rewards,
    leaderboardDialogOpen,
    setLeaderboardDialogOpen,
    isPaused,
    hasWonAnyGame,
    restartGameDialogOpen, // Added from store
    setRestartGameDialogOpen, // Added from store
  } = useGameStore();

  const mobileTooltip = useMobileTooltip();
  const isMobile = useIsMobile();
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    setIsUserSignedIn(!!user);
  };

  const handleSetAuthDialogOpen = (open: boolean) => {
    setAuthDialogOpen(open);
    setGameAuthDialogOpen(open);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setIsUserSignedIn(false);
      setAccountDropdownOpen(false);
      toast({
        title: "Signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        variant: "destructive",
      });
    }
  };

  // Replaced window.confirm with dialog state and handlers
  const handleRestartGame = () => {
    setRestartGameDialogOpen(true);
  };

  const handleConfirmRestart = async () => {
    setRestartGameDialogOpen(false);
    await deleteSave(); // Ensure deleteSave is called before restartGame
    restartGame();
  };

  const handleCopyInviteLink = () => {
    if (!currentUser) return;

    const inviteLink = `${window.location.origin}?ref=${currentUser.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Invite link copied!",
      description: "Share it with friends to earn 250 gold each.",
    });
    setAccountDropdownOpen(false);
  };

  const handleSocialFollow = async (
    platformId: string,
    url: string,
    reward: number,
    platformName: string,
  ) => {
    const currentRewards = useGameStore.getState().social_media_rewards;

    if (currentRewards[platformId]?.claimed) {
      const alreadyClaimedLog: LogEntry = {
        id: `social-reward-already-claimed-${platformId}-${Date.now()}`,
        message: "You've already claimed this reward!",
        timestamp: Date.now(),
        type: "system",
      };
      addLogEntry(alreadyClaimedLog);
      return;
    }

    window.open(url, "_blank");

    useGameStore.setState((state) => {
      const newRewards = {
        ...state.social_media_rewards,
        [platformId]: {
          claimed: true,
          timestamp: Date.now(),
        },
      };
      return {
        social_media_rewards: newRewards,
      };
    });

    updateResource("gold", reward);

    const rewardLog: LogEntry = {
      id: `social-reward-claimed-${platformId}-${Date.now()}`,
      message: `You received ${reward} Gold for following us on ${platformName}!`,
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    };
    addLogEntry(rewardLog);

    try {
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      const playTimeToSave = currentState.isNewGame ? 0 : currentState.playTime;

      await saveGame(gameState, playTimeToSave);

      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false,
      });
    } catch (error) {
      logger.error("Failed to save social media reward claim:", error);
    }
  };

  const handleAuthSuccess = async () => {
    await checkAuth();
  };

  const handleDiscovery = async () => {
    try {
      // Pause the game
      const currentState = useGameStore.getState();
      if (!currentState.isPaused) {
        currentState.togglePause();
      }

      const module = await import(
        "https://sdk.playlight.dev/playlight-sdk.es.js"
      );
      const playlightSDK = module.default;
      playlightSDK.setDiscovery();
    } catch (error) {
      console.error("Error opening Playlight discovery:", error);
    }
  };

  return (
    <div className="fixed top-2 right-2 z-50 pointer-events-auto flex flex-col items-end gap-2">
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => handleSetAuthDialogOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
      <LeaderboardDialog
        isOpen={leaderboardDialogOpen}
        onClose={() => setLeaderboardDialogOpen(false)}
      />
      {/* Added RestartGameDialog */}
      <RestartGameDialog
        isOpen={restartGameDialogOpen}
        onClose={() => setRestartGameDialogOpen(false)}
        onConfirm={handleConfirmRestart}
      />
      <div className="flex flex-wrap items-center justify-end gap-2 max-w-[200px]">
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
              className="px-2 py-1 text-xs hover relative bg-background/80 text-neutral-300 backdrop-blur-sm border border-border"
            >
              Profile
              {authNotificationVisible &&
                !authNotificationSeen &&
                !currentUser && (
                  <span className="absolute -top-[4px] -right-[4px] w-2 h-2 !bg-red-600 rounded-full shop-notification-pulse !opacity-100" />
                )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={8}
            className="text-xs !max-h-none w-auto"
          >
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
            {/* Changed to use the new handler */}
            <DropdownMenuItem onClick={handleRestartGame}>
              New Game
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleCopyInviteLink}
              disabled={!currentUser}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <span>Invite&nbsp;</span>
                  <img
                    src="/person-add.png"
                    alt=""
                    className="w-3 h-3 opacity-90"
                  />
                </div>
                <span className="font-semibold">&nbsp;+250 Gold</span>
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
                        className="font-black ml-2 text-muted-foreground cursor-pointer"
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
                        Invite your friends and both of you will receive 250
                        gold. You can invite up to 10 friends. (
                        {referralCount || 0}/10 invited).
                        <br />
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {SOCIAL_PLATFORMS.map((platform) => {
              const isClaimed =
                social_media_rewards[platform.id]?.claimed ?? false;
              const isActive = !isClaimed && !!currentUser;

              return (
                <DropdownMenuItem
                  key={platform.id}
                  onClick={() => {
                    if (isActive) {
                      handleSocialFollow(
                        platform.id,
                        platform.url,
                        platform.reward,
                        platform.name,
                      );
                    }
                  }}
                  disabled={!isActive}
                  className={
                    !isActive
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <span>Follow&nbsp;</span>
                      <img
                        src={platform.icon}
                        alt={platform.name}
                        className="w-3 h-3 opacity-90 hover:bg-red"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        &nbsp;+{platform.reward} Gold
                      </span>
                      {isClaimed && (
                        <span className="text-xs text-muted-foreground">✓</span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-wrap justify-end max-w-[54px] flex items-center gap-1">
        {!currentUser && (
          <TooltipProvider>
            <Tooltip
              open={
                isMobile
                  ? mobileTooltip.isTooltipOpen("login-reminder")
                  : undefined
              }
            >
              <TooltipTrigger asChild>
                <div
                  className="w-5 h-5 rounded-full border border-orange-500 flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    if (isMobile) {
                      mobileTooltip.handleTooltipClick("login-reminder", e);
                    }
                    setAccountDropdownOpen(true);
                    setAuthNotificationSeen(true);
                  }}
                >
                  <span className="text-orange-500 text-xs font-bold">!</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Sign in to save your game progress</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        )}
        {hasWonAnyGame && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setLeaderboardDialogOpen(true)}
            className="p-0 w-7 h-7 bg-background/70 backdrop-blur-sm border border-border flex items-center justify-center group"
          >
            <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity">
              ♕
            </span>
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={handleDiscovery}
          className="p-0 w-7 h-7 bg-background/70 backdrop-blur-sm border border-border flex items-center justify-center group"
        >
          <img
            src="/flashlight.png"
            alt="Discovery"
            className="w-full h-full object-contain rounded-md transition-all duration-300 invert opacity-60 group-hover:invert-0 group-hover:opacity-100"
          />
          {isPaused && (
            <span className="absolute -top-[4px] -right-[4px] w-2 h-2 bg-red-600 rounded-full notification-pulse" />
          )}
        </Button>
      </div>

    </div>
  );
}