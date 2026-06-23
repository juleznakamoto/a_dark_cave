import { useCallback, useEffect, useState, type ComponentProps } from "react";
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
  SOCIAL_PLATFORMS,
  getSocialPlatformActionLabel,
  getSocialPlatformTitle,
} from "@/game/socialPlatforms";
import {
  fulfillSocialFollowReward,
  claimSocialFollowGoldReward,
} from "@/game/claimSocialFollowReward";
import { SocialPlatformGlyph } from "@/components/game/SocialPlatformGlyph";
import { getCurrentUser } from "@/game/auth";
import { Check, Circle, Mail, Sparkles, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
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
import { claimSignupWelcomeGold, isSignupWelcomeGoldClaimEligible } from "@/game/auth";
import {
  isSocialRewardClaimed,
  isSocialRewardFulfilled,
} from "@/game/socialTaskRewards";
import { clothingEffects } from "@/game/rules/effects";
import { renderItemTooltip } from "@/game/rules/itemTooltips";
import { getEffectName } from "@/i18n/resolveGameText";
import { useTranslation } from "react-i18next";

/** Exclusive promo track reward (see `eventsSocialPromoExclusive`). */
const EXCLUSIVE_PROMO_REWARD_ITEM_ID = "gifted_ring";

function ExclusivePromoItemInfoIcon({ tooltipId }: { tooltipId: string }) {
  return (
    <TooltipWrapper
      tooltip={renderItemTooltip(EXCLUSIVE_PROMO_REWARD_ITEM_ID, "blessing")}
      tooltipId={tooltipId}
      disabled
      tooltipContentClassName="max-w-xs border border-amber-600"
      className="inline-flex shrink-0 items-center justify-center w-5 h-5 rounded-full text-lime-300 hover:text-lime-200 cursor-pointer motion-safe:animate-shop-info-pulse align-text-bottom translate-y-[0.06em]"
    >
      <span
        className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-base font-normal leading-none"
        aria-hidden
      >
        🛈
      </span>
    </TooltipWrapper>
  );
}

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
      className="inline-flex shrink-0 items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-foreground cursor-pointer align-text-bottom translate-y-[0.06em]"
    >
      <span
        className="inline-flex shrink-0 items-center justify-center font-noto-symbols-2 text-base font-normal leading-none"
        aria-hidden
      >
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
      className={cn("shrink-0 font-medium px-3", className)}
    />
  );
  if (!locked) return button;
  return (
    <TooltipWrapper
      tooltip={<p className="text-xs">{tooltipText}</p>}
      tooltipId={tooltipId}
      disabled
      className="inline-flex shrink-0"
      tooltipTriggerClassName="inline-flex shrink-0 cursor-default"
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
      className="flex h-5 w-5 shrink-0 items-center justify-center"
      aria-hidden
    >
      {claimed ? (
        <Check
          className={cn(
            "h-5 w-5 text-green-500",
            animate && "social-task-check-animate",
          )}
          strokeWidth={2.5}
        />
      ) : !fulfilled ? (
        <Circle
          className="h-5 w-5 text-muted-foreground/60"
          strokeWidth={2}
        />
      ) : null}
    </div>
  );
}

