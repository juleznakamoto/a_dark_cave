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
    woodenHut: buildings.woodenHut || 3,
    stoneHut: buildings.stoneHut || 2,
    longhouse: buildings.longhouse || 1,
  };

  // Create data for the inner ring (split into built/unbuilt segments)
  const innerRingData00 = [
    // Wooden Huts
    { name: "Wooden Huts Built", value:5, fill: "#3b82f6" },

    // Stone Huts
    { name: "Stone Huts Built", value: 2, fill: "#10b981" },
    // Longhouses
    { name: "Longhouses Built", value: 3, fill: "#f59e0b" },
  ];

  const innerRingData0 = [
    // Wooden Huts
    { name: "Wooden Huts Built", value: counts.woodenHut, fill: "#3b82f6" },
    {
      name: "Wooden Huts Unbuilt",
      value: maxCounts.woodenHut - counts.woodenHut,
      fill: "#6b7280",
    },
    // Stone Huts
    { name: "Stone Huts Built", value: counts.stoneHut, fill: "#10b981" },
    {
      name: "Stone Huts Unbuilt",
      value: maxCounts.stoneHut - counts.stoneHut,
      fill: "#6b7280",
    },
    // Longhouses
    { name: "Longhouses Built", value: counts.longhouse, fill: "#f59e0b" },
    {
      name: "Longhouses Unbuilt",
      value: maxCounts.longhouse - counts.longhouse,
      fill: "#6b7280",
    },
  ];
  
  const innerRingData1 = [
    // Wooden Huts
    { name: "Wooden Huts Built", value: 5, fill: "#3b82f6" },
    { name: "Wooden Huts Unbuilt", value: 2, fill: "#6b7280" },
    // Stone Huts
    { name: "Stone Huts Built", value: 3, fill: "#10b981" },
    { name: "Stone Huts Unbuilt", value: 1, fill: "#6b7280" },
    // Longhouses
    { name: "Longhouses Built", value: 4, fill: "#f59e0b" },
    { name: "Longhouses Unbuilt", value: 7, fill: "#6b7280" },
  ];

  // For demonstration, I'll create 6 rings with the same logic
  // In a real scenario, you'd define different building sets for each ring
  const rings = [
    { data: innerRingData0, innerRadius: 50, outerRadius: 55, zIndex: 1 },
    { data: innerRingData1, innerRadius: 40, outerRadius: 45, zIndex: 2 },
    { data: innerRingData0, innerRadius: 30, outerRadius: 35, zIndex: 3 },
    { data: innerRingData1, innerRadius: 20, outerRadius: 25, zIndex: 4 },
    { data: innerRingData00, innerRadius: 10, outerRadius: 15, zIndex: 5 },
    { data: innerRingData00, innerRadius: 10, outerRadius: 15, zIndex: 6 },
  ];

  return (
    <div className="w-full h-96 flex flex-col items-center justify-center">
      <h2 className="text-lg font-bold mb-4">Building Progress</h2>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id="sliceGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8884d8" />
              <stop offset="100%" stopColor="#82ca9d" />
            </linearGradient>
          </defs>
          {rings.map((ring, index) => (
            <Pie
              key={index}
              data={ring.data}
              cx="50%"
              cy="50%"
              innerRadius={ring.innerRadius}
              outerRadius={ring.outerRadius}
              paddingAngle={5}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              cornerRadius={5}
              strokeWidth={0.5}
              style={{ zIndex: ring.zIndex }}
            >
              <Cell fill="url(#sliceGradient)" />
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
          <span>
            Wooden Huts ({counts.woodenHut}/{maxCounts.woodenHut})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500"></div>
          <span>
            Stone Huts ({counts.stoneHut}/{maxCounts.stoneHut})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber-500"></div>
          <span>
            Longhouses ({counts.longhouse}/{maxCounts.longhouse})
          </span>
        </div>
      </div>
    </div>
  );
}
