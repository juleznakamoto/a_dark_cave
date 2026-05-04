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
    url: "https://www.instagram.com/a_dark_cave/",
    reward: 100,
    actionLabel: "Follow",
  },
  {
    id: "reddit",
    name: "Reddit (+100 Gold)",
    url: "https://www.reddit.com/r/aDarkCave/",
    reward: 100,
    actionLabel: "Join",
  },
];
