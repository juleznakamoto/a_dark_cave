import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
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
import { isSteamBuild } from "@/lib/edition";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import { DropdownMenuItemWithTooltip } from "@/components/game/DropdownMenuItemWithTooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import AuthDialog from "./AuthDialog";
import { RestartGameDialog } from "./RestartGameDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import SocialPromptDialog from "./SocialPromptDialog";
import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";
import { Mail, Share2 } from "lucide-react";
import {
  MARKETING_EMAIL_REWARD_KEY,
  MARKETING_SUBSCRIBE_GOLD,
  applyMarketingSubscribeGoldReward,
  postMarketingPreference,
} from "@/game/marketingEmailReward";
import { isRewardsTasksShortcutVisible } from "@/game/socialPromoExclusiveReward";
import PlaylightDiscoveryButton from "./PlaylightDiscoveryButton";
import { useTranslation } from "react-i18next";

const REWARDS_TASKS_ICON_PING_START_MS = 20 * 60 * 1000;
const REWARDS_TASKS_ICON_PING_INTERVAL_MS = 5 * 60 * 1000;

function rewardsTasksIconPingIndex(playTimeMs: number): number | null {
  if (playTimeMs < REWARDS_TASKS_ICON_PING_START_MS) return null;
  return Math.floor(
    (playTimeMs - REWARDS_TASKS_ICON_PING_START_MS) /
    REWARDS_TASKS_ICON_PING_INTERVAL_MS,
  );
}

function pingRewardsTasksRing(ring: HTMLSpanElement | null): void {
  if (!ring) return;
  ring.classList.remove("exclusive-promo-shockwave-ring--ping-once");
  void ring.offsetWidth;
  ring.classList.add("exclusive-promo-shockwave-ring--ping-once");
}

const HEADER_ICON_BTN =
  "group shrink-0 p-0 w-7 h-7 flex items-center justify-center";
const HEADER_ICON_SYMBOL_HOVER =
  "text-neutral-300 opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-500";

type ProfileMenuContextValue = ReturnType<typeof useProfileMenuState>;

const ProfileMenuContext = createContext<ProfileMenuContextValue | null>(null);

function useProfileMenuContext(): ProfileMenuContextValue {
  const ctx = useContext(ProfileMenuContext);
  if (!ctx) {
    throw new Error("GameHeaderControls must be used within ProfileMenuProvider");
  }
  return ctx;
}

