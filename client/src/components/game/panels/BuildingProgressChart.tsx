
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function BuildingProgressChart() {
  const { buildings } = useGameStore();

  // Define max counts for each building type
  const maxCounts = {
    woodenHut: 10,
    stoneHut: 10,
    longhouse: 2,
  };

  // Calculate current counts
  const counts = {
    woodenHut: buildings.woodenHut || 0,
    stoneHut: buildings.stoneHut || 0,
    longhouse: buildings.longhouse || 0,
  };

  // Calculate total segments and progress for inner ring
  const innerTotal = maxCounts.woodenHut + maxCounts.stoneHut + maxCounts.longhouse;
  
  // Create data for the inner ring (split into built/unbuilt segments)
  const innerRingData = [
    // Wooden Huts
    { name: "Wooden Huts Built", value: counts.woodenHut, fill: "#3b82f6" },
    { name: "Wooden Huts Unbuilt", value: maxCounts.woodenHut - counts.woodenHut, fill: "#6b7280" },
    // Stone Huts
    { name: "Stone Huts Built", value: counts.stoneHut, fill: "#10b981" },
    { name: "Stone Huts Unbuilt", value: maxCounts.stoneHut - counts.stoneHut, fill: "#6b7280" },
    // Longhouses
    { name: "Longhouses Built", value: counts.longhouse, fill: "#f59e0b" },
    { name: "Longhouses Unbuilt", value: maxCounts.longhouse - counts.longhouse, fill: "#6b7280" },
  ];

  // For demonstration, I'll create 5 rings with the same logic
  // In a real scenario, you'd define different building sets for each ring
  const rings = [
    { data: innerRingData, innerRadius: 100, outerRadius: 120 },
    { data: innerRingData, innerRadius: 75, outerRadius: 95 },
    { data: innerRingData, innerRadius: 50, outerRadius: 70 },
    { data: innerRingData, innerRadius: 25, outerRadius: 45 },
    { data: innerRingData, innerRadius: 0, outerRadius: 20 },
  ];

  return (
    <div className="w-full h-96 flex flex-col items-center justify-center">
      <h2 className="text-lg font-bold mb-4">Building Progress</h2>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {rings.map((ring, index) => (
            <Pie
              key={index}
              data={ring.data}
              cx="50%"
              cy="50%"
              innerRadius={ring.innerRadius}
              outerRadius={ring.outerRadius}
              paddingAngle={0}
              dataKey="value"
              startAngle={90}
              endAngle={450}
            >
              {ring.data.map((entry, entryIndex) => (
                <Cell key={`cell-${index}-${entryIndex}`} fill={entry.fill} />
              ))}
            </Pie>
          ))}
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500"></div>
          <span>Wooden Huts ({counts.woodenHut}/{maxCounts.woodenHut})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500"></div>
          <span>Stone Huts ({counts.stoneHut}/{maxCounts.stoneHut})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500"></div>
          <span>Longhouses ({counts.longhouse}/{maxCounts.longhouse})</span>
        </div>
      </div>
    </div>
  );
}
