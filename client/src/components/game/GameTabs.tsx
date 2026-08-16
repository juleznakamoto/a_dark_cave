import SidePanel from "./panels/SidePanel";
import { useGameStore } from "@/game/state";
import { useEffect } from "react";

export default function GameTabs() {
  const woodenHut = useGameStore((s) => s.buildings.woodenHut);
  const stoneHut = useGameStore((s) => s.buildings.stoneHut);
  const longhouse = useGameStore((s) => s.buildings.longhouse);
  const flamesTouch = useGameStore((s) => s.blessings.flames_touch);
  const flamesTouchEnhanced = useGameStore((s) => s.blessings.flames_touch_enhanced);
  const villagers = useGameStore((s) => s.villagers);
  const updatePopulation = useGameStore((s) => s.updatePopulation);

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [
    villagers,
    woodenHut,
    stoneHut,
    longhouse,
    flamesTouch,
    flamesTouchEnhanced,
    updatePopulation,
  ]);

  return (
    <div className="h-full w-full flex flex-col">
      <SidePanel />
    </div>
  );
}
