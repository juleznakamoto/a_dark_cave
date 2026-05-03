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
        description:
          "We'll send occasional updates and offers to your email.",
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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) =>
        !open && setSocialPromptDialogOpen(false)
      }
    >
      <DialogContent className="w-[95vw] sm:max-w-lg z-[70] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stay connected &amp; earn Gold</DialogTitle>
          <DialogDescription className="text-left pt-1 space-y-2">
            <p>
              Complete any items below for bonuses—the same rewards as in
              Profile (email updates, social follows, and invites).
            </p>
            <p className="text-xs text-muted-foreground">
              Completed items show a green check. Open Profile anytime for the
              same actions.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Email */}
          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3",
              marketingOptIn && "border-green-500/40 bg-green-500/5",
            )}
          >
            <div className="pt-0.5">
              <StatusIcon done={marketingOptIn} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="font-medium text-sm">
                  Email updates (+{MARKETING_SUBSCRIBE_GOLD} Gold)
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                {marketingOptIn
                  ? "We'll send occasional updates and offers to your email."
                  : "You are currently not receiving emails with updates, discounts, and exclusive rewards."}
              </p>
              {!marketingOptIn && (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={prefLoading || subscribeLoading}
                  onClick={() => void handleSubscribe()}
                >
                  Turn on email updates
                </Button>
              )}
              {marketingOptIn && (
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Done — you&apos;re subscribed.
                </p>
              )}
            </div>
          </div>

          {/* Social */}
          {SOCIAL_PLATFORMS.map((platform) => {
            const claimed =
              social_media_rewards[platform.id]?.claimed ?? false;
            return (
              <div
                key={platform.id}
                className={cn(
                  "rounded-md border border-border p-3 flex gap-3",
                  claimed && "border-green-500/40 bg-green-500/5",
                )}
              >
                <div className="pt-0.5">
                  <StatusIcon done={claimed} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <SocialPlatformGlyph platformId={platform.id} />
                    <span className="font-medium text-sm">
                      {platform.actionLabel} on {platform.name} (+
                      {platform.reward} Gold)
                    </span>
                  </div>
                  {!claimed && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        claimSocialFollowReward(
                          platform.id,
                          platform.url,
                          platform.reward,
                          platform.name,
                        )
                      }
                    >
                      {platform.actionLabel} &amp; claim Gold
                    </Button>
                  )}
                  {claimed && (
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      Done — reward claimed.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Invite */}
          <div
            className={cn(
              "rounded-md border border-border p-3 flex gap-3",
              referralsComplete && "border-green-500/40 bg-green-500/5",
            )}
          >
            <div className="pt-0.5">
              <StatusIcon done={referralsComplete} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                <span className="font-medium text-sm">
                  Invite friends (+250 Gold each)
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Invite your friends and both of you will receive 250 gold. You
                can invite up to {SOCIAL_PROMPT_REFERRAL_CAP} friends. ({referralCount}/
                {SOCIAL_PROMPT_REFERRAL_CAP} invited).
              </p>
              {!referralsComplete && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => void handleCopyInvite()}
                >
                  Copy invite link
                </Button>
              )}
              {referralsComplete && (
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Done — you&apos;ve reached the invite limit (
                  {SOCIAL_PROMPT_REFERRAL_CAP}/{SOCIAL_PROMPT_REFERRAL_CAP}).
                </p>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => setSocialPromptDialogOpen(false)}
          disabled={subscribeLoading}
          className="w-full"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
