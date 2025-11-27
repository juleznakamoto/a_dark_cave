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
      message: `You received ${reward} Gold for following us on ${platformName}!`,
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
                  Follow {platform.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={isActive ? "font-semibold" : ""}>+{platform.reward} Gold</span>
                {isClaimed && <span className="text-xs text-muted-foreground ml-2">✓</span>}
                <img
                  src={platform.icon}
                  alt={platform.name}
                  className="w-3 h-3 opacity-60"
                  style={{ filter: "invert(1)" }}
                />
              </div>
            </div>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}