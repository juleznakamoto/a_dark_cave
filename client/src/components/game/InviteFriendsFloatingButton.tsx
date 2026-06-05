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
import { isInviteFriendsFloatingButtonVisible } from "@/game/socialPromoExclusiveReward";
import { useTranslation } from "react-i18next";
import { GAME_FOOTER_INSET } from "./gameChrome";

export default function InviteFriendsFloatingButton() {
  const { t } = useTranslation("ui");
  const { toast } = useToast();
  const referralCount = useGameStore((s) => s.referralCount ?? 0);
  const referrals = useGameStore((s) => s.referrals ?? []);
  const social_media_rewards = useGameStore((s) => s.social_media_rewards);
  const isUserSignedIn = useGameStore((s) => s.isUserSignedIn);
  const signupWelcomeGoldClaimed = useGameStore(
    (s) => s.signupWelcomeGoldClaimed === true,
  );

  const showFloatingInvite = isInviteFriendsFloatingButtonVisible({
    social_media_rewards,
    referralCount,
    referrals,
    isUserSignedIn,
    signupWelcomeGoldClaimed,
  });

  if (!showFloatingInvite) return null;

  const handleCopyInviteLink = async () => {
    try {
      await copyInviteLinkToClipboard();
      toast({
        title: t("invite.linkCopied"),
        description: t("invite.linkCopiedDesc", { amount: REFERRAL_REWARD_GOLD }),
      });
    } catch (error) {
      logger.error("Failed to copy invite link:", error);
      toast({
        title: t("invite.copyFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="pointer-events-auto fixed right-4 z-[46]"
      style={{ bottom: `calc(${GAME_FOOTER_INSET} + 1rem)` }}
    >
      <TooltipWrapper
        tooltip={
          <p className="text-xs">
            {t("invite.tooltip", {
              amount: REFERRAL_REWARD_GOLD,
              cap: SOCIAL_PROMPT_REFERRAL_CAP,
              count: referralCount,
            })}
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
          className="invite-friends-float-btn flex items-center gap-2 rounded-md border border-border border-red-800/50 bg-red-950/30 px-2.5 py-1.5 text-xs text-neutral-300 backdrop-blur-sm"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <UserPlus
              className="h-4 w-4 shrink-0 opacity-90"
              aria-hidden
            />
            <span>{t("invite.button")}</span>
          </div>
          <span className="shrink-0 font-semibold">
            {t("invite.goldBonus", { amount: REFERRAL_REWARD_GOLD })}
          </span>
        </button>
      </TooltipWrapper>
    </div>
  );
}
