import {
  OFFICIAL_REDDIT_URL,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/gameFooterSocialLinks";
import { tWithFallback } from "@/i18n/resolveGameText";

export type SocialPlatformConfig = {
  id: "instagram" | "reddit";
  url: string;
  reward: number;
};

export const SOCIAL_PLATFORMS: readonly SocialPlatformConfig[] = [
  {
    id: "instagram",
    url: OFFICIAL_INSTAGRAM_URL,
    reward: 100,
  },
  {
    id: "reddit",
    url: OFFICIAL_REDDIT_URL,
    reward: 100,
  },
];

export function getSocialPlatformTitle(
  platformId: SocialPlatformConfig["id"],
  reward: number,
): string {
  const fallback =
    platformId === "reddit"
      ? `Reddit (+${reward} Gold)`
      : `Instagram (+${reward} Gold)`;
  return tWithFallback(
    "ui",
    `socialPrompt.platforms.${platformId}.title`,
    fallback,
    { amount: reward },
  );
}

export function getSocialPlatformName(
  platformId: SocialPlatformConfig["id"],
): string {
  const fallback = platformId === "reddit" ? "Reddit" : "Instagram";
  return tWithFallback("ui", `feedback.${platformId}`, fallback);
}

export function getSocialPlatformActionLabel(
  platformId: SocialPlatformConfig["id"],
): string {
  const key =
    platformId === "reddit"
      ? `socialPrompt.platforms.${platformId}.actionJoin`
      : `socialPrompt.platforms.${platformId}.actionFollow`;
  const fallback = platformId === "reddit" ? "Join" : "Follow";
  return tWithFallback("ui", key, fallback);
}
