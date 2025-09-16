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
    <nav className="w-48 border-r border-border bg-muted/30">
      <div>
        <Button
          variant={activeTab === "cave" ? "default" : "ghost"}
          className="w-full justify-start text-sm background-color: blue;"
          onClick={() => setActiveTab("cave")}
          data-testid="tab-cave"
          size="sm"
        >
          The Cave
        </Button>

        {flags.villageUnlocked && (
          <Button
            variant={activeTab === "village" ? "default" : "ghost"}
            className="w-full justify-start text-sm"
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
            className="w-full justify-start text-sm"
            onClick={() => setActiveTab("world")}
            data-testid="tab-world"
            size="sm"
          >
            The World
          </Button>
        )}
      </div>

      <SidePanel />
    </nav>
  );
}
