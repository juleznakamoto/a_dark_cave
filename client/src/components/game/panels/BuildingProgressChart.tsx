import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function BuildingProgressChart() {
  const { buildings } = useGameStore();

  const paddingAngle = 5;

  // Define max counts for each building type
  const maxCounts = {
    woodenHut: 10,
    stoneHut: 10,
    longhouse: 2,
  };

  // Calculate current counts
  const counts = {
    woodenHut: buildings.woodenHut || 3,
    stoneHut: buildings.stoneHut || 5,
    longhouse: buildings.longhouse || 2,
  };

  // Create data for the inner ring (split into built/unbuilt segments)
  const BackgroundRing0 = [
    { name: "Wooden Huts Built", value: maxCounts.woodenHut, fill: "#cccdc6" },
    { name: "Stone Huts Built", value: maxCounts.stoneHut, fill: "#cccdc6" },
    { name: "Longhouses Built", value: maxCounts.longhouse, fill: "#cccdc6" },
  ];

  const totalMaxCount =
    maxCounts.woodenHut + maxCounts.stoneHut + maxCounts.longhouse;

  const startSeg0 = 90;
  const endSeg0 = startSeg0 - (345 * maxCounts.woodenHut) / totalMaxCount;
  const lengthSeg0 = endSeg0 - startSeg0;
  const progressSeg0 =
    startSeg0 + lengthSeg0 * (counts.woodenHut / maxCounts.woodenHut);

  const startSeg1 = endSeg0 - paddingAngle;
  const endSeg1 = startSeg1 - (345 * maxCounts.stoneHut) / totalMaxCount;
  const lengthSeg1 = endSeg1 - startSeg1;
  const progressSeg1 =
    startSeg1 + lengthSeg1 * (counts.stoneHut / maxCounts.stoneHut);

  const startSeg2 = endSeg1 - paddingAngle;
  const endSeg2 = startSeg2 - (345 * maxCounts.longhouse) / totalMaxCount;
  const lengthSeg2 = endSeg2 - startSeg2;
  const progressSeg2 =
    startSeg2 + lengthSeg2 * (counts.longhouse / maxCounts.longhouse);

  const ProgressRing0 = [
    {
      name: "Wooden Huts Built",
      fill: "#3b82f6",
      strokeWidth: 0,
      startAngle: startSeg0,
      endAngle: progressSeg0,
    },
    {
      name: "Stone Huts Built",
      fill: "#10b981",
      strokeWidth: 0,
      startAngle: startSeg1,
      endAngle: progressSeg1,
    },
    {
      name: "Longhouses Built",
      fill: "#f59e0b",
      strokeWidth: 0,
      startAngle: startSeg2,
      endAngle: progressSeg2,
    },
  ];

  const innerRingData0 = [
    { name: "Wooden Huts Built", value: counts.woodenHut, fill: "#3b82f6" },
    {
      name: "Wooden Huts Unbuilt",
      value: maxCounts.woodenHut - counts.woodenHut,
      fill: "#6b7280",
    },
    { name: "Stone Huts Built", value: counts.stoneHut, fill: "#10b981" },
    {
      name: "Stone Huts Unbuilt",
      value: maxCounts.stoneHut - counts.stoneHut,
      fill: "#6b7280",
    },
    { name: "Longhouses Built", value: counts.longhouse, fill: "#f59e0b" },
    {
      name: "Longhouses Unbuilt",
      value: maxCounts.longhouse - counts.longhouse,
      fill: "#6b7280",
    },
  ];

  const innerRingData1 = [
    { name: "Wooden Huts Built", value: 5, fill: "#3b82f6" },
    { name: "Wooden Huts Unbuilt", value: 2, fill: "#6b7280" },
    { name: "Stone Huts Built", value: 3, fill: "#10b981" },
    { name: "Stone Huts Unbuilt", value: 1, fill: "#6b7280" },
    { name: "Longhouses Built", value: 4, fill: "#f59e0b" },
    { name: "Longhouses Unbuilt", value: 7, fill: "#6b7280" },
  ];

  const rings = [
    // { data: innerRingData0, innerRadius: 50, outerRadius: 55 },
    // { data: innerRingData1, innerRadius: 40, outerRadius: 45 },
    // { data: innerRingData0, innerRadius: 30, outerRadius: 35 },
    // { data: innerRingData1, innerRadius: 20, outerRadius: 25 },
    { data: BackgroundRing0, innerRadius: 14, outerRadius: 18 },
    { data: ProgressRing0, innerRadius: 14, outerRadius: 18 },
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
              paddingAngle={paddingAngle}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              cornerRadius={5}
              strokeWidth={0.5}
              isAnimationActive={false}
            >
              {ring.data.map((entry, entryIndex) => (
                <Cell key={`cell-${index}-${entryIndex}`} fill={entry.fill} />
              ))}
            </Pie>
          ))}
          {/* Render ProgressRing0 segments individually with custom angles */}
          {ProgressRing0.map((segment, index) => (
            <Pie
              key={`progress-${index}`}
              data={[{ value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={14}
              outerRadius={18}
              dataKey="value"
              startAngle={segment.startAngle}
              endAngle={segment.endAngle}
              cornerRadius={5}
              strokeWidth={0}
              style={{ zIndex: 10 }}
              isAnimationActive={false}
            >
              <Cell fill={segment.fill} />
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
