
import { useGameStore } from "@/game/state";
import CircularProgress from "@/components/ui/circular-progress";

export default function SacrificeProgressChartAchievements() {
  const gameState = useGameStore();
  
  // Sacrifice stats from story.seen (existing tracking)
  const boneTotemsCount = Number(gameState.story?.seen?.boneTotemsUsageCount) || 0;
  const leatherTotemsCount = Number(gameState.story?.seen?.leatherTotemsUsageCount) || 0;
  const animalSacrificeLevel = Number(gameState.story?.seen?.animalsSacrificeLevel) || 0;
  
  // Click levels from buttonUpgrades (existing tracking)
  const caveExploreLevel = gameState.buttonUpgrades?.caveExplore?.level || 0;
  const huntLevel = gameState.buttonUpgrades?.hunt?.level || 0;
  const chopWoodLevel = gameState.buttonUpgrades?.chopWood?.level || 0;
  const mineStoneLevel = gameState.buttonUpgrades?.mineStone?.level || 0;
  const mineIronLevel = gameState.buttonUpgrades?.mineIron?.level || 0;
  const mineCoalLevel = gameState.buttonUpgrades?.mineCoal?.level || 0;
  const mineSulfurLevel = gameState.buttonUpgrades?.mineSulfur?.level || 0;
  const mineObsidianLevel = gameState.buttonUpgrades?.mineObsidian?.level || 0;
  const mineAdamantLevel = gameState.buttonUpgrades?.mineAdamant?.level || 0;

  const segments = [
    // Sacrifices
    {
      value: boneTotemsCount,
      max: 20,
      color: "rgb(168, 85, 247)", // purple
      label: "Bone Totems",
    },
    {
      value: leatherTotemsCount,
      max: 20,
      color: "rgb(139, 92, 46)", // brown
      label: "Leather Totems",
    },
    {
      value: animalSacrificeLevel,
      max: 10,
      color: "rgb(239, 68, 68)", // red
      label: "Animals",
    },
    // Click levels
    {
      value: caveExploreLevel,
      max: 10,
      color: "rgb(100, 116, 139)", // slate
      label: "Cave Explore",
    },
    {
      value: huntLevel,
      max: 10,
      color: "rgb(34, 197, 94)", // green
      label: "Hunt",
    },
    {
      value: chopWoodLevel,
      max: 10,
      color: "rgb(101, 163, 13)", // lime
      label: "Chop Wood",
    },
    {
      value: mineStoneLevel,
      max: 10,
      color: "rgb(156, 163, 175)", // gray
      label: "Mine Stone",
    },
    {
      value: mineIronLevel,
      max: 10,
      color: "rgb(148, 163, 184)", // slate-400
      label: "Mine Iron",
    },
    {
      value: mineCoalLevel,
      max: 10,
      color: "rgb(31, 41, 55)", // gray-800
      label: "Mine Coal",
    },
    {
      value: mineSulfurLevel,
      max: 10,
      color: "rgb(234, 179, 8)", // yellow
      label: "Mine Sulfur",
    },
    {
      value: mineObsidianLevel,
      max: 10,
      color: "rgb(15, 23, 42)", // slate-900
      label: "Mine Obsidian",
    },
    {
      value: mineAdamantLevel,
      max: 10,
      color: "rgb(147, 51, 234)", // purple-600
      label: "Mine Adamant",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs text-gray-400 mb-1">Progress</div>
      <CircularProgress
        segments={segments}
        size={180}
        strokeWidth={12}
        backgroundColor="rgb(31, 41, 55)"
      />
    </div>
  );
}
