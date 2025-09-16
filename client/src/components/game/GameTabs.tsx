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
    <div className="flex flex-col">
      <nav className="border-b border-border mb-6">
        <div className="flex space-x-1 p-1">
          <Button
            variant="ghost"
            className={`px-4 py-2 text-sm bg-transparent hover:bg-transparent ${activeTab === "cave" ? "font-bold border-b-2 border-primary" : ""}`}
            onClick={() => setActiveTab("cave")}
            data-testid="tab-cave"
            size="sm"
          >
            The Cave
          </Button>

          {flags.villageUnlocked && (
            <Button
              variant="ghost"
              className={`px-4 py-2 text-sm bg-transparent hover:bg-transparent ${activeTab === "village" ? "font-bold border-b-2 border-primary" : ""}`}
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
              className={`px-4 py-2 text-sm bg-transparent hover:bg-transparent ${activeTab === "forest" ? "font-bold border-b-2 border-primary" : ""}`}
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
              className={`px-4 py-2 text-sm bg-transparent hover:bg-transparent ${activeTab === "world" ? "font-bold border-b-2 border-primary" : ""}`}
              onClick={() => setActiveTab("world")}
              data-testid="tab-world"
              size="sm"
            >
              The World
            </Button>
          )}
        </div>
      </nav>

      <div className="flex flex-1 min-h-0">
        <div className="w-48 border-r border-border pr-6">
          <SidePanel />
        </div>
      </div>
    </div>
  );
}