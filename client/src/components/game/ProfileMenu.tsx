import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";
import { getCurrentUser, signOut, deleteAccount } from "@/game/auth";
import { getSupabaseClient } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import { formatSaveTimestamp } from "@/lib/utils";
import { isLocalOnlyEdition } from "@/lib/edition";
import { useSteamEditionActive } from "@/hooks/useSteamEditionActive";
import { triggerExclusivePromoPingOnce } from "@/lib/exclusivePromoShockwave";
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
import SettingsDialog from "./SettingsDialog";
import SocialPromptDialog from "./SocialPromptDialog";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  MARKETING_EMAIL_REWARD_KEY,
  applyMarketingSubscribeGoldReward,
  fetchMarketingOptInPreference,
  postMarketingPreference,
} from "@/game/marketingEmailReward";
import { isRewardsTasksShortcutVisible } from "@/game/socialPromoExclusiveReward";
import { useTranslation } from "react-i18next";
import { FullscreenButton } from "./FullscreenButton";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { REWARDS_TASKS_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import {
  GAME_CHROME_NO_BG_HOVER,
  LIME_ACCENT_MASK_ICON_CLASS,
  TAB_ICON_SIZE_CLASS,
} from "./gameChrome";

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
  triggerExclusivePromoPingOnce(ring);
}

