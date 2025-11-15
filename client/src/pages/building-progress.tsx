
import BuildingProgressChart from "@/components/game/panels/BuildingProgressChart";

export default function BuildingProgress() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Building Progress Visualization</h1>
        <BuildingProgressChart />
      </div>
    </div>
  );
}