function useProfileMenuState() {
  const {
    restartGame,
    setAuthDialogOpen: setGameAuthDialogOpen,
    authDialogOpen: gameAuthDialogOpen,
    authNotificationSeen,
    setAuthNotificationSeen,
    authNotificationVisible,
    socialPromptDialogOpen,
    setSocialPromptDialogOpen,
    setSignUpPromptEligibleForGold,
    setIsUserSignedIn,
    referralCount,
    referrals,
    social_media_rewards,
    leaderboardDialogOpen,
    setLeaderboardDialogOpen,
    idleModeDialog,
    isPaused,
    hasWonAnyGame,
    restartGameDialogOpen, // Added from store
    setRestartGameDialogOpen, // Added from store
    deleteAccountDialogOpen,
    setDeleteAccountDialogOpen,
    cooldowns,
    lastSaved,
    devMode,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
    clothing,
    cruelMode,
  } = useGameStore();

  const signupWelcomeGoldClaimedBool = signupWelcomeGoldClaimed === true;

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
  const { t } = useTranslation("ui");

  const showRewardsTasksShortcut = isRewardsTasksShortcutVisible({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed: signupWelcomeGoldClaimedBool,
    clothing,
  });

  const sleepDialogOpen = idleModeDialog?.isOpen === true;

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
        title: t("profile.signedOut"),
      });
    } catch (error) {
      toast({
        title: t("profile.signOutError"),
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
    const signedIn = !!currentUser;
    const currentCooldown = cooldowns[actionId] || 0;

    if (signedIn && currentCooldown > 0) {
      return; // Still on cooldown (signed-in only)
    }

    try {
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      await saveGame(gameState, false);

      const timestamp = formatSaveTimestamp();

      // Signed-in: 15s cooldown between manual saves. Guests can save anytime (local only).
      useGameStore.setState((state) => ({
        ...(signedIn
          ? {
            cooldowns: {
              ...state.cooldowns,
              [actionId]: 15,
            },
          }
          : {}),
        lastSaved: timestamp,
        isNewGame: false,
      }));

      toast({
        title: t("profile.gameSaved"),
      });
    } catch (error) {
      logger.error("Failed to manually save game:", error);
      toast({
        title: t("profile.saveFailed"),
        variant: "destructive",
      });
    }
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
        title: t("profile.accountDeleted"),
        description: t("profile.accountDeletedDesc"),
      });
    } catch (e: unknown) {
      toast({
        title: t("profile.deleteAccountFailed"),
        description: e instanceof Error ? e.message : t("profile.tryAgainLater"),
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
          title: t("profile.notSignedIn"),
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
        title: next ? t("profile.subscribed") : t("profile.unsubscribed"),
        description: next
          ? t("profile.subscribedDesc")
          : t("profile.unsubscribedDesc"),
      });
      setAccountDropdownOpen(false);
    } catch (e: unknown) {
      toast({
        title: t("profile.preferenceUpdateFailed"),
        description: e instanceof Error ? e.message : t("profile.tryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setMarketingPrefLoading(false);
    }
  };

  return {
    socialPromptDialogOpen,
    authDialogOpen,
    handleSetAuthDialogOpen,
    handleAuthSuccess,
    restartGameDialogOpen,
    setRestartGameDialogOpen,
    handleConfirmRestart,
    deleteAccountDialogOpen,
    deleteAccountInProgress,
    setDeleteAccountDialogOpen,
    handleConfirmDeleteAccount,
    showRewardsTasksShortcut,
    cruelMode,
    t,
    setSocialPromptDialogOpen,
    accountDropdownOpen,
    setAccountDropdownOpen,
    setAuthNotificationSeen,
    authNotificationVisible,
    authNotificationSeen,
    currentUser,
    handleManualSave,
    cooldowns,
    lastSaved,
    handleRestartGame,
    handleSignOut,
    handleMarketingPreferenceToggle,
    marketingOptIn,
    marketingPrefLoading,
    social_media_rewards,
    hasWonAnyGame,
    devMode,
    setLeaderboardDialogOpen,
    handleDiscovery,
    isPaused,
    sleepDialogOpen,
    leaderboardDialogOpen,
  };
}

function ProfileMenuDialogs() {
  const {
    socialPromptDialogOpen,
    authDialogOpen,
    handleSetAuthDialogOpen,
    handleAuthSuccess,
    restartGameDialogOpen,
    setRestartGameDialogOpen,
    handleConfirmRestart,
    deleteAccountDialogOpen,
    deleteAccountInProgress,
    setDeleteAccountDialogOpen,
    handleConfirmDeleteAccount,
  } = useProfileMenuContext();

  return (
    <>
      {!isSteamBuild && (
        <>
          <SocialPromptDialog isOpen={socialPromptDialogOpen} />
          <AuthDialog
            isOpen={authDialogOpen}
            onClose={() => handleSetAuthDialogOpen(false)}
            onAuthSuccess={handleAuthSuccess}
          />
        </>
      )}
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
    </>
  );
}

export function GameHeaderControls() {
  const setShareDialogOpen = useGameStore((s) => s.setShareDialogOpen);
  const playTime = useGameStore((s) => s.playTime);
  const rewardsTasksRingRef = useRef<HTMLSpanElement>(null);
  const lastPingIndexRef = useRef<number | null>(null);
  const pingInitRef = useRef(false);

  const {
    showRewardsTasksShortcut,
    cruelMode,
    t,
    setSocialPromptDialogOpen,
    accountDropdownOpen,
    setAccountDropdownOpen,
    setAuthNotificationSeen,
    currentUser,
    handleManualSave,
    cooldowns,
    lastSaved,
    handleRestartGame,
    handleSetAuthDialogOpen,
    handleSignOut,
    handleMarketingPreferenceToggle,
    marketingOptIn,
    marketingPrefLoading,
    social_media_rewards,
    hasWonAnyGame,
    devMode,
    setLeaderboardDialogOpen,
    handleDiscovery,
    isPaused,
    sleepDialogOpen,
    setDeleteAccountDialogOpen,
  } = useProfileMenuContext();

  useEffect(() => {
    if (!showRewardsTasksShortcut) {
      pingInitRef.current = false;
      lastPingIndexRef.current = null;
      return;
    }

    const currentIndex = rewardsTasksIconPingIndex(playTime);

    if (!pingInitRef.current) {
      pingInitRef.current = true;
      lastPingIndexRef.current = currentIndex ?? -1;
      return;
    }

    if (currentIndex === null) return;
    if (currentIndex > (lastPingIndexRef.current ?? -1)) {
      lastPingIndexRef.current = currentIndex;
      pingRewardsTasksRing(rewardsTasksRingRef.current);
    }
  }, [showRewardsTasksShortcut, playTime]);

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {showRewardsTasksShortcut && !isSteamBuild && (
        <HoverCalloutTooltip
          label={t("profile.rewardsTasks")}
          side="bottom"
        >
          <button
            type="button"
            aria-label={t("profile.rewardsTasks")}
            onClick={() => setSocialPromptDialogOpen(true)}
            className={`${HEADER_ICON_BTN} relative overflow-visible hover:bg-muted/30 transition-colors`}
          >
            <span
              ref={rewardsTasksRingRef}
              className="exclusive-promo-shockwave-ring"
              aria-hidden
              onAnimationEnd={(e) => {
                e.currentTarget.classList.remove(
                  "exclusive-promo-shockwave-ring--ping-once",
                );
              }}
            />
            <span
              className="relative z-[1] text-[17px] leading-none select-none text-lime-500"
              aria-hidden
            >
              ⯫
            </span>
          </button>
        </HoverCalloutTooltip>
      )}
      {cruelMode && (
        <HoverCalloutTooltip
          label={t("footer.cruelModeActive")}
          side="bottom"
        >
          <span
            className={`${HEADER_ICON_BTN} cursor-default opacity-70 hover:opacity-100 transition-opacity`}
            aria-label={t("footer.cruelModeActive")}
          >
            <span className="font-noto-symbols-2 text-red-600 text-[17px] leading-none font-bold select-none">
              ⛤
            </span>
          </span>
        </HoverCalloutTooltip>
      )}
      {/* Playlight discovery + social share are web-only features. */}
      {!isSteamBuild && (
        <>
          <PlaylightDiscoveryButton
            onClick={handleDiscovery}
            forceShowTooltip={isPaused || sleepDialogOpen}
            tooltipSide="bottom"
            className={HEADER_ICON_BTN}
          />
          <HoverCalloutTooltip
            label={t("share.title", { defaultValue: "Share your progress" })}
            side="bottom"
          >
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setShareDialogOpen(true)}
              aria-label={t("share.title", { defaultValue: "Share your progress" })}
              className={`${HEADER_ICON_BTN} group touch-manipulation`}
            >
              <Share2
                className={`h-[15px] w-[15px] ${HEADER_ICON_SYMBOL_HOVER}`}
                aria-hidden="true"
              />
            </Button>
          </HoverCalloutTooltip>
        </>
      )}
      {(hasWonAnyGame || devMode) && !isSteamBuild && (
        <HoverCalloutTooltip label={t("profile.leaderboard")} side="bottom">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setLeaderboardDialogOpen(true)}
            aria-label={t("profile.leaderboard")}
            className={`${HEADER_ICON_BTN} group touch-manipulation`}
          >
            <span className={`text-lg leading-none select-none ${HEADER_ICON_SYMBOL_HOVER}`}>
              ♕
            </span>
          </Button>
        </HoverCalloutTooltip>
      )}
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
            className={`group shrink-0 px-2 py-1 text-xs text-neutral-300 hover hover:!text-red-500`}
          >
            <span className={HEADER_ICON_SYMBOL_HOVER}>
              {t("profile.title")}
            </span>
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
            </>
          )}
          <DropdownMenuItemWithTooltip
            tooltip={
              <div className="text-xs">
                <p>
                  {currentUser
                    ? t("profile.autoSaveSignedIn")
                    : t("profile.autoSaveGuest")}
                </p>
                {!currentUser && (
                  <p className="mt-1">{t("profile.signUpCloudSave")}</p>
                )}
                {lastSaved && (
                  <p className="mt-1">
                    {t("profile.lastSave", { time: lastSaved })}
                  </p>
                )}
              </div>
            }
            tooltipId="manual-save-info"
            disabled={!!currentUser && cooldowns["manualSave"] > 0}
            onTooltipAction={() => {
              handleManualSave();
              setAccountDropdownOpen(false);
            }}
            className={
              currentUser && cooldowns["manualSave"] > 0
                ? "opacity-50 cursor-not-allowed"
                : ""
            }
          >
            {t("profile.save")}
          </DropdownMenuItemWithTooltip>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRestartGame}>
            {t("profile.newGame")}
          </DropdownMenuItem>
          {/* Account / auth / marketing are web-only (Supabase). */}
          {!isSteamBuild && <DropdownMenuSeparator />}
          {!isSteamBuild &&
            (currentUser ? (
              <DropdownMenuItem onClick={handleSignOut}>
                {t("profile.signOut")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  setAccountDropdownOpen(false);
                  handleSetAuthDialogOpen(true);
                  setAuthNotificationSeen(true);
                }}
              >
                {t("profile.signInUp")}
              </DropdownMenuItem>
            ))}
          {!isSteamBuild && currentUser && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItemWithTooltip
                tooltip={
                  <p className="text-xs">
                    {marketingOptIn
                      ? t("profile.marketingOnTooltip")
                      : t("profile.marketingOffTooltip")}
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
                      {marketingOptIn
                        ? t("profile.emailsOn")
                        : t("profile.emailsOff")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold">
                      +
                      {t("common:currency.goldAmount", {
                        amount: MARKETING_SUBSCRIBE_GOLD,
                      })}
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
                {t("profile.deleteAccount")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ProfileMenuProvider({ children }: { children: ReactNode }) {
  const value = useProfileMenuState();
  return (
    <ProfileMenuContext.Provider value={value}>
      <ProfileMenuDialogs />
      {children}
    </ProfileMenuContext.Provider>
  );
}