const HEADER_ICON_BTN =
  `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;
/** Slightly larger mask icons for header actions (button stays w-7 h-7). */
const HEADER_ACCENT_ICON_SIZE = "game-header-accent-icon";
/** Header chrome: opacity only (color accents live in the footer). */
const HEADER_ICON_SYMBOL_HOVER =
  "text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100 group-hover:!text-neutral-300";

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
    socialPromptDialogOpen,
    setSocialPromptDialogOpen,
    setSignUpPromptEligibleForGold,
    setIsUserSignedIn,
    referralCount,
    referrals,
    social_media_rewards,
    leaderboardDialogOpen,
    setLeaderboardDialogOpen,
    hasWonAnyGame,
    restartGameDialogOpen, // Added from store
    setRestartGameDialogOpen, // Added from store
    deleteAccountDialogOpen,
    setDeleteAccountDialogOpen,
    settingsDialogOpen,
    setSettingsDialogOpen,
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

  useEffect(() => {
    if (isLocalOnlyEdition()) return;
    checkAuth();
  }, []);

  useEffect(() => {
    if (!accountDropdownOpen || !currentUser) return;
    let cancelled = false;
    (async () => {
      try {
        const optIn = await fetchMarketingOptInPreference();
        if (!cancelled && optIn !== null) {
          setMarketingOptIn(optIn);
        }
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
    const { syncStoreAuthFromSession } = await import("@/game/auth");
    const user = await getCurrentUser();
    setCurrentUser(user);
    await syncStoreAuthFromSession();

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
    // Keep the dialog open (sim paused) until restart + save finish, then
    // restartGame clears restartGameDialogOpen itself.
    await deleteSave(); // Local IndexedDB only; cloud is replaced by restart save
    await restartGame();
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
      const result = await saveGame(gameState, false);

      const timestamp = formatSaveTimestamp();

      // Signed-in: 15s cooldown between manual saves (also after cloud failure so
      // a 503 is not hammered). Guests can save anytime (local only).
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
      }));

      // Local write succeeded. Only treat attempted-but-failed cloud sync as a warning.
      if (signedIn && !result.cloudSaved && !result.cloudSkipped) {
        toast({
          title: t("profile.cloudSaveFailed"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("profile.gameSaved"),
        });
      }
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
    leaderboardDialogOpen,
    settingsDialogOpen,
    setSettingsDialogOpen,
  };
}

function ProfileMenuDialogs() {
  const steamEditionActive = useSteamEditionActive();
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
    settingsDialogOpen,
    setSettingsDialogOpen,
    currentUser,
    marketingOptIn,
    marketingPrefLoading,
    handleMarketingPreferenceToggle,
    social_media_rewards,
  } = useProfileMenuContext();

  // Web-only dialog: clear stale open state if something sets the flag on Steam.
  useEffect(() => {
    if (steamEditionActive && deleteAccountDialogOpen) {
      setDeleteAccountDialogOpen(false);
    }
  }, [deleteAccountDialogOpen, setDeleteAccountDialogOpen, steamEditionActive]);

  return (
    <>
      <SettingsDialog
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        currentUser={currentUser}
        marketingOptIn={marketingOptIn}
        marketingPrefLoading={marketingPrefLoading}
        marketingRewardClaimed={
          social_media_rewards[MARKETING_EMAIL_REWARD_KEY]?.claimed === true
        }
        onToggleMarketing={() => {
          void handleMarketingPreferenceToggle();
        }}
        onDeleteAccount={() => {
          setSettingsDialogOpen(false);
          setDeleteAccountDialogOpen(true);
        }}
      />
      {!steamEditionActive && (
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
      {!steamEditionActive && (
        <DeleteAccountDialog
          isOpen={deleteAccountDialogOpen}
          onClose={() => {
            if (!deleteAccountInProgress) setDeleteAccountDialogOpen(false);
          }}
          onConfirm={handleConfirmDeleteAccount}
          isDeleting={deleteAccountInProgress}
        />
      )}
    </>
  );
}

export function GameHeaderRewardsShortcut() {
  const steamEditionActive = useSteamEditionActive();
  const playTime = useGameStore((s) => s.playTime);
  const rewardsTasksRingRef = useRef<HTMLSpanElement>(null);
  const rewardsTasksIconRef = useRef<HTMLSpanElement>(null);
  const lastPingIndexRef = useRef<number | null>(null);
  const pingInitRef = useRef(false);
  const {
    hoverHandlers: rewardsTasksHoverHandlers,
    portal: rewardsTasksParticlePortal,
  } = useCoinHoverParticles("gold", {
    particleOriginRef: rewardsTasksIconRef,
    particleConfig: REWARDS_TASKS_PARTICLE_CONFIG,
    zIndex: 50,
  });

  const { showRewardsTasksShortcut, t, setSocialPromptDialogOpen } =
    useProfileMenuContext();

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

  if (!showRewardsTasksShortcut || steamEditionActive) {
    return null;
  }

  const rewardsLabel = t("profile.rewards");

  return (
    <>
      <button
        type="button"
        aria-label={rewardsLabel}
        onClick={() => setSocialPromptDialogOpen(true)}
        {...rewardsTasksHoverHandlers}
        className={`group relative flex h-7 shrink-0 items-center gap-1 overflow-visible px-1 ${GAME_CHROME_NO_BG_HOVER}`}
      >
        <span
          ref={rewardsTasksRingRef}
          className="exclusive-promo-shockwave-ring"
          aria-hidden
        />
        <span ref={rewardsTasksIconRef} className="relative z-[1] inline-flex">
          <GameUiIcon
            name="socialReward"
            sizeClassName={TAB_ICON_SIZE_CLASS}
            className={`text-lime-500 ${LIME_ACCENT_MASK_ICON_CLASS}`}
          />
        </span>
        <span className="relative z-[1] text-xs font-medium tracking-wide text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100">
          {rewardsLabel}
        </span>
      </button>
      {rewardsTasksParticlePortal}
    </>
  );
}

export function GameHeaderControls() {
  const steamEditionActive = useSteamEditionActive();
  const {
    cruelMode,
    t,
    accountDropdownOpen,
    setAccountDropdownOpen,
    currentUser,
    handleManualSave,
    cooldowns,
    lastSaved,
    handleRestartGame,
    handleSetAuthDialogOpen,
    handleSignOut,
    hasWonAnyGame,
    devMode,
    setLeaderboardDialogOpen,
    setSettingsDialogOpen,
  } = useProfileMenuContext();

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {cruelMode && (
        <HoverCalloutTooltip
          label={t("footer.cruelModeActive")}
          side="bottom"
        >
          <span
            className={`${HEADER_ICON_BTN} cursor-default opacity-70 hover:opacity-100 transition-opacity`}
            aria-label={t("footer.cruelModeActive")}
          >
            <span className="font-noto-symbols-2 inline-flex items-center justify-center text-red-600 text-[17px] leading-none font-bold select-none translate-y-0.5">
              ⛤
            </span>
          </span>
        </HoverCalloutTooltip>
      )}
      <DropdownMenu
        open={accountDropdownOpen}
        onOpenChange={setAccountDropdownOpen}
        modal={false}
      >
        <HoverCalloutTooltip label={t("profile.title")} side="bottom">
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={t("profile.title")}
              className={`${HEADER_ICON_BTN} group touch-manipulation`}
            >
              <GameUiIcon
                name="menu"
                sizeClassName={HEADER_ACCENT_ICON_SIZE}
                className={HEADER_ICON_SYMBOL_HOVER}
              />
            </Button>
          </DropdownMenuTrigger>
        </HoverCalloutTooltip>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={8}
          className="text-xs !max-h-none w-auto"
        >
          {currentUser && (
            <>
              <div className="flex items-center px-1 py-0.5 text-2xs text-muted-foreground truncate max-w-[200px]">
                {currentUser.email}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => {
              setAccountDropdownOpen(false);
              setSettingsDialogOpen(true);
            }}
          >
            <span className="flex items-center gap-1.5">
              <GameUiIcon name="settings" />
              {t("settings.title")}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItemWithTooltip
            tooltip={
              <div className="text-xs">
                {steamEditionActive ? (
                  <>
                    <p>
                      {t("profile.autoSaveSteam", {
                        defaultValue: "Game auto-saves every 15 seconds",
                      })}
                    </p>
                    <p className="mt-1">
                      {t("profile.steamCloudSave", {
                        defaultValue:
                          "Progress syncs to Steam Cloud when you save.",
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      {currentUser
                        ? t("profile.autoSaveSignedIn")
                        : t("profile.autoSaveGuest")}
                    </p>
                    {!currentUser && (
                      <p className="mt-1">{t("profile.signUpCloudSave")}</p>
                    )}
                  </>
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
            onClick={() => {
              handleManualSave();
              setAccountDropdownOpen(false);
            }}
          >
            <span className="flex items-center gap-1.5">
              <GameUiIcon name="saveGame" />
              {t("profile.save")}
            </span>
          </DropdownMenuItemWithTooltip>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleRestartGame}>
            <span className="flex items-center gap-1.5">
              <GameUiIcon name="newGame" />
              {t("profile.newGame")}
            </span>
          </DropdownMenuItem>
          {(hasWonAnyGame || devMode) && !steamEditionActive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setAccountDropdownOpen(false);
                  setLeaderboardDialogOpen(true);
                }}
              >
                <span className="flex items-center gap-1.5">
                  <GameUiIcon name="leaderboard" />
                  {t("profile.leaderboard")}
                </span>
              </DropdownMenuItem>
            </>
          )}
          {/* Account / auth are web-only (Supabase). */}
          {!steamEditionActive && <DropdownMenuSeparator />}
          {!steamEditionActive &&
            (currentUser ? (
              <DropdownMenuItem onClick={handleSignOut}>
                <span className="flex items-center gap-1.5">
                  <GameUiIcon name="signOut" />
                  {t("profile.signOut")}
                </span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  setAccountDropdownOpen(false);
                  handleSetAuthDialogOpen(true);
                }}
              >
                <span className="flex items-center gap-1.5">
                  <GameUiIcon name="signUp" />
                  {t("profile.signInUp")}
                </span>
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <FullscreenButton />
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
