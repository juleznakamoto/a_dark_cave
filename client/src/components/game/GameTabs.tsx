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
  }, [villagers, buildings.huts, updatePopulation]);

  return (
    <div className="flex">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 px-6 py-4">
        <Button
          variant={activeTab === "cave" ? "default" : "ghost"}
          className="text-sm"
          onClick={() => setActiveTab("cave")}
          data-testid="tab-cave"
          size="sm"
        >
          The Cave
        </Button>

        {flags.villageUnlocked && (
          <Button
            variant={activeTab === "village" ? "default" : "ghost"}
            className="text-sm"
            onClick={() => setActiveTab("village")}
            data-testid="tab-village"
            size="sm"
          >
            The Village
          </Button>
        )}

        {flags.worldDiscovered && (
          <Button
            variant={activeTab === "world" ? "default" : "ghost"}
            className="text-sm"
            onClick={() => setActiveTab("world")}
            data-testid="tab-world"
            size="sm"
          >
            The World
          </Button>
        )}
      </div>

      {/* Side Panel Info */}
      <div className="ml-auto">
        <SidePanel />
      </div>
    </div>
  );
}
