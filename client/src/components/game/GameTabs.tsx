import SidePanel from "./panels/SidePanel";
import { useGameStore } from "@/game/state";
import { useEffect } from "react";

export default function GameTabs() {
  const woodenHut = useGameStore((s) => s.buildings?.woodenHut ?? 0);
  const stoneHut = useGameStore((s) => s.buildings?.stoneHut ?? 0);
  const longhouse = useGameStore((s) => s.buildings?.longhouse ?? 0);
  const flamesTouch = useGameStore((s) => s.blessings?.flames_touch);
  const flamesTouchEnhanced = useGameStore(
    (s) => s.blessings?.flames_touch_enhanced,
  );
  const villagers = useGameStore((s) => s.villagers);
  const updatePopulation = useGameStore((s) => s.updatePopulation);

  // Update population whenever housing / temple bonuses change
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
