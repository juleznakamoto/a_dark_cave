import SidePanel from "./panels/SidePanel";
import MerchantPanel from "./panels/MerchantPanel";
import { useGameStore } from "@/game/state";
import { useEffect } from "react";

export default function GameTabs() {
  const { buildings, blessings, villagers, flags, activeTab, updatePopulation } = useGameStore();

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

  if (activeTab === "merchant") {
    return (
      <div className="h-full flex flex-col">
        <MerchantPanel />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <SidePanel />
    </div>
  );
}
