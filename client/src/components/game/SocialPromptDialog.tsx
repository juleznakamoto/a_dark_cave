import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useToast } from "@/hooks/use-toast";
import {
  MARKETING_EMAIL_REWARD_KEY,
  MARKETING_SUBSCRIBE_GOLD,
  markMarketingEmailFulfilled,
  claimMarketingEmailGoldReward,
  fetchMarketingOptInPreference,
  getConfirmedUserAccessToken,
  postMarketingPreference,
} from "@/game/marketingEmailReward";
import {
  ACTIVE_SOCIAL_PLATFORMS,
  getSocialPlatformActionLabel,
  getSocialPlatformTitle,
} from "@/game/socialPlatforms";
import {
  fulfillSocialFollowReward,
  claimSocialFollowGoldReward,
} from "@/game/claimSocialFollowReward";
import { SocialPlatformGlyph } from "@/components/game/SocialPlatformGlyph";
import { getCurrentUser } from "@/game/auth";
import {
  copyInviteLinkToClipboard,
  isInviteNotSignedInError,
} from "@/game/copyInviteLink";
import { logger } from "@/lib/logger";
import { Square, SquareCheck } from "lucide-react";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  GAME_INFO_GLYPH_CLASS,
  GAME_INFO_TRIGGER_CLASS,
} from "@/components/game/gameChrome";
import {
  SOCIAL_PROMPT_REFERRAL_CAP,
  REFERRAL_REWARD_GOLD,
} from "@/game/socialPromptAuto";
import { SIGN_UP_WELCOME_GOLD } from "@shared/schema";
import {
  getSocialPromoExclusiveProgress,
  syncSocialPromoExclusiveRewardPending,
  isExclusiveInviteStepDone,
  isSocialPromoExclusiveRewardComplete,
  SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
} from "@/game/socialPromoExclusiveReward";
import {
  PLAYLIGHT_DISCOVER_REWARD_KEY,
  PLAYLIGHT_DISCOVER_REWARD_GOLD,
  fulfillPlaylightDiscoverReward,
  claimPlaylightDiscoverGoldReward,
} from "@/game/playlightDiscoverReward";
import {
  claimSignupWelcomeGold,
  isSignupWelcomeGoldClaimEligible,
  processReferralAfterConfirmation,
} from "@/game/auth";
import {
  getSocialPlatformRewardEntry,
  isSocialRewardClaimed,
  isSocialRewardFulfilled,
} from "@/game/socialTaskRewards";
import { clothingEffects } from "@/game/rules/effects";
import { getEffectName } from "@/i18n/resolveGameText";
import { useTranslation } from "react-i18next";

/** Exclusive promo track reward (see `eventsSocialPromoExclusive`). */
const EXCLUSIVE_PROMO_REWARD_ITEM_ID = "gifted_ring";

const SOCIAL_TASK_ROW_ICON_SIZE = "h-4 w-4 sm:h-5 sm:w-5";
const SOCIAL_TASK_STATUS_ICON_SIZE = "h-5 w-5 sm:h-6 sm:w-6";
const SOCIAL_TASK_PLATFORM_ICON_SIZE = "w-4 h-4 sm:w-5 sm:h-5";
const SOCIAL_TASK_ROW_LABEL_CLASS = "font-medium text-xs sm:text-sm";
const SOCIAL_EXCLUSIVE_REWARD_ICON_SIZE = "w-5 h-5 sm:w-6 sm:h-6";
/** Shared claimed / fulfilled / exclusive-track box chrome. */
const SOCIAL_TASK_HIGHLIGHT_BOX = "border-green-500/40 bg-green-500/5";
/** Shared tracks so gold chips (and buttons) line up across every task row. */
const SOCIAL_TASK_LIST_CLASS =
  "mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-x-2 gap-y-3 sm:gap-x-3";
const SOCIAL_TASK_ROW_CLASS =
  "col-span-full grid grid-cols-subgrid items-center rounded-md border border-border p-3";
/** Stretch every task-row action to the shared button column (widest label wins). */
const SOCIAL_TASK_ACTION_BTN_CLASS =
  "w-full font-medium px-2 text-[length:calc(0.75rem+var(--adc-text-delta,0px))]";

