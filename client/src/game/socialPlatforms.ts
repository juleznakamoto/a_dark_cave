import {
  OFFICIAL_REDDIT_URL,
  OFFICIAL_INSTAGRAM_URL,
} from "@/lib/gameFooterSocialLinks";

export type SocialPlatformConfig = {
  id: string;
  name: string;
  url: string;
  reward: number;
  /** Profile-style verb (Follow / Join). */
  actionLabel: string;
};

export const SOCIAL_PLATFORMS: readonly SocialPlatformConfig[] = [
  {
    id: "instagram",
    name: "Instagram (+100 Gold)",
    url: OFFICIAL_INSTAGRAM_URL,
    reward: 100,
    actionLabel: "Follow",
  },
  {
    id: "reddit",
    name: "Reddit (+100 Gold)",
    url: OFFICIAL_REDDIT_URL,
    reward: 100,
    actionLabel: "Join",
  },
];
