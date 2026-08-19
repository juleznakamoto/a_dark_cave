import { Trans } from "react-i18next";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { DropdownMenuItemWithTooltip } from "@/components/game/DropdownMenuItemWithTooltip";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { useToast } from "@/hooks/use-toast";
import { tWithFallback } from "@/i18n/resolveGameText";
import { isSteamEditionActive } from "@/lib/edition";
import { logger } from "@/lib/logger";
import {
  REFERRAL_REWARD_GOLD,
  SOCIAL_PROMPT_REFERRAL_CAP,
} from "@/game/socialPromptAuto";

export function InviteFriendsTooltip({ count }: { count: number }) {
  return (
    <p className="text-xs">
      <Trans
        i18nKey="invite.tooltip"
        ns="ui"
        defaultValue="<bold>Invite your friends</bold> and both of you will receive {{amount}} Gold. You can invite up to {{cap}} friends. ({{count}}/{{cap}} invited)."
        values={{
          amount: REFERRAL_REWARD_GOLD,
          cap: SOCIAL_PROMPT_REFERRAL_CAP,
          count,
        }}
        components={{ bold: <span className="font-semibold" /> }}
      />
    </p>
  );
}

async function copyInviteFromSocialMenu(
  toast: ReturnType<typeof useToast>["toast"],
): Promise<void> {
  const { copyInviteLinkToClipboard, isInviteNotSignedInError } = await import(
    "@/game/copyInviteLink"
  );
  try {
    await copyInviteLinkToClipboard("social");
    toast({
      title: tWithFallback("ui", "invite.linkCopied", "Invite link copied!"),
      description: tWithFallback(
        "ui",
        "invite.linkCopiedDesc",
        "Share it with friends to earn {{amount}} Gold each.",
        { amount: REFERRAL_REWARD_GOLD },
      ),
    });
  } catch (error) {
    const notSignedIn = isInviteNotSignedInError(error);
    if (!notSignedIn) {
      logger.error("Failed to copy invite link:", error);
    }
    toast({
      title: notSignedIn
        ? tWithFallback(
          "ui",
          "invite.copyFailedNotSignedIn",
          "Sign in to copy your invite link",
        )
        : tWithFallback("ui", "invite.copyFailed", "Could not copy invite link"),
      variant: "destructive",
    });
  }
}

/** Invite copy needs web auth. Hidden on Steam, Galaxy, CrazyGames, and DEV Game Mode. */
export function shouldShowInviteFriendsMenuItem(): boolean {
  return !isSteamEditionActive();
}

export function InviteFriendsMenuItem({
  referralCount = 0,
  onSelect,
}: {
  referralCount?: number;
  onSelect?: () => void;
}) {
  const { toast } = useToast();
  if (!shouldShowInviteFriendsMenuItem()) return null;
  const label = tWithFallback("ui", "footer.inviteFriends", "Invite Friends");

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItemWithTooltip
        tooltip={<InviteFriendsTooltip count={referralCount} />}
        tooltipId="footer-social-invite"
        tooltipContentClassName="max-w-xs"
        tooltipSide="top"
        tooltipAvoidCollisions={false}
        data-testid="button-footer-invite-friends"
        onSelect={() => {
          onSelect?.();
          void copyInviteFromSocialMenu(toast);
        }}
      >
        <span className="flex items-center gap-1.5">
          <GameUiIcon name="inviteUser" sizeClassName="w-4 h-4 shrink-0" />
          {label}
        </span>
      </DropdownMenuItemWithTooltip>
    </>
  );
}
