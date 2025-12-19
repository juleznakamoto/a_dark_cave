import SidePanel from "./panels/SidePanel";
import { useGameStore } from "@/game/state";
import { useEffect } from "react";

export default function GameTabs() {
  const { buildings, blessings, villagers, updatePopulation } = useGameStore();

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [
    villagers,
    buildings.woodenHut,
    buildings.stoneHut,
    buildings.longhouse,
    blessings.flames_touch,
    blessings.flames_touch_enhanced,
    updatePopulation,
  ]);

  return (
    <div className="h-full flex flex-col">
      <SidePanel />
    </div>
  );
}
