import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";
import { getCurrentUser, signOut, deleteAccount } from "@/game/auth";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/apiUrl";
import { useToast } from "@/hooks/use-toast";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import { formatSaveTimestamp } from "@/lib/utils";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { DropdownMenuItemWithTooltip } from "@/components/game/DropdownMenuItemWithTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import AuthDialog from "./AuthDialog";
import LeaderboardDialog from "./LeaderboardDialog";
import { RestartGameDialog } from "./RestartGameDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import SignUpPromptDialog from "./SignUpPromptDialog";
import SocialPromptDialog from "./SocialPromptDialog";
import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";
import { Mail, UserPlus } from "lucide-react";
import {
  MARKETING_EMAIL_REWARD_KEY,
  MARKETING_SUBSCRIBE_GOLD,
  applyMarketingSubscribeGoldReward,
  postMarketingPreference,
} from "@/game/marketingEmailReward";
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import { SOCIAL_PROMPT_REFERRAL_CAP } from "@/game/socialPromptAuto";
import { claimSocialFollowReward } from "@/game/claimSocialFollowReward";
import { SocialPlatformGlyph } from "@/components/game/SocialPlatformGlyph";
import { isSocialPromoExclusiveRewardComplete } from "@/game/socialPromoExclusiveReward";

export default function ProfileMenu() {
  const {
    restartGame,
    setAuthDialogOpen: setGameAuthDialogOpen,
    authDialogOpen: gameAuthDialogOpen,
    authNotificationSeen,
    setAuthNotificationSeen,
    authNotificationVisible,
    signUpPromptDialogOpen,
    setSignUpPromptDialogOpen,
    socialPromptDialogOpen,
    setSocialPromptDialogOpen,
    setSignUpPromptEligibleForGold,
    setIsUserSignedIn,
    referralCount,
    referrals,
    social_media_rewards,
    lastSocialPromptPlayTime,
    leaderboardDialogOpen,
    setLeaderboardDialogOpen,
    isPaused,
    hasWonAnyGame,
    restartGameDialogOpen, // Added from store
    setRestartGameDialogOpen, // Added from store
    deleteAccountDialogOpen,
    setDeleteAccountDialogOpen,
    cooldowns,
    lastSaved,
    devMode,
  } = useGameStore();

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [marketingPrefLoading, setMarketingPrefLoading] = useState(false);
  const [deleteAccountInProgress, setDeleteAccountInProgress] = useState(false);
  const { toast } = useToast();

  /** After the social prompt scheduler passes its first milestone (`lastSocialPromptPlayTime` set). */
  const showExclusiveItemShortcut =
    !!currentUser &&
    lastSocialPromptPlayTime > 0 &&
    !isSocialPromoExclusiveRewardComplete({
      social_media_rewards,
      referralCount,
      referrals,
    });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!accountDropdownOpen || !currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;
        const res = await fetch(apiUrl("/api/marketing/preferences"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelled) return;
        const j = (await res.json()) as { marketing_opt_in?: boolean };
        if (!cancelled) setMarketingOptIn(j.marketing_opt_in === true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountDropdownOpen, currentUser]);

  // Sync auth dialog state from store (e.g. when opened from ShopDialog)
  useEffect(() => {
    if (gameAuthDialogOpen) {
      setAuthDialogOpen(true);
    }
  }, [gameAuthDialogOpen]);

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
    if (!open) {
      setSignUpPromptEligibleForGold(false); // Clear when closing without signing up
    }
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
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      await saveGame(gameState, false);

      const timestamp = formatSaveTimestamp();

      // Set 15-second cooldown (in seconds, not milliseconds - game loop ticks down by 0.2 seconds)
      useGameStore.setState((state) => ({
        cooldowns: {
          ...state.cooldowns,
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

  const handleSocialFollow = (
    platformId: string,
    url: string,
    reward: number,
    platformName: string,
  ) => {
    claimSocialFollowReward(platformId, url, reward, platformName);
  };

  const handleAuthSuccess = async () => {
    await checkAuth();
  };

  const handleDiscovery = async () => {
    // @ts-ignore
    let playlightSDK = window.playlightSDK;
    if (!playlightSDK) {
      try {
        await initPlaylight();
        // @ts-ignore
        playlightSDK = window.playlightSDK;
      } catch {
        return;
      }
    }
    if (playlightSDK && typeof playlightSDK.setDiscovery === "function") {
      markPlaylightDiscoveryUserInitiated();
      playlightSDK.setDiscovery();
    }
  };

  const handleSignUpFromPrompt = () => {
    setSignUpPromptDialogOpen(false);
    setSignUpPromptEligibleForGold(true);
    handleSetAuthDialogOpen(true);
    setAuthDialogOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteAccountInProgress) return;
    setDeleteAccountInProgress(true);
    try {
      await deleteAccount();
      setCurrentUser(null);
      setIsUserSignedIn(false);
      setMarketingOptIn(false);
      setDeleteAccountDialogOpen(false);
      useGameStore.getState().initialize({} as any);
      toast({
        title: "Your account was deleted",
        description:
          "You've been signed out and this device's local save was cleared.",
      });
    } catch (e: unknown) {
      toast({
        title: "Could not delete account",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setDeleteAccountInProgress(false);
    }
  };

  const handleMarketingPreferenceToggle = async () => {
    if (!currentUser || marketingPrefLoading) return;
    setMarketingPrefLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Not signed in",
          variant: "destructive",
        });
        return;
      }
      const next = !marketingOptIn;
      await postMarketingPreference({
        accessToken: session.access_token,
        marketingOptIn: next,
        consentSource: "settings_toggle",
      });
      setMarketingOptIn(next);

      if (next) {
        applyMarketingSubscribeGoldReward();
      }

      toast({
        title: next ? "You're subscribed" : "You're unsubscribed",
        description: next
          ? "We'll send occasional updates and offers to your email."
          : "You won't receive marketing emails from us.",
      });
      setAccountDropdownOpen(false);
    } catch (e: unknown) {
      toast({
        title: "Could not update preference",
        description: e instanceof Error ? e.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setMarketingPrefLoading(false);
    }
  };

  return (
    <div className="fixed top-2 right-2 z-50 pointer-events-auto flex flex-col items-end gap-2">
      <SignUpPromptDialog
        isOpen={signUpPromptDialogOpen}
        onClose={() => setSignUpPromptDialogOpen(false)}
        onSignUpClick={handleSignUpFromPrompt}
      />
      <SocialPromptDialog isOpen={socialPromptDialogOpen} />
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
      <DeleteAccountDialog
        isOpen={deleteAccountDialogOpen}
        onClose={() => {
          if (!deleteAccountInProgress) setDeleteAccountDialogOpen(false);
        }}
        onConfirm={handleConfirmDeleteAccount}
        isDeleting={deleteAccountInProgress}
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
                <div className="flex items-center px-1 py-0.5 text-[10px] text-muted-foreground truncate max-w-[200px]">
                  {currentUser.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItemWithTooltip
                  tooltip={
                    <div className="text-xs">
                      <p>Game auto-saves every minute</p>
                      {lastSaved && (
                        <p className="mt-1">Last Save: {lastSaved}</p>
                      )}
                    </div>
                  }
                  tooltipId="manual-save-info"
                  disabled={cooldowns["manualSave"] > 0}
                  onTooltipAction={() => {
                    handleManualSave();
                    setAccountDropdownOpen(false);
                  }}
                  className={
                    cooldowns["manualSave"] > 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  Save
                </DropdownMenuItemWithTooltip>
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

            <DropdownMenuItemWithTooltip
              tooltip={
                <p className="text-xs">
                  Invite your friends and both of you will receive 250 gold.
                  You can invite up to {SOCIAL_PROMPT_REFERRAL_CAP} friends. ({referralCount || 0}/{SOCIAL_PROMPT_REFERRAL_CAP}
                  invited).
                </p>
              }
              tooltipId="referral-info"
              disabled={!currentUser || (referralCount || 0) >= SOCIAL_PROMPT_REFERRAL_CAP}
              onTooltipAction={() => {
                handleCopyInviteLink();
                setAccountDropdownOpen(false);
              }}
              tooltipContentClassName="max-w-xs"
              className={
                !currentUser || (referralCount || 0) >= SOCIAL_PROMPT_REFERRAL_CAP
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <UserPlus
                    className="w-4 h-4 shrink-0 opacity-90"
                    aria-hidden
                  />
                  <span>Invite</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold">+250 Gold</span>
                  {(referralCount || 0) >= SOCIAL_PROMPT_REFERRAL_CAP && (
                    <span className="text-xs text-muted-foreground">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuItemWithTooltip>
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
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <SocialPlatformGlyph platformId={platform.id} />
                        <span>{platform.actionLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold">
                          +{platform.reward} Gold
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
            {currentUser && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItemWithTooltip
                  tooltip={
                    <p className="text-xs">
                      {marketingOptIn
                        ? "You are currently receiving emails with updates, discounts, and exclusive rewards. Tap to turn off."
                        : "You are currently not receiving emails with updates, discounts, and exclusive rewards. Tap to turn on."}
                    </p>
                  }
                  tooltipId="marketing-email-updates-info"
                  tooltipContentClassName="max-w-xs"
                  disabled={marketingPrefLoading}
                  onTooltipAction={() => {
                    void handleMarketingPreferenceToggle();
                  }}
                  className={
                    marketingPrefLoading
                      ? "opacity-50 cursor-wait"
                      : marketingOptIn
                        ? "opacity-50"
                        : ""
                  }
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail
                        className="w-3.5 h-3.5 shrink-0 opacity-90"
                        aria-hidden
                      />
                      <span>
                        {marketingOptIn ? "Emails On" : "Emails Off"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold">
                        +{MARKETING_SUBSCRIBE_GOLD} Gold
                      </span>
                      {social_media_rewards[MARKETING_EMAIL_REWARD_KEY]
                        ?.claimed && (
                          <span className="text-xs text-muted-foreground">
                            ✓
                          </span>
                        )}
                    </div>
                  </div>
                </DropdownMenuItemWithTooltip>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-[10px] text-muted-foreground focus:text-muted-foreground focus:bg-muted/50"
                  onClick={() => {
                    setAccountDropdownOpen(false);
                    setDeleteAccountDialogOpen(true);
                  }}
                >
                  Delete account
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-wrap justify-end max-w-[140px] flex items-center gap-1">
        {showExclusiveItemShortcut && (
          <TooltipWrapper
            tooltip={<p className="text-xs">Exclusive Item</p>}
            tooltipId="exclusive-item-shortcut"
            className="relative p-0 w-7 h-7 rounded-md bg-background backdrop-blur-sm border border-border flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors shrink-0"
            onClick={() => setSocialPromptDialogOpen(true)}
          >
            <span
              className="text-[15px] leading-none select-none text-[#39ff14]"
              aria-hidden
            >
              ⯍
            </span>
          </TooltipWrapper>
        )}
        {!currentUser && (
          <TooltipWrapper
            tooltip={
              <>
                <p className="text-xs">Game progress is auto-saved locally.</p>
                <p className="text-xs">Sign in to save in the cloud.</p>
              </>
            }
            tooltipId="login-reminder"
            disabled={false}
            onClick={() => {
              setAccountDropdownOpen(true);
              setAuthNotificationSeen(true);
            }}
            className="w-5 h-5 rounded-full border border-orange-500 flex items-center justify-center cursor-pointer opacity-80 hover:opacity-100 transition-opacity relative"
          >
            <span className="absolute inset-0 flex items-center justify-center text-orange-500 text-xs font-bold">
              !
            </span>
          </TooltipWrapper>
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
