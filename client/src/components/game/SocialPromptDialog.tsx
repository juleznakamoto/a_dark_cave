import { useEffect, useState, type ComponentProps } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { getSupabaseClient } from "@/lib/supabase";
import { apiUrl } from "@/lib/apiUrl";
import { useToast } from "@/hooks/use-toast";
import {
  MARKETING_EMAIL_REWARD_KEY,
  MARKETING_SUBSCRIBE_GOLD,
  applyMarketingSubscribeGoldReward,
  postMarketingPreference,
} from "@/game/marketingEmailReward";
import {
  SOCIAL_PLATFORMS,
  getSocialPlatformActionLabel,
  getSocialPlatformTitle,
} from "@/game/socialPlatforms";
import { claimSocialFollowReward } from "@/game/claimSocialFollowReward";
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
  isSignUpRewardsStepDone,
  SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
} from "@/game/socialPromoExclusiveReward";
import {
  PLAYLIGHT_DISCOVER_REWARD_KEY,
  PLAYLIGHT_DISCOVER_REWARD_GOLD,
  claimPlaylightDiscoverReward,
} from "@/game/playlightDiscoverReward";
import { useTranslation } from "react-i18next";

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

function StatusIcon({ done }: { done: boolean }) {
  return done ? (
    <Check
      className="h-5 w-5 shrink-0 text-green-500"
      strokeWidth={2.5}
      aria-hidden
    />
  ) : (
    <Circle
      className="h-5 w-5 shrink-0 text-muted-foreground/60"
      strokeWidth={2}
      aria-hidden
    />
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
  const signUpTaskDone = isSignUpRewardsStepDone({
    isUserSignedIn,
    signupWelcomeGoldClaimed,
  });
  const setAuthDialogOpen = useGameStore((s) => s.setAuthDialogOpen);
  const setSignUpPromptEligibleForGold = useGameStore(
    (s) => s.setSignUpPromptEligibleForGold,
  );

  const [prefLoading, setPrefLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [discoverGamesLoading, setDiscoverGamesLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setPrefLoading(true);

    (async () => {
      try {
        const supabase = await getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) {
          setPrefLoading(false);
          return;
        }
        const res = await fetch(apiUrl("/api/marketing/preferences"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok || cancelled) {
          setPrefLoading(false);
          return;
        }
        const j = (await res.json()) as { marketing_opt_in?: boolean };
        if (!cancelled) {
          setMarketingOptIn(j.marketing_opt_in === true);
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

      await postMarketingPreference({
        accessToken: session.access_token,
        marketingOptIn: true,
        consentSource: "social_prompt_dialog",
      });

      applyMarketingSubscribeGoldReward();
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
  const emailRewardClaimed =
    !!social_media_rewards[MARKETING_EMAIL_REWARD_KEY]?.claimed;
  const playlightDiscoverRewardClaimed =
    !!social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]?.claimed;
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
            const claimed = social_media_rewards[platform.id]?.claimed ?? false;
            return (
              <div
                key={platform.id}
                className={cn(
                  "rounded-md border border-border p-3 flex gap-3 items-center",
                  claimed && "border-green-500/40 bg-green-500/5",
                )}
              >
                <div className="shrink-0">
                  <StatusIcon done={claimed} />
                </div>
                <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <SocialPlatformGlyph platformId={platform.id} />
                    <span className="font-medium text-sm truncate">
                      {getSocialPlatformTitle(platform.id, platform.reward)}
                    </span>
                  </div>
                  {!claimed && (
                    <Button
                      size="xs"
                      className="shrink-0 font-medium px-3"
                      onClick={() =>
                        claimSocialFollowReward(
                          platform.id,
                          platform.url,
                          platform.reward,
                        )
                      }
                    >
                      {getSocialPlatformActionLabel(platform.id)}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              playlightDiscoverRewardClaimed &&
              "border-green-500/40 bg-green-500/5",
            )}
          >
            <div className="shrink-0">
              <StatusIcon done={playlightDiscoverRewardClaimed} />
            </div>
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
              {!playlightDiscoverRewardClaimed && (
                <Button
                  size="xs"
                  className="shrink-0 font-medium px-3 self-center"
                  disabled={discoverGamesLoading}
                  onClick={() => {
                    if (discoverGamesLoading) return;
                    setDiscoverGamesLoading(true);
                    void claimPlaylightDiscoverReward().finally(() => {
                      setDiscoverGamesLoading(false);
                    });
                  }}
                >
                  {t("socialPrompt.discoverGames")}
                </Button>
              )}
            </div>
          </div>

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              signUpTaskDone && "border-green-500/40 bg-green-500/5",
            )}
          >
            <div className="shrink-0">
              <StatusIcon done={signUpTaskDone} />
            </div>
            <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                  <span className="font-medium text-sm">
                    {t("socialPrompt.signUpTitle", {
                      amount: SIGN_UP_WELCOME_GOLD,
                    })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">
                  {t("socialPrompt.signUpDesc")}
                </p>
              </div>
              {!signUpTaskDone && (
                <Button
                  size="xs"
                  className="shrink-0 font-medium px-3 self-center"
                  onClick={handleSignUpTaskClick}
                >
                  {t("socialPrompt.signUpButton")}
                </Button>
              )}
            </div>
          </div>

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              emailRewardClaimed && "border-green-500/40 bg-green-500/5",
            )}
          >
            <div className="shrink-0">
              <StatusIcon done={emailRewardClaimed} />
            </div>
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
              {!emailRewardClaimed && (
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
              )}
            </div>
          </div>

          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3 items-center",
              exclusiveInviteDone && "border-green-500/40 bg-green-500/5",
            )}
          >
            <div className="shrink-0">
              <StatusIcon done={exclusiveInviteDone} />
            </div>
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
                <span className="leading-snug">
                  {exclusiveRewardComplete
                    ? t("socialPrompt.progressComplete")
                    : t("socialPrompt.progressToward")}
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    exclusiveRewardComplete ? "text-green-500" : "text-lime-400",
                  )}
                >
                  {exclusiveProgress.completed}/{exclusiveProgress.total}
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
