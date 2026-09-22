import {
  OFFICIAL_REDDIT_URL,
  OFFICIAL_INSTAGRAM_URL,
  OFFICIAL_YOUTUBE_URL,
} from "@/lib/gameFooterSocialLinks";
import { tWithFallback } from "@/i18n/resolveGameText";

export type SocialPlatformId = "youtube" | "instagram" | "reddit";

export type SocialPlatformConfig = {
  id: SocialPlatformId;
  url: string;
  reward: number;
  /** Hidden follow tasks stay in this list so they can be turned back on. */
  active: boolean;
  /**
   * Older claim keys that still complete this task when a follow is turned off.
   */
  legacyRewardKeys?: readonly string[];
};

export const SOCIAL_PLATFORMS: readonly SocialPlatformConfig[] = [
  {
    id: "youtube",
    url: OFFICIAL_YOUTUBE_URL,
    reward: 100,
    active: true,
  },
  {
    id: "instagram",
    url: OFFICIAL_INSTAGRAM_URL,
    reward: 100,
    active: true,
  },
  {
    id: "reddit",
    url: OFFICIAL_REDDIT_URL,
    reward: 100,
    active: true,
  },
];

export const ACTIVE_SOCIAL_PLATFORMS: readonly SocialPlatformConfig[] =
  SOCIAL_PLATFORMS.filter((platform) => platform.active);

export function getSocialPlatformConfig(
  platformId: string,
): SocialPlatformConfig | undefined {
  return SOCIAL_PLATFORMS.find((platform) => platform.id === platformId);
}

export function getSocialPlatformTitle(
  platformId: SocialPlatformConfig["id"],
): string {
  return getSocialPlatformName(platformId);
}

const PLATFORM_NAME_FALLBACK: Record<SocialPlatformId, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  reddit: "Reddit",
};

export function getSocialPlatformName(
  platformId: SocialPlatformConfig["id"],
): string {
  return tWithFallback(
    "ui",
    `socialPrompt.platforms.${platformId}.title`,
    PLATFORM_NAME_FALLBACK[platformId],
  );
}

export function getSocialPlatformActionLabel(
  platformId: SocialPlatformConfig["id"],
): string {
  if (platformId === "reddit") {
    return tWithFallback(
      "ui",
      `socialPrompt.platforms.${platformId}.actionJoin`,
      "Join",
    );
  }
  if (platformId === "youtube") {
    return tWithFallback(
      "ui",
      `socialPrompt.platforms.${platformId}.actionSubscribe`,
      "Subscribe",
    );
  }
  return tWithFallback(
    "ui",
    `socialPrompt.platforms.${platformId}.actionFollow`,
    "Follow",
  );
}
