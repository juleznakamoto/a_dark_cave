import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function BuildingProgressChart() {
  const { buildings } = useGameStore();

  const paddingAngle = 5;
  const backgroundColor = "#cccdc6";

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

  // Create data for the inner ring (split into built/unbuilt segments)
  const BackgroundRing0 = [
    { name: "Wooden Huts Built", value: maxCounts.woodenHut, fill: backgroundColor },
    { name: "Stone Huts Built", value: maxCounts.stoneHut, fill: backgroundColor },
    { name: "Longhouses Built", value: maxCounts.longhouse, fill: backgroundColor },
  ];

  const totalMaxCount =
    maxCounts.woodenHut + maxCounts.stoneHut + maxCounts.longhouse;
  
  const totalDegrees = 345; // Total degrees to use (360 - 15 for gap)
  const startAngle = 90;

  // Helper function to calculate segment angles
  const calculateSegment = (
    buildingType: keyof typeof maxCounts,
    previousEndAngle: number
  ) => {
    const maxCount = maxCounts[buildingType];
    const currentCount = counts[buildingType];
    
    const startAngle = previousEndAngle - paddingAngle;
    const segmentDegrees = (totalDegrees * maxCount) / totalMaxCount;
    const endAngle = startAngle - segmentDegrees;
    const segmentLength = endAngle - startAngle;
    const progress = currentCount / maxCount;
    const progressAngle = startAngle + segmentLength * progress;

    return { startAngle, endAngle, progressAngle };
  };

  // Calculate segments
  const seg0 = calculateSegment('woodenHut', startAngle);
  const seg1 = calculateSegment('stoneHut', seg0.endAngle);
  const seg2 = calculateSegment('longhouse', seg1.endAngle);

  const ProgressRing0 = [
    {
      name: "Wooden Huts Built",
      fill: "#3b82f6",
      strokeWidth: 0,
      startAngle: seg0.startAngle,
      endAngle: seg0.progressAngle,
    },
    {
      name: "Stone Huts Built",
      fill: "#10b981",
      strokeWidth: 0,
      startAngle: seg1.startAngle,
      endAngle: seg1.progressAngle,
    },
    {
      name: "Longhouses Built",
      fill: "#f59e0b",
      strokeWidth: 0,
      startAngle: seg2.startAngle,
      endAngle: seg2.progressAngle,
    },
  ];

  const rings = [
    { data: BackgroundRing0, innerRadius: 14, outerRadius: 18 },
    { data: ProgressRing0, innerRadius: 14, outerRadius: 18 },
  ];

  return (
    <div className="w-full h-10 flex flex-col items-center justify-center">
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
    </div>
  );
}
