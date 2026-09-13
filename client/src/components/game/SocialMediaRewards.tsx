import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useGameStore } from "@/game/state";
import { getCurrentUser } from "@/game/auth";
import { useState, useEffect } from "react";
import {
  ACTIVE_SOCIAL_PLATFORMS,
  getSocialPlatformActionLabel,
} from "@/game/socialPlatforms";
import { claimSocialFollowReward } from "@/game/claimSocialFollowReward";
import { SocialPlatformGlyph } from "@/components/game/SocialPlatformGlyph";
import {
  getSocialPlatformRewardEntry,
  isSocialRewardClaimed,
} from "@/game/socialTaskRewards";
import { useTranslation } from "react-i18next";

export default function SocialMediaRewards() {
  const { t } = useTranslation("common");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    checkAuth();
  }, []);

  return (
    <>
      {ACTIVE_SOCIAL_PLATFORMS.map((platform) => {
        // Subscribe to this specific platform's claimed status
        const isClaimed = useGameStore((state) =>
          isSocialRewardClaimed(
            getSocialPlatformRewardEntry(
              state.social_media_rewards,
              platform.id,
            ),
          ),
        );

        // Button is only active (enabled) if NOT claimed AND user is logged in
        const isActive = !isClaimed && !!currentUser;

        return (
          <DropdownMenuItem
            key={platform.id}
            onClick={() => {
              claimSocialFollowReward(
                platform.id,
                platform.url,
                platform.reward,
              );
            }}
            disabled={!isActive}
            className={!isActive ? "opacity-50 cursor-not-allowed" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1">
                <span>
                  {getSocialPlatformActionLabel(platform.id)}&nbsp;
                </span>
                <SocialPlatformGlyph
                  platformId={platform.id}
                  sizeClassName="w-3 h-3"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  &nbsp;+
                  {t("currency.goldAmount", { amount: platform.reward })}
                </span>
                {isClaimed && <span className="text-xs text-muted-foreground">✓</span>}

              </div>
            </div>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}
