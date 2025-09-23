import SidePanel from "./panels/SidePanel";
import { useGameStore } from "@/game/state";
import { useEffect } from "react";

export default function GameTabs() {
  const {
    buildings,
    villagers,
    updatePopulation,
  } = useGameStore();

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [villagers, buildings.woodenHut, updatePopulation]);

  return (
    <div className="h-full flex flex-col">
      <SidePanel />
    </div>
  );
}