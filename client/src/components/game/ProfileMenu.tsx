import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";
import { getCurrentUser, signOut } from "@/game/auth";
import { useToast } from "@/hooks/use-toast";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import { LogEntry } from "@/game/rules/events";
import { formatSaveTimestamp } from "@/lib/utils";
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
  {
    id: "reddit",
    name: "Reddit",
    icon: "/reddit.png",
    url: "https://www.reddit.com/r/aDarkCave/",
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
    cooldowns,
    cooldownDurations,
    lastSaved,
    devMode,
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

    // Reset manual save cooldown when user logs in
    if (user) {
      useGameStore.setState((state) => ({
        cooldowns: {
          ...state.cooldowns,
          manualSave: 0,
        },
      }));
    }
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
      
      // Reset game state to fresh start (shows start screen)
      // Pass empty object to reset to defaultGameState
      useGameStore.getState().initialize({} as any);
      
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

  const handleManualSave = async () => {
    const actionId = "manualSave";
    const currentCooldown = cooldowns[actionId] || 0;

    if (currentCooldown > 0) {
      return; // Still on cooldown
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileMenu.tsx:151',message:'handleManualSave - before getState',data:{useGameStoreExists:!!useGameStore,useGameStoreType:typeof useGameStore},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const currentState = useGameStore.getState();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileMenu.tsx:155',message:'handleManualSave - after getState',data:{hasCurrentState:!!currentState,stateType:typeof currentState},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const gameState = buildGameState(currentState);
      await saveGame(gameState, false);

      const timestamp = formatSaveTimestamp();

      // Set 15-second cooldown (in seconds, not milliseconds - game loop ticks down by 0.2 seconds)
      useGameStore.setState((state) => ({
        cooldowns: {
          ...state.cooldowns,
          [actionId]: 15,
        },
        cooldownDurations: {
          ...state.cooldownDurations,
          [actionId]: 15,
        },
        lastSaved: timestamp,
        isNewGame: false,
      }));

      toast({
        title: "Game saved successfully",
      });
    } catch (error) {
      logger.error("Failed to manually save game:", error);
      toast({
        title: "Failed to save game",
        variant: "destructive",
      });
    }
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

  const handleDiscovery = () => {
    // @ts-ignore
    const playlightSDK = window.playlightSDK;
    if (playlightSDK && typeof playlightSDK.setDiscovery === 'function') {
      playlightSDK.setDiscovery();
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
              className="px-2 py-1 text-xs hover relative bg-background text-neutral-300 backdrop-blur-sm border border-border"
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
            {currentUser && (
              <>
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <div>
                        <DropdownMenuItem
                          onClick={handleManualSave}
                          disabled={cooldowns["manualSave"] > 0}
                          className={
                            cooldowns["manualSave"] > 0
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }
                        >
                          Save
                        </DropdownMenuItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p>Game auto-saves every minute</p>
                        {lastSaved && (
                          <p className="mt-1">Last Save: {lastSaved}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleRestartGame}>
              New Game
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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

            <TooltipProvider>
              <Tooltip
                open={
                  isMobile
                    ? mobileTooltip.isTooltipOpen("referral-info")
                    : undefined
                }
              >
                <TooltipTrigger asChild>
                  <div
                    onClick={(e) => {
                      if (isMobile) {
                        mobileTooltip.handleTooltipClick("referral-info", e);
                      }
                    }}
                  >
                    <DropdownMenuItem
                      onClick={handleCopyInviteLink}
                      disabled={!currentUser || (referralCount || 0) >= 10}
                      className={
                        !currentUser || (referralCount || 0) >= 10
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1">
                          <span>Invite&nbsp;</span>
                          <img
                            src="/person-add.png"
                            alt=""
                            className="w-4 h-4 opacity-90"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">&nbsp;+250 Gold</span>
                          {(referralCount || 0) >= 10 && (
                            <span className="text-xs text-muted-foreground">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Invite your friends and both of you will receive 250 gold.
                    You can invite up to 10 friends. ({referralCount || 0}/10
                    invited).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuSeparator />
            {SOCIAL_PLATFORMS.map((platform, index) => {
              const isClaimed =
                social_media_rewards[platform.id]?.claimed ?? false;
              const isActive = !isClaimed && !!currentUser;

              return (
                <div key={platform.id}>
                  <DropdownMenuItem
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
                        {platform.id === "instagram" ? (
                          <span>Follow&nbsp;</span>
                        ) : (
                          <span>Join&nbsp;</span>
                        )}
                        {platform.id === "instagram" ? (
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                          </svg>
                        ) : platform.id === "reddit" ? (
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                          </svg>
                        ) : (
                          <img
                            src={platform.icon}
                            alt={platform.name}
                            className="w-3 h-3 opacity-90"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          &nbsp;+{platform.reward} Gold
                        </span>
                        {isClaimed && (
                          <span className="text-xs text-muted-foreground">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {index < SOCIAL_PLATFORMS.length - 1 && (
                    <DropdownMenuSeparator />
                  )}
                </div>
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
        {(hasWonAnyGame || devMode) && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setLeaderboardDialogOpen(true)}
            className="p-0 w-7 h-7 bg-background backdrop-blur-sm border border-border flex items-center justify-center group"
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
