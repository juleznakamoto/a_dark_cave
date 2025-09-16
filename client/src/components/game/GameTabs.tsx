import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import SidePanel from "./panels/SidePanel"; // Assuming SidePanel is now in the same directory or adjust path as needed
import { useEffect } from "react";

export default function GameTabs() {
  const {
    activeTab,
    setActiveTab,
    flags,
    buildings,
    villagers,
    updatePopulation,
  } = useGameStore();

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [villagers, buildings.hut, updatePopulation]);

  return (
    <nav className="w-48 border-r border-border h-full flex flex-col">
      <div>
        <Button
          variant="ghost"
          className={`w-full justify-start text-sm bg-transparent hover:bg-transparent ${activeTab === "cave" ? "font-bold" : ""}`}
          onClick={() => setActiveTab("cave")}
          data-testid="tab-cave"
          size="sm"
        >
          The Cave
        </Button>

        {flags.villageUnlocked && (
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm bg-transparent hover:bg-transparent ${activeTab === "village" ? "font-bold" : ""}`}
            onClick={() => setActiveTab("village")}
            data-testid="tab-village"
            size="sm"
          >
            The Village
          </Button>
        )}

        {flags.forestUnlocked && (
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm bg-transparent hover:bg-transparent ${activeTab === "forest" ? "font-bold" : ""}`}
            onClick={() => setActiveTab("forest")}
            data-testid="tab-forest"
            size="sm"
          >
            The Forest
          </Button>
        )}

        {flags.worldDiscovered && (
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm bg-transparent hover:bg-transparent ${activeTab === "world" ? "font-bold" : ""}`}
            onClick={() => setActiveTab("world")}
            data-testid="tab-world"
            size="sm"
          >
            The World
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <SidePanel />
      </div>
    </nav>
  );
}