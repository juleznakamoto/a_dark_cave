import { UserPlus } from "lucide-react";
import { useGameStore } from "@/game/state";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { copyInviteLinkToClipboard } from "@/game/copyInviteLink";
import {
  SOCIAL_PROMPT_REFERRAL_CAP,
  REFERRAL_REWARD_GOLD,
} from "@/game/socialPromptAuto";
import { isSocialPromoExclusiveRewardComplete } from "@/game/socialPromoExclusiveReward";

export default function InviteFriendsFloatingButton() {
  const { toast } = useToast();
  const referralCount = useGameStore((s) => s.referralCount ?? 0);
  const referrals = useGameStore((s) => s.referrals ?? []);
  const social_media_rewards = useGameStore((s) => s.social_media_rewards);
  const isUserSignedIn = useGameStore((s) => s.isUserSignedIn);
  const signupWelcomeGoldClaimed = useGameStore(
    (s) => s.signupWelcomeGoldClaimed === true,
  );
  const giftedRingGranted = useGameStore((s) => s.clothing?.gifted_ring === true);

  const exclusiveTrackTasksDone = isSocialPromoExclusiveRewardComplete({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
  });
  const rewardsTasksShortcutVisible =
    !exclusiveTrackTasksDone || !giftedRingGranted;

  const showFloatingInvite =
    isUserSignedIn &&
    !rewardsTasksShortcutVisible &&
    referralCount < SOCIAL_PROMPT_REFERRAL_CAP;

  if (!showFloatingInvite) return null;

  const handleCopyInviteLink = async () => {
    try {
      await copyInviteLinkToClipboard();
      toast({
        title: "Invite link copied!",
        description: `Share it with friends to earn ${REFERRAL_REWARD_GOLD} Gold each.`,
      });
    } catch (error) {
      logger.error("Failed to copy invite link:", error);
      toast({
        title: "Could not copy invite link",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="pointer-events-auto fixed z-30 right-3 sm:right-4"
      style={{ bottom: "52px" }}
    >
      <TooltipWrapper
        tooltip={
          <p className="text-xs">
            Invite your friends and both of you will receive {REFERRAL_REWARD_GOLD}{" "}
            Gold. You can invite up to {SOCIAL_PROMPT_REFERRAL_CAP} friends. (
            {referralCount}/{SOCIAL_PROMPT_REFERRAL_CAP} invited).
          </p>
        }
        tooltipId="referral-floating-invite"
        tooltipContentClassName="max-w-xs"
        className="inline-flex"
        onClick={() => {
          void handleCopyInviteLink();
        }}
      >
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border bg-background/90 px-2.5 py-1.5 text-xs text-neutral-300 backdrop-blur-sm transition-colors hover:bg-muted/50"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <UserPlus
              className="h-4 w-4 shrink-0 opacity-90"
              aria-hidden
            />
            <span>Invite</span>
          </div>
          <span className="shrink-0 font-semibold">+{REFERRAL_REWARD_GOLD} Gold</span>
        </button>
      </TooltipWrapper>
    </div>
  );
}
