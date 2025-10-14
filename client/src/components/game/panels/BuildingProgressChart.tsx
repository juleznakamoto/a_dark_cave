import React from "react";
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";

interface BuildingSegment {
  buildingType: keyof GameState["buildings"];
  maxCount: number;
  color: string;
  label: string;
  relatedBuildings?: (keyof GameState["buildings"])[];
}

interface RingConfig {
  segments: BuildingSegment[];
  innerRadius: number;
  outerRadius: number;
}

export default function BuildingProgressChart() {
  const buildings = useGameStore((state) => state.buildings);
  const [hoveredSegment, setHoveredSegment] = React.useState<string | null>(null);

  // Ring sizing parameters
  const startRadius = 16; // Inner radius of the first ring
  const ringSize = 4; // Thickness of each ring
  const spaceBetweenRings = 5; // Gap between rings

  const paddingAngle = 8;
  const backgroundColor = tailwindToHex("neutral-800");
  const startAngle = 90 - paddingAngle / 2;

  // Define ring segment configurations (without radius values)
  const ringSegments: BuildingSegment[][] = [
    // First ring: Huts
    [
      {
        buildingType: "woodenHut",
        maxCount: 10,
        color: tailwindToHex("gray-400/80"),
        label: "Wooden Huts",
      },
      {
        buildingType: "stoneHut",
        maxCount: 10,
        color: tailwindToHex("gray-400/80"),
        label: "Stone Huts",
      },
      {
        buildingType: "longhouse",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Longhouses",
      },
    ],
    // Second ring: Basic crafting and trade buildings
    [
      {
        buildingType: "cabin",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Cabin",
        relatedBuildings: ["greatCabin"],
      },
      {
        buildingType: "blacksmith",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Blacksmith",
        relatedBuildings: ["grandBlacksmith"],
      },
      {
        buildingType: "foundry",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Foundry",
      },
      {
        buildingType: "tannery",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Tannery",
      },
      {
        buildingType: "tradePost",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Trade",
        relatedBuildings: ["merchantsGuild"],
      },
      {
        buildingType: "clerksHut",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Knowledge",
        relatedBuildings: ["scriptorium"],
      },
    ],
    // Third ring: Resource buildings and pits
    [
      {
        buildingType: "timberMill",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Timber Mill",
      },
      {
        buildingType: "quarry",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Quarry",
      },
      {
        buildingType: "shallowPit",
        maxCount: 4,
        color: tailwindToHex("gray-400/80"),
        label: "Pits",
        relatedBuildings: ["deepeningPit", "deepPit", "bottomlessPit"],
      },
    ],
    // Fourth ring: Advanced buildings
    [
      {
        buildingType: "altar",
        maxCount: 4,
        color: tailwindToHex("gray-400/80"),
        label: "Religious",
        relatedBuildings: ["shrine", "temple", "sanctum"],
      },
      {
        buildingType: "alchemistHall",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Alchemist's Hall",
      },
      {
        buildingType: "wizardTower",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Wizard Tower",
      },
    ],
    // Fifth ring: Fortifications
    [
      {
        buildingType: "bastion",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Bastion",
      },
      {
        buildingType: "palisades",
        maxCount: 4,
        color: tailwindToHex("gray-400/80"),
        label: "Palisades",
      },
      {
        buildingType: "watchtower",
        maxCount: 4,
        color: tailwindToHex("gray-400/80"),
        label: "Watchtower",
      },
    ],
  ];

  // Calculate ring configurations with radius values
  const ringConfigs: RingConfig[] = ringSegments.map((segments, index) => {
    const innerRadius = startRadius + index * (ringSize + spaceBetweenRings);
    const outerRadius = innerRadius + ringSize;
    return {
      segments,
      innerRadius,
      outerRadius,
    };
  });

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
            0,
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
      const totalMaxCount = segments.reduce(
        (sum, seg) => sum + seg.maxCount,
        0,
      );

      // Create background segments
      const backgroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: seg.maxCount,
        fill: backgroundColor,
      }));

      // Create foreground segments (borders only, no fill)
      const foregroundSegments = segments.map((seg, index) => ({
        name: seg.label,
        value: seg.maxCount,
        fill: "transparent",
        // Add key for hover effect
        key: `${ringIndex}-${index}`,
      }));

      // Create progress segments with calculated angles
      let currentEndAngle = startAngle;
      const progressSegments = segments.map((seg, index) => {
        // Combine counts from main building and related buildings
        let currentCount = buildings[seg.buildingType] || 0;
        if (seg.relatedBuildings) {
          currentCount += seg.relatedBuildings.reduce(
            (sum, relatedType) => sum + (buildings[relatedType] || 0),
            0,
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

        // For all segments after the first, subtract cumulative padding angle
        const adjustedStartAngle =
          index === 0
            ? segmentAngles.startAngle
            : segmentAngles.startAngle - paddingAngle * index;
        const adjustedProgressAngle =
          index === 0
            ? segmentAngles.progressAngle
            : segmentAngles.progressAngle - paddingAngle * index;

        const isFull = currentCount >= seg.maxCount;

        return {
          name: seg.label,
          fill: seg.color,
          startAngle: adjustedStartAngle,
          endAngle: adjustedProgressAngle,
          isFull: isFull,
        };
      });

      return {
        backgroundSegments,
        progressSegments,
        foregroundSegments,
        innerRadius,
        outerRadius,
      };
    })
    .filter((ring) => ring !== null);

  return (
    <div className="w-full h-36 flex flex-col items-center justify-center">
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
                endAngle={-360 + startAngle}
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
                  strokeWidth={segment.isFull ? 0.75 : 0}
                  stroke={segment.isFull ? tailwindToHex("blue-500") : undefined}
                  isAnimationActive={false}
                >
                  <Cell fill={segment.fill} />
                </Pie>
              ))}
              {/* Foreground ring */}
              <Pie
                key={`foreground-${ringIndex}`}
                data={ring.foregroundSegments}
                cx="50%"
                cy="50%"
                innerRadius={ring.innerRadius}
                outerRadius={ring.outerRadius}
                paddingAngle={paddingAngle}
                dataKey="value"
                startAngle={startAngle}
                endAngle={-360 + startAngle}
                cornerRadius={5}
                strokeWidth={0.5}
                stroke={tailwindToHex("neutral-100/50")}
                isAnimationActive={false}
                onMouseEnter={() => setHoveredSegment(ring.foregroundSegments[0].key)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                {ring.foregroundSegments.map((entry, entryIndex) => (
                  <Cell
                    key={`fg-cell-${ringIndex}-${entryIndex}`}
                    fill={entry.fill}
                    stroke={
                      hoveredSegment === entry.key
                        ? tailwindToHex("yellow-500")
                        : undefined
                    }
                    strokeWidth={hoveredSegment === entry.key ? 1.5 : 0.5}
                  />
                ))}
              </Pie>
            </>
          ))}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}