function TaskInfoIcon({
  tooltipId,
  tooltipText,
}: {
  tooltipId: string;
  tooltipText: string;
}) {
  return (
    <TooltipWrapper
      tooltip={<p className="text-xs leading-snug">{tooltipText}</p>}
      tooltipId={tooltipId}
      disabled
      tooltipContentClassName="max-w-xs"
      className={`${GAME_INFO_TRIGGER_CLASS} align-text-bottom translate-y-[0.06em]`}
    >
      <span className={GAME_INFO_GLYPH_CLASS} aria-hidden>
        🛈
      </span>
    </TooltipWrapper>
  );
}

interface SocialPromptDialogProps {
  isOpen: boolean;
}

function LockedSocialButton({
  locked,
  tooltipId,
  tooltipText,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  locked: boolean;
  tooltipId: string;
  tooltipText: string;
}) {
  const { disabled, ...rest } = props;
  const mergedDisabled = locked || disabled;
  const button = (
    <Button
      {...rest}
      disabled={mergedDisabled}
      className={cn(SOCIAL_TASK_ACTION_BTN_CLASS, className)}
    />
  );
  if (!locked) return button;
  return (
    <TooltipWrapper
      tooltip={<p className="text-xs">{tooltipText}</p>}
      tooltipId={tooltipId}
      disabled
      className="flex w-full min-w-0"
      tooltipTriggerClassName="flex w-full min-w-0 cursor-default"
    >
      {button}
    </TooltipWrapper>
  );
}

function TaskRowStatusIcon({
  claimed,
  fulfilled = false,
  animate = false,
}: {
  claimed: boolean;
  fulfilled?: boolean;
  animate?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        SOCIAL_TASK_STATUS_ICON_SIZE,
      )}
      aria-hidden
    >
      {claimed ? (
        <SquareCheck
          className={cn(
            SOCIAL_TASK_STATUS_ICON_SIZE,
            "text-green-500",
            animate && "social-task-check-animate",
          )}
          strokeWidth={2}
        />
      ) : fulfilled ? (
        <SquareCheck
          className={cn(
            SOCIAL_TASK_STATUS_ICON_SIZE,
            "text-muted-foreground/60",
          )}
          strokeWidth={2}
        />
      ) : (
        <Square
          className={cn(
            SOCIAL_TASK_STATUS_ICON_SIZE,
            "text-muted-foreground/60",
          )}
          strokeWidth={2}
        />
      )}
    </div>
  );
}

function TaskGoldBadge({ amount }: { amount: number }) {
  const { t } = useTranslation("ui");
  return (
    <span className="inline-flex shrink-0 items-center rounded px-1 py-1 text-xxs font-semibold tabular-nums bg-yellow-500/15 text-yellow-400 border border-yellow-500/35">
      {t("invite.goldBonus", { amount })}
    </span>
  );
}

function TaskRowActions({
  amount,
  children,
}: {
  amount: number;
  children: ReactNode;
}) {
  return (
    <>
      <TaskGoldBadge amount={amount} />
      <div className="flex min-w-0 flex-col items-stretch">
        {children}
      </div>
    </>
  );
}

function TaskClaimButton({
  className,
  disabled,
  onClick,
  button_id,
}: {
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  button_id: string;
}) {
  const { t } = useTranslation("ui");
  return (
    <Button
      size="xs"
      className={cn(SOCIAL_TASK_ACTION_BTN_CLASS, className)}
      disabled={disabled}
      onClick={onClick}
      button_id={button_id}
    >
      {t("socialPrompt.claim")}
    </Button>
  );
}

