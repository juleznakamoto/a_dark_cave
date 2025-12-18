import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/game/auth";
import { useState, useEffect } from "react";

// Social media platform configurations
const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '/camera.png',
    url: 'https://www.instagram.com/a_dark_cave/',
    reward: 100,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '/reddit.png',
    url: 'https://www.reddit.com/r/aDarkCave/',
    reward: 100,
  },
  // Add more platforms here as needed:
  // {
  //   id: 'twitter',
  //   name: 'Twitter/X',
  //   icon: '/camera.png',
  //   url: 'https://twitter.com/a_dark_cave',
  //   reward: 100,
  // },
];

export default function SocialMediaRewards() {
  const updateResource = useGameStore((state) => state.updateResource);
  const addLogEntry = useGameStore((state) => state.addLogEntry);
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

  const handleSocialFollow = async (platformId: string, url: string, reward: number, platformName: string) => {
    // Get fresh state to check claim status
    const currentRewards = useGameStore.getState().social_media_rewards;

    // Check if already claimed
    if (currentRewards[platformId]?.claimed) {
      const alreadyClaimedLog: LogEntry = {
        id: `social-reward-already-claimed-${platformId}-${Date.now()}`,
        message: "You've already claimed this reward!",
        timestamp: Date.now(),
        type: "system",
      };
      addLogEntry(alreadyClaimedLog);
      return;
    }

    // Open the social media link
    window.open(url, "_blank");

    // Mark as claimed and persist in state - create completely new object reference
    useGameStore.setState((state) => {
      const newRewards = {
        ...state.social_media_rewards,
        [platformId]: {
          claimed: true,
          timestamp: Date.now(),
        },
      };
      return {
        social_media_rewards: newRewards,
      };
    });

    // Award the gold
    updateResource("gold", reward);

    // Add reward message to event log
    const rewardLog: LogEntry = {
      id: `social-reward-claimed-${platformId}-${Date.now()}`,
      message: `You received ${reward} Gold for (maybe) following us on ${platformName}!`,
      timestamp: Date.now(),
      type: "system",
      visualEffect: {
        type: "glow",
        duration: 3,
      },
    };
    addLogEntry(rewardLog);

    // Immediately save the game state to persist the reward claim
    try {
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      const playTimeToSave = currentState.isNewGame ? 0 : currentState.playTime;

      await saveGame(gameState, playTimeToSave);

      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false
      });
    } catch (error) {
      logger.error("Failed to save social media reward claim:", error);
    }
  };

  return (
    <>
      {SOCIAL_PLATFORMS.map((platform) => {
        // Subscribe to this specific platform's claimed status
        const isClaimed = useGameStore((state) => state.social_media_rewards[platform.id]?.claimed ?? false);

        // Button is only active (enabled) if NOT claimed AND user is logged in
        const isActive = !isClaimed && !!currentUser;

        return (
          <DropdownMenuItem
            key={platform.id}
            onClick={() => {
              handleSocialFollow(platform.id, platform.url, platform.reward, platform.name);
            }}
            disabled={!isActive}
            className={!isActive ? "opacity-50 cursor-not-allowed" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1">
                <span>
                  Follow&nbsp;
                </span>
                {platform.id === 'instagram' ? (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                ) : platform.id === 'reddit' ? (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                ) : (
                  <img
                    src={platform.icon}
                    alt={platform.name}
                    className="w-3 h-3 opacity-90"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">&nbsp;+{platform.reward} Gold</span>
                {isClaimed && <span className="text-xs text-muted-foreground">✓</span>}
                
              </div>
            </div>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}