function TaskClaimButton({
  className,
  disabled,
  onClick,
}: {
  className?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation("ui");
  return (
    <Button
      size="xs"
      className={cn("shrink-0 font-medium px-3", className)}
      disabled={disabled}
      onClick={onClick}
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
  const giftedRingGranted = useGameStore((s) => s.clothing?.gifted_ring === true);
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
        description: e instanceof Error ? e.message : t("profile.tryAgainLater"),
        variant: "destructive",
      });
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    const user = await getCurrentUser();
    if (!user) {
      toast({
        title: t("profile.notSignedIn"),
        variant: "destructive",
      });
      return;
    }
    const inviteLink = `${window.location.origin}?ref=${user.id}`;
    await navigator.clipboard.writeText(inviteLink);
    toast({
      title: t("invite.linkCopied"),
      description: t("invite.linkCopiedDesc", { amount: REFERRAL_REWARD_GOLD }),
    });
  };

  const referralsComplete = referralCount >= SOCIAL_PROMPT_REFERRAL_CAP;
  const emailRewardEntry = social_media_rewards[MARKETING_EMAIL_REWARD_KEY];
  const emailRewardClaimed = isSocialRewardClaimed(emailRewardEntry);
  const emailRewardFulfilled = isSocialRewardFulfilled(emailRewardEntry);
  const playlightRewardEntry = social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY];
  const playlightDiscoverRewardClaimed = isSocialRewardClaimed(
    playlightRewardEntry,
  );
  const playlightDiscoverRewardFulfilled = isSocialRewardFulfilled(
    playlightRewardEntry,
  );
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && setSocialPromptDialogOpen(false)}
    >
      <DialogContent className="[--adc-dialog-max-w:32rem] z-[70] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("socialPrompt.title")}</DialogTitle>
          <DialogDescription className="text-left pt-1 space-y-2">
            <p>{t("socialPrompt.description")}</p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {SOCIAL_PLATFORMS.map((platform) => {
            const entry = social_media_rewards[platform.id];
            const claimed = isSocialRewardClaimed(entry);
            const fulfilled = isSocialRewardFulfilled(entry);
            return (
              <div
                key={platform.id}
                className={cn(
                  "rounded-md border border-border p-3 flex gap-3 items-center",
                  claimed && "border-green-500/40 bg-green-500/5",
                  !claimed &&
                  fulfilled &&
                  "border-lime-500/30 bg-lime-500/[0.04]",
                )}
              >
                <TaskRowStatusIcon
                  claimed={claimed}
                  fulfilled={fulfilled}
                  animate={animatedCheckmarks.has(platform.id)}
                />
                <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <SocialPlatformGlyph platformId={platform.id} />
                    <span className="font-medium text-sm truncate">
                      {getSocialPlatformTitle(platform.id, platform.reward)}
                    </span>
                  </div>
                  {!claimed &&
                    (fulfilled ? (
                      <TaskClaimButton
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
                        className="shrink-0 font-medium px-3"
                        onClick={() =>
                          fulfillSocialFollowReward(platform.id, platform.url)
                        }
                      >
                        {getSocialPlatformActionLabel(platform.id)}
                      </Button>
                    ))}
                </div>
              </div>
            );
          })}

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              playlightDiscoverRewardClaimed &&
              "border-green-500/40 bg-green-500/5",
              !playlightDiscoverRewardClaimed &&
              playlightDiscoverRewardFulfilled &&
              "border-lime-500/30 bg-lime-500/[0.04]",
            )}
          >
            <TaskRowStatusIcon
              claimed={playlightDiscoverRewardClaimed}
              fulfilled={playlightDiscoverRewardFulfilled}
              animate={animatedCheckmarks.has(PLAYLIGHT_DISCOVER_REWARD_KEY)}
            />
            <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles
                    className="h-4 w-4 shrink-0 opacity-90"
                    aria-hidden
                  />
                  <span className="font-medium text-sm">
                    {t("socialPrompt.playlightTitle", {
                      amount: PLAYLIGHT_DISCOVER_REWARD_GOLD,
                    })}
                  </span>
                </div>
              </div>
              {!playlightDiscoverRewardClaimed &&
                (playlightDiscoverRewardFulfilled ? (
                  <TaskClaimButton
                    className="self-center"
                    onClick={() =>
                      claimWithAnimation(PLAYLIGHT_DISCOVER_REWARD_KEY, () =>
                        claimPlaylightDiscoverGoldReward(),
                      )
                    }
                  />
                ) : (
                  <Button
                    size="xs"
                    className="shrink-0 font-medium px-3 self-center"
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
                ))}
            </div>
          </div>

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              signUpClaimed && "border-green-500/40 bg-green-500/5",
              !signUpClaimed &&
              signUpFulfilled &&
              "border-lime-500/30 bg-lime-500/[0.04]",
            )}
          >
            <TaskRowStatusIcon
              claimed={signUpClaimed}
              fulfilled={signUpFulfilled}
              animate={animatedCheckmarks.has("signup")}
            />
            <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="font-medium text-sm">
                    {t("socialPrompt.signUpTitle", {
                      amount: SIGN_UP_WELCOME_GOLD,
                    })}
                  </span>
                  {!signUpClaimed && !signUpFulfilled && (
                    <TaskInfoIcon
                      tooltipId="social-prompt-signup-info"
                      tooltipText={t("socialPrompt.signUpDesc")}
                    />
                  )}
                </div>
              </div>
              {!signUpClaimed &&
                (signUpFulfilled ? (
                  <TaskClaimButton
                    className="self-center"
                    onClick={() =>
                      claimWithAnimation("signup", () => claimSignupWelcomeGold())
                    }
                  />
                ) : (
                  <Button
                    size="xs"
                    className="shrink-0 font-medium px-3 self-center"
                    onClick={handleSignUpTaskClick}
                  >
                    {t("socialPrompt.signUpButton")}
                  </Button>
                ))}
            </div>
          </div>

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              emailRewardClaimed && "border-green-500/40 bg-green-500/5",
              !emailRewardClaimed &&
              emailRewardFulfilled &&
              "border-lime-500/30 bg-lime-500/[0.04]",
            )}
          >
            <TaskRowStatusIcon
              claimed={emailRewardClaimed}
              fulfilled={emailRewardFulfilled}
              animate={animatedCheckmarks.has(MARKETING_EMAIL_REWARD_KEY)}
            />
            <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="font-medium text-sm">
                    {t("socialPrompt.emailUpdatesTitle", {
                      amount: MARKETING_SUBSCRIBE_GOLD,
                    })}
                  </span>
                </div>
              </div>
              {!emailRewardClaimed &&
                (emailRewardFulfilled ? (
                  <TaskClaimButton
                    className="self-center"
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
                    tooltipText={t("socialPrompt.signUpRequiresSignInTooltip")}
                    size="xs"
                    className="self-center"
                    disabled={prefLoading || subscribeLoading}
                    onClick={() => void handleSubscribe()}
                  >
                    {t("socialPrompt.subscribe")}
                  </LockedSocialButton>
                ))}
            </div>
          </div>

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              exclusiveInviteDone && "border-green-500/40 bg-green-500/5",
            )}
          >
            <TaskRowStatusIcon claimed={exclusiveInviteDone} />
            <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <UserPlus
                    className="h-4 w-4 shrink-0 opacity-90"
                    aria-hidden
                  />
                  <span className="font-medium text-sm">
                    {t("socialPrompt.inviteTitle", {
                      amount: REFERRAL_REWARD_GOLD,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  {t("socialPrompt.inviteDesc", {
                    cap: SOCIAL_PROMPT_REFERRAL_CAP,
                    amount: REFERRAL_REWARD_GOLD,
                    count: referralCount,
                  })}
                </p>
              </div>
              {!referralsComplete && (
                <LockedSocialButton
                  locked={!isUserSignedIn}
                  tooltipId="social-prompt-invite"
                  tooltipText={t("socialPrompt.signUpRequiresSignInTooltip")}
                  size="xs"
                  className="self-center"
                  onClick={() => void handleCopyInvite()}
                >
                  {t("socialPrompt.copyInviteLink")}
                </LockedSocialButton>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-1 space-y-3 rounded-md border px-3 py-3",
            exclusiveRewardComplete
              ? "border-green-500/40 bg-green-500/5"
              : "border-lime-500/40 bg-lime-500/[0.07]",
          )}
        >
          <div className="flex gap-2.5 items-start">
            <span
              className={cn(
                "shrink-0 text-[17px] leading-none select-none pt-0.5",
                exclusiveRewardComplete ? "text-green-500" : "text-lime-400",
              )}
              aria-hidden
            >
              ⯫
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-sm font-medium text-foreground">
                <span className="min-w-0 leading-snug">
                  {exclusiveRewardComplete ? (
                    t("socialPrompt.progressComplete")
                  ) : (
                    <span className="inline-flex flex-wrap items-baseline gap-x-1">
                      <span>{t("socialPrompt.progressToward")}</span>
                      <span className="inline-flex items-baseline gap-x-2 font-bold">
                        {exclusiveItemName}
                        <ExclusivePromoItemInfoIcon tooltipId="social-prompt-exclusive-item-info" />
                      </span>
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    exclusiveRewardComplete ? "text-green-500" : "text-lime-400",
                  )}
                >
                  {!exclusiveRewardComplete &&
                    t("socialPrompt.tasksRemaining", {
                      count:
                        exclusiveProgress.total - exclusiveProgress.completed,
                    })}
                </span>
              </div>
            </div>
          </div>
          <div
            className="relative h-3 w-full overflow-hidden rounded-full border border-border/60 bg-neutral-800/80"
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
                  : "bg-gradient-to-r from-lime-600 to-lime-400",
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