export default function SocialPromptDialog({
  isOpen,
}: SocialPromptDialogProps) {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const setSocialPromptDialogOpen = useGameStore(
    (s) => s.setSocialPromptDialogOpen,
  );
  const social_media_rewards = useGameStore((s) => s.social_media_rewards);
  const referralCount = useGameStore((s) => s.referralCount ?? 0);
  const referrals = useGameStore((s) => s.referrals ?? []);
  const isUserSignedIn = useGameStore((s) => s.isUserSignedIn);
  const signupWelcomeGoldClaimed = useGameStore(
    (s) => s.signupWelcomeGoldClaimed === true,
  );
  const giftedRingGranted = useGameStore(
    (s) => s.clothing?.gifted_ring === true,
  );
  const setAuthDialogOpen = useGameStore((s) => s.setAuthDialogOpen);
  const setSignUpPromptEligibleForGold = useGameStore(
    (s) => s.setSignUpPromptEligibleForGold,
  );

  const [prefLoading, setPrefLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [discoverGamesLoading, setDiscoverGamesLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [signUpClaimEligible, setSignUpClaimEligible] = useState(false);
  const [animatedCheckmarks, setAnimatedCheckmarks] = useState<Set<string>>(
    () => new Set(),
  );

  const markCheckmarkAnimated = useCallback((taskId: string) => {
    setAnimatedCheckmarks((prev) => {
      if (prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  }, []);

  const claimWithAnimation = useCallback(
    (taskId: string, claim: () => boolean | Promise<boolean>) => {
      void Promise.resolve(claim()).then((granted) => {
        if (granted) markCheckmarkAnimated(taskId);
      });
    },
    [markCheckmarkAnimated],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setPrefLoading(true);

    (async () => {
      try {
        const optIn = await fetchMarketingOptInPreference();
        if (!cancelled && optIn !== null) {
          setMarketingOptIn(optIn);
          // Already opted in (e.g. Google signup checkbox) → activate email task.
          if (optIn) markMarketingEmailFulfilled();
        }
      } catch {
        /* ignore — rows still usable */
      } finally {
        if (!cancelled) setPrefLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isUserSignedIn) return;
    void processReferralAfterConfirmation();
  }, [isOpen, isUserSignedIn]);

  useEffect(() => {
    if (!isOpen || signupWelcomeGoldClaimed) {
      setSignUpClaimEligible(false);
      return;
    }
    let cancelled = false;
    void isSignupWelcomeGoldClaimEligible().then((eligible) => {
      if (!cancelled) setSignUpClaimEligible(eligible);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isUserSignedIn, signupWelcomeGoldClaimed]);

  useEffect(() => {
    syncSocialPromoExclusiveRewardPending();
  }, [
    isOpen,
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (
      isSocialPromoExclusiveRewardComplete({
        social_media_rewards,
        referralCount,
        referrals,
        isUserSignedIn,
        signupWelcomeGoldClaimed,
      }) &&
      giftedRingGranted
    ) {
      setSocialPromptDialogOpen(false);
    }
  }, [
    isOpen,
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
    giftedRingGranted,
    setSocialPromptDialogOpen,
  ]);

  const handleSignUpTaskClick = () => {
    setSignUpPromptEligibleForGold(true);
    setSocialPromptDialogOpen(false);
    setAuthDialogOpen(true);
  };

  const handleSubscribe = async () => {
    if (subscribeLoading || prefLoading) return;
    setSubscribeLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast({
          title: t("profile.notSignedIn"),
          variant: "destructive",
        });
        return;
      }

      const accessToken = await getConfirmedUserAccessToken();
      if (!accessToken) {
        toast({
          title: t("profile.notSignedIn"),
          variant: "destructive",
        });
        return;
      }

      await postMarketingPreference({
        accessToken,
        marketingOptIn: true,
        consentSource: "social_prompt_dialog",
      });

      markMarketingEmailFulfilled();
      setMarketingOptIn(true);

      toast({
        title: t("profile.subscribed"),
        description: t("profile.subscribedDesc"),
      });
    } catch (e: unknown) {
      toast({
        title: t("profile.preferenceUpdateFailed"),
        description:
          e instanceof Error ? e.message : t("profile.tryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    try {
      await copyInviteLinkToClipboard("rewards");
      toast({
        title: t("invite.linkCopied"),
        description: t("invite.linkCopiedDesc", { amount: REFERRAL_REWARD_GOLD }),
      });
    } catch (error) {
      const notSignedIn = isInviteNotSignedInError(error);
      if (!notSignedIn) {
        logger.error("Failed to copy invite link:", error);
      }
      toast({
        title: notSignedIn
          ? t("invite.copyFailedNotSignedIn", {
            defaultValue: "Sign in to copy your invite link",
          })
          : t("invite.copyFailed"),
        variant: "destructive",
      });
    }
  };

  const referralsComplete = referralCount >= SOCIAL_PROMPT_REFERRAL_CAP;
  const emailRewardEntry = social_media_rewards[MARKETING_EMAIL_REWARD_KEY];
  const emailRewardClaimed = isSocialRewardClaimed(emailRewardEntry);
  const emailRewardFulfilled = isSocialRewardFulfilled(emailRewardEntry);
  const playlightRewardEntry =
    social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY];
  const playlightDiscoverRewardClaimed =
    isSocialRewardClaimed(playlightRewardEntry);
  const playlightDiscoverRewardFulfilled =
    isSocialRewardFulfilled(playlightRewardEntry);
  const signUpClaimed = signupWelcomeGoldClaimed;
  const signUpFulfilled = signUpClaimEligible;
  const exclusiveInviteDone = isExclusiveInviteStepDone({
    referralCount,
    referrals,
  });
  const exclusiveProgress = getSocialPromoExclusiveProgress({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
  });
  const exclusiveRewardComplete = isSocialPromoExclusiveRewardComplete({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
  });
  const exclusiveItemName = getEffectName(
    "clothing",
    EXCLUSIVE_PROMO_REWARD_ITEM_ID,
    clothingEffects.gifted_ring.name,
  );
  const exclusiveRewardChancePercent = Math.round(
    (clothingEffects.gifted_ring.bonuses.generalBonuses?.actionBonusChance ??
      0.05) * 100,
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && setSocialPromptDialogOpen(false)}
    >
      <DialogContent
        scrollBody
        className="[--adc-dialog-max-w:32rem] z-[70] max-h-[90vh]"
      >
        <DialogHeader>
          <DialogTitle>{t("socialPrompt.title")}</DialogTitle>
          <DialogDescription className="text-left pt-1 space-y-2">
            <p>{t("socialPrompt.description")}</p>
          </DialogDescription>
        </DialogHeader>

        <div className={SOCIAL_TASK_LIST_CLASS}>
          {ACTIVE_SOCIAL_PLATFORMS.map((platform) => {
            const entry = getSocialPlatformRewardEntry(
              social_media_rewards,
              platform.id,
            );
            const claimed = isSocialRewardClaimed(entry);
            const fulfilled = isSocialRewardFulfilled(entry);
            return (
              <div
                key={platform.id}
                className={cn(
                  SOCIAL_TASK_ROW_CLASS,
                  (claimed || fulfilled) && SOCIAL_TASK_HIGHLIGHT_BOX,
                )}
              >
                <TaskRowStatusIcon
                  claimed={claimed}
                  fulfilled={fulfilled}
                  animate={animatedCheckmarks.has(platform.id)}
                />
                <div className="flex min-w-0 items-center gap-2">
                  <SocialPlatformGlyph
                    platformId={platform.id}
                    sizeClassName={SOCIAL_TASK_PLATFORM_ICON_SIZE}
                  />
                  <span
                    className={cn(SOCIAL_TASK_ROW_LABEL_CLASS, "truncate")}
                  >
                    {getSocialPlatformTitle(platform.id)}
                  </span>
                </div>
                {!claimed && (
                  <TaskRowActions amount={platform.reward}>
                    {fulfilled ? (
                      <TaskClaimButton
                        button_id={`social-claim-${platform.id}`}
                        onClick={() =>
                          claimWithAnimation(platform.id, () =>
                            claimSocialFollowGoldReward(
                              platform.id,
                              platform.reward,
                            ),
                          )
                        }
                      />
                    ) : (
                      <Button
                        size="xs"
                        className={SOCIAL_TASK_ACTION_BTN_CLASS}
                        button_id={`social-follow-${platform.id}`}
                        onClick={() =>
                          fulfillSocialFollowReward(platform.id, platform.url)
                        }
                      >
                        {getSocialPlatformActionLabel(platform.id)}
                      </Button>
                    )}
                  </TaskRowActions>
                )}
              </div>
            );
          })}

          <div
            className={cn(
              SOCIAL_TASK_ROW_CLASS,
              (playlightDiscoverRewardClaimed ||
                playlightDiscoverRewardFulfilled) &&
              SOCIAL_TASK_HIGHLIGHT_BOX,
            )}
          >
            <TaskRowStatusIcon
              claimed={playlightDiscoverRewardClaimed}
              fulfilled={playlightDiscoverRewardFulfilled}
              animate={animatedCheckmarks.has(PLAYLIGHT_DISCOVER_REWARD_KEY)}
            />
            <div className="flex min-w-0 items-center gap-2">
              <GameUiIcon
                name="discover"
                sizeClassName={SOCIAL_TASK_ROW_ICON_SIZE}
              />
              <span className={SOCIAL_TASK_ROW_LABEL_CLASS}>
                {t("socialPrompt.playlightTitle")}
              </span>
            </div>
            {!playlightDiscoverRewardClaimed && (
              <TaskRowActions amount={PLAYLIGHT_DISCOVER_REWARD_GOLD}>
                {playlightDiscoverRewardFulfilled ? (
                  <TaskClaimButton
                    button_id="social-claim-playlight"
                    onClick={() =>
                      claimWithAnimation(PLAYLIGHT_DISCOVER_REWARD_KEY, () =>
                        claimPlaylightDiscoverGoldReward(),
                      )
                    }
                  />
                ) : (
                  <Button
                    size="xs"
                    className={SOCIAL_TASK_ACTION_BTN_CLASS}
                    button_id="social-playlight-discover"
                    disabled={discoverGamesLoading}
                    onClick={() => {
                      if (discoverGamesLoading) return;
                      setDiscoverGamesLoading(true);
                      void fulfillPlaylightDiscoverReward().finally(() => {
                        setDiscoverGamesLoading(false);
                      });
                    }}
                  >
                    {t("socialPrompt.discoverGames")}
                  </Button>
                )}
              </TaskRowActions>
            )}
          </div>

          <div
            className={cn(
              SOCIAL_TASK_ROW_CLASS,
              (signUpClaimed || signUpFulfilled) && SOCIAL_TASK_HIGHLIGHT_BOX,
            )}
          >
            <TaskRowStatusIcon
              claimed={signUpClaimed}
              fulfilled={signUpFulfilled}
              animate={animatedCheckmarks.has("signup")}
            />
            <div className="flex min-w-0 items-center gap-2">
              <GameUiIcon
                name="signUp"
                sizeClassName={SOCIAL_TASK_ROW_ICON_SIZE}
              />
              <span className={SOCIAL_TASK_ROW_LABEL_CLASS}>
                {t("socialPrompt.signUpTitle")}
              </span>
              {!signUpClaimed && !signUpFulfilled && (
                <TaskInfoIcon
                  tooltipId="social-prompt-signup-info"
                  tooltipText={t("socialPrompt.signUpDesc")}
                />
              )}
            </div>
            {!signUpClaimed && (
              <TaskRowActions amount={SIGN_UP_WELCOME_GOLD}>
                {signUpFulfilled ? (
                  <TaskClaimButton
                    button_id="social-claim-signup"
                    onClick={() =>
                      claimWithAnimation("signup", () =>
                        claimSignupWelcomeGold(),
                      )
                    }
                  />
                ) : (
                  <Button
                    size="xs"
                    className={SOCIAL_TASK_ACTION_BTN_CLASS}
                    button_id="social-signup"
                    onClick={handleSignUpTaskClick}
                  >
                    {t("socialPrompt.signUpButton")}
                  </Button>
                )}
              </TaskRowActions>
            )}
          </div>

          <div
            className={cn(
              SOCIAL_TASK_ROW_CLASS,
              (emailRewardClaimed || emailRewardFulfilled) &&
              SOCIAL_TASK_HIGHLIGHT_BOX,
            )}
          >
            <TaskRowStatusIcon
              claimed={emailRewardClaimed}
              fulfilled={emailRewardFulfilled}
              animate={animatedCheckmarks.has(MARKETING_EMAIL_REWARD_KEY)}
            />
            <div className="flex min-w-0 items-center gap-2">
              <GameUiIcon
                name="email"
                sizeClassName={SOCIAL_TASK_ROW_ICON_SIZE}
              />
              <span className={SOCIAL_TASK_ROW_LABEL_CLASS}>
                {t("socialPrompt.emailUpdatesTitle")}
              </span>
            </div>
            {!emailRewardClaimed && (
              <TaskRowActions amount={MARKETING_SUBSCRIBE_GOLD}>
                {emailRewardFulfilled ? (
                  <TaskClaimButton
                    button_id="social-claim-email"
                    onClick={() =>
                      claimWithAnimation(MARKETING_EMAIL_REWARD_KEY, () =>
                        claimMarketingEmailGoldReward(),
                      )
                    }
                  />
                ) : (
                  <LockedSocialButton
                    locked={!isUserSignedIn}
                    tooltipId="social-prompt-subscribe"
                    tooltipText={t(
                      "socialPrompt.signUpRequiresSignInTooltip",
                    )}
                    size="xs"
                    button_id="social-email-subscribe"
                    disabled={prefLoading || subscribeLoading}
                    onClick={() => void handleSubscribe()}
                  >
                    {t("socialPrompt.subscribe")}
                  </LockedSocialButton>
                )}
              </TaskRowActions>
            )}
          </div>

          <div
            className={cn(
              SOCIAL_TASK_ROW_CLASS,
              (referralsComplete || exclusiveInviteDone) &&
              SOCIAL_TASK_HIGHLIGHT_BOX,
            )}
          >
            <TaskRowStatusIcon
              claimed={referralsComplete}
              fulfilled={exclusiveInviteDone && !referralsComplete}
            />
            <div className="flex min-w-0 items-center gap-2">
              <GameUiIcon
                name="inviteUser"
                sizeClassName={SOCIAL_TASK_ROW_ICON_SIZE}
              />
              <span className={SOCIAL_TASK_ROW_LABEL_CLASS}>
                {t("socialPrompt.inviteTitle")}
              </span>
              <TaskInfoIcon
                tooltipId="social-prompt-invite-info"
                tooltipText={t("socialPrompt.inviteDesc", {
                  cap: SOCIAL_PROMPT_REFERRAL_CAP,
                  amount: REFERRAL_REWARD_GOLD,
                  count: referralCount,
                })}
              />
            </div>
            {!referralsComplete && (
              <TaskRowActions amount={REFERRAL_REWARD_GOLD}>
                <LockedSocialButton
                  locked={!isUserSignedIn}
                  tooltipId="social-prompt-invite"
                  tooltipText={t("socialPrompt.signUpRequiresSignInTooltip")}
                  size="xs"
                  onClick={() => void handleCopyInvite()}
                >
                  {t("socialPrompt.copyInviteLink")}
                </LockedSocialButton>
              </TaskRowActions>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-1 space-y-3 rounded-md border px-3 py-3",
            SOCIAL_TASK_HIGHLIGHT_BOX,
          )}
        >
          <div className="space-y-3">
            <div className="flex justify-between gap-2 text-sm font-medium text-foreground">
              <span className="min-w-0 leading-snug">
                {exclusiveRewardComplete ? (
                  t("socialPrompt.progressComplete")
                ) : (
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="font-bold">{exclusiveItemName}</span>
                    <span className="font-normal">
                      {t("socialPrompt.exclusiveRewardEffect", {
                        percent: exclusiveRewardChancePercent,
                      })}
                    </span>
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  exclusiveRewardComplete ? "text-green-500" : "text-green-400",
                )}
              >
                {!exclusiveRewardComplete &&
                  t("socialPrompt.tasksRemaining", {
                    count:
                      exclusiveProgress.total - exclusiveProgress.completed,
                  })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-full border border-border/60 bg-neutral-800/80"
                role="progressbar"
                aria-valuenow={exclusiveProgress.completed}
                aria-valuemin={0}
                aria-valuemax={exclusiveProgress.total}
                aria-label={t("socialPrompt.progressAriaLabel")}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300 ease-out",
                    exclusiveRewardComplete
                      ? "bg-green-500"
                      : "bg-gradient-to-r from-green-600 to-green-400",
                  )}
                  style={{ width: `${exclusiveProgress.percent}%` }}
                />
                {Array.from(
                  { length: SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL - 1 },
                  (_, i) => i + 1,
                ).map((step) => (
                  <div
                    key={step}
                    className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-neutral-950/50"
                    style={{
                      left: `${(step / SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL) * 100}%`,
                      transform: "translateX(-50%)",
                    }}
                  />
                ))}
              </div>
              <GameUiIcon
                name="exclusiveReward"
                sizeClassName={SOCIAL_EXCLUSIVE_REWARD_ICON_SIZE}
                className={cn(
                  "shrink-0",
                  exclusiveRewardComplete ? "text-green-500" : "text-green-400",
                )}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
