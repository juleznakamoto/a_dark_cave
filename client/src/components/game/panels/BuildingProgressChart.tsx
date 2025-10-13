
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface BuildingSegment {
  buildingType: keyof typeof buildings;
  maxCount: number;
  color: string;
  label: string;
}

interface RingConfig {
  segments: BuildingSegment[];
  innerRadius: number;
  outerRadius: number;
}

export default function BuildingProgressChart() {
  const { buildings } = useGameStore();

  const paddingAngle = 5;
  const backgroundColor = "#cccdc6";
  const totalDegrees = 345; // Total degrees to use (360 - 15 for gap)
  const startAngle = 90;

  // Define ring configurations
  const ringConfigs: RingConfig[] = [
    {
      segments: [
        { buildingType: 'woodenHut', maxCount: 10, color: '#3b82f6', label: 'Wooden Huts' },
        { buildingType: 'stoneHut', maxCount: 10, color: '#10b981', label: 'Stone Huts' },
        { buildingType: 'longhouse', maxCount: 2, color: '#f59e0b', label: 'Longhouses' },
      ],
      innerRadius: 14,
      outerRadius: 18,
    },
    // Add more rings here as needed
    // Example:
    // {
    //   segments: [
    //     { buildingType: 'altar', maxCount: 1, color: '#8b5cf6', label: 'Altar' },
    //     { buildingType: 'shrine', maxCount: 1, color: '#ec4899', label: 'Shrine' },
    //   ],
    //   innerRadius: 20,
    //   outerRadius: 24,
    // },
  ];

  // Helper function to calculate segment angles
  const calculateSegment = (
    currentCount: number,
    maxCount: number,
    previousEndAngle: number,
    segmentDegrees: number
  ) => {
    const startAngle = previousEndAngle - paddingAngle;
    const endAngle = startAngle - segmentDegrees;
    const segmentLength = endAngle - startAngle;
    const progress = maxCount > 0 ? currentCount / maxCount : 0;
    const progressAngle = startAngle + segmentLength * progress;

    return { startAngle, endAngle, progressAngle };
  };

  // Process each ring
  const processedRings = ringConfigs.map((ringConfig) => {
    const { segments, innerRadius, outerRadius } = ringConfig;
    
    // Calculate total max count for this ring
    const totalMaxCount = segments.reduce((sum, seg) => sum + seg.maxCount, 0);

    // Create background segments
    const backgroundSegments = segments.map(seg => ({
      name: seg.label,
      value: seg.maxCount,
      fill: backgroundColor,
    }));

    // Create progress segments with calculated angles
    let currentEndAngle = startAngle;
    const progressSegments = segments.map((seg) => {
      const currentCount = buildings[seg.buildingType] || 0;
      const segmentDegrees = (totalDegrees * seg.maxCount) / totalMaxCount;
      const segmentAngles = calculateSegment(
        currentCount,
        seg.maxCount,
        currentEndAngle,
        segmentDegrees
      );
      currentEndAngle = segmentAngles.endAngle;

      return {
        name: seg.label,
        fill: seg.color,
        startAngle: segmentAngles.startAngle,
        endAngle: segmentAngles.progressAngle,
      };
    });

    return {
      backgroundSegments,
      progressSegments,
      innerRadius,
      outerRadius,
    };
  });

  return (
    <div className="w-full h-48 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {processedRings.map((ring, ringIndex) => (
            <>
              {/* Background ring */}
              <Pie
                key={`background-${ringIndex}`}
                data={ring.backgroundSegments}
                cx="50%"
                cy="50%"
                innerRadius={ring.innerRadius}
                outerRadius={ring.outerRadius}
                paddingAngle={paddingAngle}
                dataKey="value"
                startAngle={startAngle}
                endAngle={-270}
                cornerRadius={5}
                strokeWidth={0.5}
                isAnimationActive={false}
              >
                {ring.backgroundSegments.map((entry, entryIndex) => (
                  <Cell key={`bg-cell-${ringIndex}-${entryIndex}`} fill={entry.fill} />
                ))}
              </Pie>
              
              {/* Progress segments */}
              {ring.progressSegments.map((segment, segIndex) => (
                <Pie
                  key={`progress-${ringIndex}-${segIndex}`}
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={ring.innerRadius}
                  outerRadius={ring.outerRadius}
                  dataKey="value"
                  startAngle={segment.startAngle}
                  endAngle={segment.endAngle}
                  cornerRadius={5}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  <Cell fill={segment.fill} />
                </Pie>
              ))}
            </>
          ))}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
