import { useEffect, useState } from "react";
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
import { Check, Circle, Mail, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SOCIAL_PROMPT_REFERRAL_CAP } from "@/game/socialPromptAuto";
import {
  getSocialPromoExclusiveProgress,
  syncSocialPromoExclusiveRewardPending,
  isExclusiveInviteStepDone,
} from "@/game/socialPromoExclusiveReward";

interface SocialPromptDialogProps {
  isOpen: boolean;
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
  }, [isOpen, social_media_rewards, referralCount, referrals]);

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
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && setSocialPromptDialogOpen(false)}
    >
      <DialogContent className="w-[95vw] sm:max-w-lg z-[70] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stay connected and earn Rewards</DialogTitle>
          <DialogDescription className="text-left pt-1 space-y-2">
            <p>
              Complete the tasks below to receive bonuses. If you complete all
              tasks you will receive an exlusive item (only one friend invite
              needed).
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
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
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="font-medium text-sm">
                  Email updates (+{MARKETING_SUBSCRIBE_GOLD} Gold)
                </span>
              </div>
              {!emailRewardClaimed && !marketingOptIn && (
              )}
              {!emailRewardClaimed && (
                <Button
                  size="xs"
                  className="shrink-0 font-medium px-3"
                  disabled={prefLoading || subscribeLoading}
                  onClick={() => void handleSubscribe()}
                >
                  Subscribe
                </Button>
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
                    <Button
                      size="xs"
                      className="shrink-0 font-medium px-3"
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
                    </Button>
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
                  <UserPlus className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
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
                <Button
                  size="xs"
                  className="shrink-0 font-medium px-3 self-center"
                  onClick={() => void handleCopyInvite()}
                >
                  Copy invite link
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1 pt-3 border-t border-border space-y-2">
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span className="leading-snug">
              Progress toward exclusive reward
            </span>
            <span className="shrink-0 tabular-nums">
              {exclusiveProgress.completed}/{exclusiveProgress.total}
            </span>
          </div>
          <div
            className="h-2 w-full rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={exclusiveProgress.completed}
            aria-valuemin={0}
            aria-valuemax={exclusiveProgress.total}
            aria-label="Exclusive item progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${exclusiveProgress.percent}%` }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
