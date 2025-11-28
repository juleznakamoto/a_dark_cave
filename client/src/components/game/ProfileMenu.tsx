
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

// Social media platform configurations
const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '/camera.png',
    url: 'https://www.instagram.com/a_dark_cave/',
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
  } = useGameStore();
  
  const mobileTooltip = useMobileTooltip();
  const isMobile = useIsMobile();
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
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

  const handleRestartGame = async () => {
    if (confirm("Are you sure you want to start a new game? This will delete your current progress.")) {
      setAccountDropdownOpen(false);
      await deleteSave();
      restartGame();
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

  const handleSocialFollow = async (platformId: string, url: string, reward: number, platformName: string) => {
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
        isNewGame: false
      });
    } catch (error) {
      logger.error("Failed to save social media reward claim:", error);
    }
  };

  return (
    <div className="fixed top-2 right-2 z-50 pointer-events-auto">
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
        <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-56 text-xs !max-h-none">
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
          <DropdownMenuItem
            onClick={() => {
              if (currentUser) {
                handleSocialFollow('instagram', 'https://www.instagram.com/a_dark_cave/', 100, 'Instagram');
              }
            }}
            disabled={!currentUser}
            className={!currentUser ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1">
                <span>Follow HARDCODED&nbsp;</span>
                <img
                  src="/camera.png"
                  alt="Instagram"
                  className="w-3 h-3 opacity-90"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">&nbsp;+100 Gold</span>
              </div>
            </div>
          </DropdownMenuItem>
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
                      Share your invite link to earn 250 gold for each friend
                      who signs up ({referralCount || 0}/10 invited).
                      <br />
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {SOCIAL_PLATFORMS.map((platform) => {
            console.log('Rendering platform:', platform.id, platform);
            const isClaimed = social_media_rewards[platform.id]?.claimed ?? false;
            const isActive = !isClaimed && !!currentUser;

            return (
              <DropdownMenuItem
                key={platform.id}
                onClick={() => {
                  if (isActive) {
                    handleSocialFollow(platform.id, platform.url, platform.reward, platform.name);
                  }
                }}
                disabled={!isActive}
                className={!isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <span>Follow&nbsp;</span>
                    <img
                      src={platform.icon}
                      alt={platform.name}
                      className="w-3 h-3 opacity-90"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">&nbsp;+{platform.reward} Gold</span>
                    {isClaimed && <span className="text-xs text-muted-foreground">✓</span>}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
