
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";

// Social media platform configurations
const SOCIAL_PLATFORMS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📷',
    url: 'https://www.instagram.com/a_dark_cave/',
    reward: 100,
  },
  // Add more platforms here as needed:
  // {
  //   id: 'twitter',
  //   name: 'Twitter/X',
  //   icon: '🐦',
  //   url: 'https://twitter.com/a_dark_cave',
  //   reward: 100,
  // },
];

export default function SocialMediaRewards() {
  const social_media_rewards = useGameStore((state) => state.social_media_rewards);
  const updateResource = useGameStore((state) => state.updateResource);
  const addLogEntry = useGameStore((state) => state.addLogEntry);

  const handleSocialFollow = async (platformId: string, url: string, reward: number, platformName: string) => {
    // Check if already claimed
    if (social_media_rewards[platformId]?.claimed) {
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

    // Mark as claimed and persist in state
    useGameStore.setState((state) => ({
      social_media_rewards: {
        ...state.social_media_rewards,
        [platformId]: {
          claimed: true,
          timestamp: Date.now(),
        },
      },
    }));

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
      console.error("Failed to save social media reward claim:", error);
    }
  };

  return (
    <>
      {SOCIAL_PLATFORMS.map((platform) => {
        const isClaimed = social_media_rewards[platform.id]?.claimed;
        
        return (
          <DropdownMenuItem
            key={platform.id}
            onClick={() => handleSocialFollow(platform.id, platform.url, platform.reward, platform.name)}
            disabled={isClaimed}
            className={isClaimed ? "opacity-50 cursor-not-allowed" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <span>
                Follow {platform.icon} <span className={isClaimed ? "" : "font-semibold"}>+{platform.reward} Gold</span>
              </span>
              {isClaimed && <span className="text-xs text-muted-foreground ml-2">✓ Claimed</span>}
            </div>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}
