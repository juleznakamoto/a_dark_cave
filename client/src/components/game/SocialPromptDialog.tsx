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
import { SOCIAL_PLATFORMS } from "@/game/socialPlatforms";
import { claimSocialFollowReward } from "@/game/claimSocialFollowReward";
import { SocialPlatformGlyph } from "@/components/game/SocialPlatformGlyph";
import { getCurrentUser } from "@/game/auth";
import { Check, Circle, Mail, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SOCIAL_PROMPT_REFERRAL_CAP } from "@/game/socialPromptAuto";
import {
  getSocialPromoExclusiveProgress,
  syncSocialPromoExclusiveRewardPending,
  isExclusiveInviteStepDone,
  isSocialPromoExclusiveRewardComplete,
  SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL,
} from "@/game/socialPromoExclusiveReward";

interface SocialPromptDialogProps {
  isOpen: boolean;
}

const TASK_REQUIRES_SIGNUP_TOOLTIP = "sign up to complete task";

function LockedSocialButton({
  locked,
  className,
  ...props
}: ComponentProps<typeof Button> & { locked: boolean }) {
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
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 cursor-not-allowed">{button}</span>
      </TooltipTrigger>
      <TooltipContent>{TASK_REQUIRES_SIGNUP_TOOLTIP}</TooltipContent>
    </Tooltip>
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
  const { toast } = useToast();
  const setSocialPromptDialogOpen = useGameStore(
    (s) => s.setSocialPromptDialogOpen,
  );
  const social_media_rewards = useGameStore((s) => s.social_media_rewards);
  const referralCount = useGameStore((s) => s.referralCount ?? 0);
  const referrals = useGameStore((s) => s.referrals ?? []);
  const isUserSignedIn = useGameStore((s) => s.isUserSignedIn);
  const setAuthDialogOpen = useGameStore((s) => s.setAuthDialogOpen);
  const setSignUpPromptEligibleForGold = useGameStore(
    (s) => s.setSignUpPromptEligibleForGold,
  );

  const [prefLoading, setPrefLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
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
  }, [isOpen, social_media_rewards, referralCount, referrals, isUserSignedIn]);

  const handleSignUpTaskClick = () => {
    setSignUpPromptEligibleForGold(true);
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
          title: "Not signed in",
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
        title: "You're subscribed",
        description: "We'll send occasional updates and offers to your email.",
      });
    } catch (e: unknown) {
      toast({
        title: "Could not update preference",
        description: e instanceof Error ? e.message : "Try again later.",
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
        title: "Not signed in",
        variant: "destructive",
      });
      return;
    }
    const inviteLink = `${window.location.origin}?ref=${user.id}`;
    await navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Invite link copied!",
      description: "Share it with friends to earn 250 gold each.",
    });
  };

  const referralsComplete = referralCount >= SOCIAL_PROMPT_REFERRAL_CAP;
  const emailRewardClaimed =
    !!social_media_rewards[MARKETING_EMAIL_REWARD_KEY]?.claimed;
  const exclusiveInviteDone = isExclusiveInviteStepDone({
    referralCount,
    referrals,
  });
  const exclusiveProgress = getSocialPromoExclusiveProgress({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
  });
  const exclusiveRewardComplete = isSocialPromoExclusiveRewardComplete({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && setSocialPromptDialogOpen(false)}
    >
      <DialogContent className="w-[95vw] sm:max-w-lg z-[70] max-h-[90vh] overflow-y-auto">
        <TooltipProvider>
          <DialogHeader>
            <DialogTitle>Stay connected and earn Rewards</DialogTitle>
            <DialogDescription className="text-left pt-1 space-y-2">
              <p>
                Complete the tasks below to receive bonuses. Complete all tasks to
                receive an exlusive item (only one friend invite needed).
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {/* Sign up (first task) */}
            <div
              className={cn(
                "rounded-md border border-border p-3 flex gap-3 items-center",
                isUserSignedIn && "border-green-500/40 bg-green-500/5",
              )}
            >
              <div className="shrink-0">
                <StatusIcon done={isUserSignedIn} />
              </div>
              <div className="min-w-0 flex-1 flex flex-row items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span className="font-medium text-sm">
                      Sign up (+250 Gold)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Create a free account to save your game progress and sync across devices. Without an account, your progress may be lost.
                  </p>
                  <p className="text-xs font-medium text-foreground leading-snug">
                    Sign up now and receive <strong>250 Gold</strong> as a bonus!
                  </p>
                </div>
                {!isUserSignedIn && (
                  <Button
                    size="xs"
                    className="shrink-0 font-medium px-3 self-center"
                    onClick={handleSignUpTaskClick}
                  >
                    Sign Up
                  </Button>
                )}
              </div>
            </div>

            {/* Email */}
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
                      Email updates (+{MARKETING_SUBSCRIBE_GOLD} Gold)
                    </span>
                  </div>
                </div>
                {!emailRewardClaimed && (
                  <LockedSocialButton
                    locked={!isUserSignedIn}
                    size="xs"
                    className="self-center"
                    disabled={prefLoading || subscribeLoading}
                    onClick={() => void handleSubscribe()}
                  >
                    Subscribe
                  </LockedSocialButton>
                )}
              </div>
            </div>

            {/* Social */}
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
                        {platform.name}
                      </span>
                    </div>
                    {!claimed && (
                      <LockedSocialButton
                        locked={!isUserSignedIn}
                        size="xs"
                        onClick={() =>
                          claimSocialFollowReward(
                            platform.id,
                            platform.url,
                            platform.reward,
                            platform.name,
                          )
                        }
                      >
                        {platform.actionLabel}
                      </LockedSocialButton>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Invite */}
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
                      Invite friends (+250 Gold each)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Invite your friends and both of you will receive 250 gold. You
                    can invite up to {SOCIAL_PROMPT_REFERRAL_CAP} friends. (
                    {referralCount}/{SOCIAL_PROMPT_REFERRAL_CAP} invited).
                  </p>
                </div>
                {!referralsComplete && (
                  <LockedSocialButton
                    locked={!isUserSignedIn}
                    size="xs"
                    className="self-center"
                    onClick={() => void handleCopyInvite()}
                  >
                    Copy invite link
                  </LockedSocialButton>
                )}
              </div>
            </div>
          </div>

          <div className="mt-1 space-y-3 pt-3 pb-3">
            <div className="flex gap-2.5 items-start">
              <span
                className="shrink-0 text-[17px] leading-none select-none text-lime-500 pt-0.5"
                aria-hidden
              >
                ⯫
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm font-medium text-foreground">
                  <span className="leading-snug">
                    {exclusiveRewardComplete
                      ? "You fulfilled the tasks. You will soon get the exclusive item."
                      : "Progress toward exclusive item"}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {exclusiveProgress.completed}/{exclusiveProgress.total}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={exclusiveProgress.completed}
              aria-valuemin={0}
              aria-valuemax={exclusiveProgress.total}
              aria-label="Exclusive item progress"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${exclusiveProgress.percent}%` }}
              />
              {Array.from(
                { length: SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL - 1 },
                (_, i) => i + 1,
              ).map((step) => (
                <div
                  key={step}
                  className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-background"
                  style={{
                    left: `${(step / SOCIAL_PROMO_EXCLUSIVE_STEP_TOTAL) * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              ))}
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
