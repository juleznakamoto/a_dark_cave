import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";

interface BuildingSegment {
  buildingType: keyof GameState["buildings"];
  maxCount: number;
  color: string;
  label: string;
  // Optional: combine with related buildings (e.g., blacksmith + grand blacksmith)
  relatedBuildings?: (keyof GameState["buildings"])[];
}

interface RingConfig {
  segments: BuildingSegment[];
  innerRadius: number;
  outerRadius: number;
}

export default function BuildingProgressChart() {
  const buildings = useGameStore((state) => state.buildings);

  const paddingAngle = 5;
  const backgroundColor = "#43443c";
  const startAngle = 90;

  // Define ring configurations
  const ringConfigs: RingConfig[] = [
    // First ring: Huts
    {
      segments: [
        {
          buildingType: "woodenHut",
          maxCount: 10,
          color: "#48240a",
          label: "Wooden Huts",
        },
        {
          buildingType: "stoneHut",
          maxCount: 10,
          color: "#cccdc6",
          label: "Stone Huts",
        },
        {
          buildingType: "longhouse",
          maxCount: 2,
          color: "#f59e0b",
          label: "Longhouses",
        },
      ],
      innerRadius: 14,
      outerRadius: 18,
    },
    // Second ring: Basic crafting and trade buildings
    {
      segments: [
        {
          buildingType: "cabin",
          maxCount: 2,
          color: "#92400e",
          label: "Cabin",
          relatedBuildings: ["greatCabin"],
        },
        {
          buildingType: "blacksmith",
          maxCount: 2,
          color: "#dc2626",
          label: "Blacksmith",
          relatedBuildings: ["grandBlacksmith"],
        },
        {
          buildingType: "foundry",
          maxCount: 1,
          color: "#ef4444",
          label: "Foundry",
        },
        {
          buildingType: "tannery",
          maxCount: 1,
          color: "#78350f",
          label: "Tannery",
        },
        {
          buildingType: "tradePost",
          maxCount: 2,
          color: "#eab308",
          label: "Trade",
          relatedBuildings: ["merchantsGuild"],
        },
        {
          buildingType: "clerksHut",
          maxCount: 2,
          color: "#06b6d4",
          label: "Knowledge",
          relatedBuildings: ["scriptorium"],
        },
      ],
      innerRadius: 20,
      outerRadius: 24,
    },
    // Third ring: Resource buildings and pits
    {
      segments: [
        {
          buildingType: "timberMill",
          maxCount: 1,
          color: "#65a30d",
          label: "Timber Mill",
        },
        {
          buildingType: "quarry",
          maxCount: 1,
          color: "#94a3b8",
          label: "Quarry",
        },
        {
          buildingType: "shallowPit",
          maxCount: 4,
          color: "#1e293b",
          label: "Pits",
          relatedBuildings: ["deepeningPit", "deepPit", "bottomlessPit"],
        },
      ],
      innerRadius: 26,
      outerRadius: 30,
    },
    // Fourth ring: Advanced buildings
    {
      segments: [
        {
          buildingType: "altar",
          maxCount: 4,
          color: "#8b5cf6",
          label: "Religious",
          relatedBuildings: ["shrine", "temple", "sanctum"],
        },
        {
          buildingType: "alchemist",
          maxCount: 1,
          color: "#a855f7",
          label: "Alchemist",
        },
        {
          buildingType: "wizardTower",
          maxCount: 1,
          color: "#6366f1",
          label: "Wizard Tower",
        },
      ],
      innerRadius: 32,
      outerRadius: 36,
    },
    // Fifth ring: Fortifications
    {
      segments: [
        {
          buildingType: "bastion",
          maxCount: 1,
          color: "#475569",
          label: "Bastion",
        },
        {
          buildingType: "watchtower",
          maxCount: 3,
          color: "#64748b",
          label: "Watchtower",
        },
        {
          buildingType: "palisades",
          maxCount: 4,
          color: "#334155",
          label: "Palisades",
        },
      ],
      innerRadius: 38,
      outerRadius: 42,
    },
  ];

  // Helper function to calculate segment angles
  const calculateSegment = (
    currentCount: number,
    maxCount: number,
    previousEndAngle: number,
    segmentDegrees: number,
  ) => {
    const startAngle = previousEndAngle;
    const endAngle = startAngle - segmentDegrees;
    const segmentLength = endAngle - startAngle;
    const progress = maxCount > 0 ? currentCount / maxCount : 0;
    const progressAngle = startAngle + segmentLength * progress;

    return { startAngle, endAngle, progressAngle };
  };

  // Process each ring and filter out rings with no buildings built
  const processedRings = ringConfigs
    .map((ringConfig) => {
      const { segments, innerRadius, outerRadius } = ringConfig;

      // Check if this ring has any buildings built
      const hasAnyBuilding = segments.some((seg) => {
        let currentCount = buildings[seg.buildingType] || 0;
        if (seg.relatedBuildings) {
          currentCount += seg.relatedBuildings.reduce(
            (sum, relatedType) => sum + (buildings[relatedType] || 0),
            0
          );
        }
        return currentCount > 0;
      });

      // Skip this ring if no buildings are built
      if (!hasAnyBuilding) {
        return null;
      }

      // Calculate total degrees for this ring based on segment count
      const totalDegrees = 360 - segments.length * paddingAngle;

      // Calculate total max count for this ring
      const totalMaxCount = segments.reduce((sum, seg) => sum + seg.maxCount, 0);

      // Create background segments
      const backgroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: seg.maxCount,
        fill: backgroundColor,
      }));

      // Create progress segments with calculated angles
      let currentEndAngle = startAngle;
      const progressSegments = segments.map((seg, index) => {
        // Combine counts from main building and related buildings
        let currentCount = buildings[seg.buildingType] || 0;
        if (seg.relatedBuildings) {
          currentCount += seg.relatedBuildings.reduce(
            (sum, relatedType) => sum + (buildings[relatedType] || 0),
            0
          );
        }

        const segmentDegrees = (totalDegrees * seg.maxCount) / totalMaxCount;
        const segmentAngles = calculateSegment(
          currentCount,
          seg.maxCount,
          currentEndAngle,
          segmentDegrees,
        );
        currentEndAngle = segmentAngles.endAngle;

        // For all segments after the first, subtract paddingAngle from both angles
        const adjustedStartAngle = index === 0 ? segmentAngles.startAngle : segmentAngles.startAngle - paddingAngle;
        const adjustedProgressAngle = index === 0 ? segmentAngles.progressAngle : segmentAngles.progressAngle - paddingAngle;

        return {
          name: seg.label,
          fill: seg.color,
          startAngle: adjustedStartAngle,
          endAngle: adjustedProgressAngle,
        };
      });

      return {
        backgroundSegments,
        progressSegments,
        innerRadius,
        outerRadius,
      };
    })
    .filter((ring) => ring !== null);

  return (
    <div className="w-full h-20 flex flex-col items-center justify-center">
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
                strokeWidth={0}
                isAnimationActive={false}
              >
                {ring.backgroundSegments.map((entry, entryIndex) => (
                  <Cell
                    key={`bg-cell-${ringIndex}-${entryIndex}`}
                    fill={entry.fill}
                  />
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