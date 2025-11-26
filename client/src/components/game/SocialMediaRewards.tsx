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
  const updateResource = useGameStore((state) => state.updateResource);
  const addLogEntry = useGameStore((state) => state.addLogEntry);

  const handleSocialFollow = async (platformId: string, url: string, reward: number, platformName: string) => {
    console.log(`[SOCIAL MEDIA] Button clicked for platform: ${platformId}`);
    
    // Get fresh state to check claim status
    const currentRewards = useGameStore.getState().social_media_rewards;
    console.log(`[SOCIAL MEDIA] Current rewards state:`, currentRewards);
    console.log(`[SOCIAL MEDIA] Platform ${platformId} claimed status:`, currentRewards[platformId]?.claimed);

    // Check if already claimed
    if (currentRewards[platformId]?.claimed) {
      console.log(`[SOCIAL MEDIA] Already claimed - showing error message`);
      const alreadyClaimedLog: LogEntry = {
        id: `social-reward-already-claimed-${platformId}-${Date.now()}`,
        message: "You've already claimed this reward!",
        timestamp: Date.now(),
        type: "system",
      };
      addLogEntry(alreadyClaimedLog);
      return;
    }

    console.log(`[SOCIAL MEDIA] Not claimed yet - proceeding with claim`);

    // Open the social media link
    window.open(url, "_blank");

    // Mark as claimed and persist in state - create completely new object reference
    console.log(`[SOCIAL MEDIA] Setting claimed status to true for ${platformId}`);
    useGameStore.setState((state) => {
      const newRewards = {
        ...state.social_media_rewards,
        [platformId]: {
          claimed: true,
          timestamp: Date.now(),
        },
      };
      console.log(`[SOCIAL MEDIA] New social_media_rewards object:`, newRewards);
      return {
        social_media_rewards: newRewards,
      };
    });

    // Verify the state was updated
    const verifyState = useGameStore.getState().social_media_rewards;
    console.log(`[SOCIAL MEDIA] Verified state after update:`, verifyState);
    console.log(`[SOCIAL MEDIA] Platform ${platformId} verified claimed status:`, verifyState[platformId]?.claimed);

    // Award the gold
    console.log(`[SOCIAL MEDIA] Awarding ${reward} gold`);
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
      console.log(`[SOCIAL MEDIA] Starting save process`);
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      console.log(`[SOCIAL MEDIA] Built game state social_media_rewards:`, gameState.social_media_rewards);
      const playTimeToSave = currentState.isNewGame ? 0 : currentState.playTime;
      
      await saveGame(gameState, playTimeToSave);
      console.log(`[SOCIAL MEDIA] Save completed successfully`);
      
      useGameStore.setState({ 
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false 
      });
    } catch (error) {
      console.error("[SOCIAL MEDIA] Failed to save social media reward claim:", error);
    }
  };

  return (
    <>
      {SOCIAL_PLATFORMS.map((platform) => {
        // Subscribe to this specific platform's claimed status
        const isClaimed = useGameStore((state) => state.social_media_rewards[platform.id]?.claimed ?? false);
        
        // Button is only active (enabled) if NOT claimed
        const isActive = !isClaimed;

        console.log(`[SOCIAL MEDIA RENDER] Platform ${platform.id}: isClaimed=${isClaimed}, isActive=${isActive}`);

        return (
          <DropdownMenuItem
            key={platform.id}
            onClick={() => {
              console.log(`[SOCIAL MEDIA] onClick fired for ${platform.id}`);
              handleSocialFollow(platform.id, platform.url, platform.reward, platform.name);
            }}
            disabled={!isActive}
            className={!isActive ? "opacity-50 cursor-not-allowed" : ""}
          >
            <div className="flex items-center justify-between w-full">
              <span>
                Follow {platform.icon} <span className={isActive ? "font-semibold" : ""}>+{platform.reward} Gold</span>
              </span>
              {isClaimed && <span className="text-xs text-muted-foreground ml-2">✓ Claimed</span>}
            </div>
          </DropdownMenuItem>
        );
      })}
    </>
  );
}