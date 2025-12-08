import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";
import { useState, useRef } from "react";

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
  const claimedAchievements = useGameStore((state) => state.claimedAchievements || []);
  const [hoveredSegment, setHoveredSegment] = useState<{
    id: string;
    name: string;
    currentCount: number;
    maxCount: number;
    x: number;
    y: number;
  } | null>(null);
  const [clickedSegment, setClickedSegment] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ring sizing parameters
  const startRadius = 20; // Inner radius of the first ring
  const ringSize = 5; // Thickness of each ring
  const spaceBetweenRings = 7; // Gap between rings

  // Function to calculate padding angle based on ring index
  const getPaddingAngle = (ringIndex: number) => {
    // Inner rings have larger padding, outer rings have smaller
    return Math.max(2, 14 - ringIndex * 2);
  };

  const backgroundColor = tailwindToHex("neutral-800");
  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  // Define ring segment configurations (without radius values)
  const ringSegments: BuildingSegment[][] = [
    // First ring: Huts
    [
      {
        buildingType: "woodenHut",
        maxCount: 10,
        color: tailwindToHex("gray-400/80"),
        label: "Basic Shelter",
      },
      {
        buildingType: "stoneHut",
        maxCount: 10,
        color: tailwindToHex("gray-400/80"),
        label: "Advanced Shelter",
      },
      {
        buildingType: "longhouse",
        maxCount: 5,
        color: tailwindToHex("gray-400/80"),
        label: "Nordic Housing",
      },
    ],
    // Second ring: Basic crafting and trade buildings
    [
      {
        buildingType: "cabin",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Hunter",
        relatedBuildings: ["greatCabin"],
      },
      {
        buildingType: "tannery",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Tanner",
        relatedBuildings: ["masterTannery"],
      },
      {
        buildingType: "tradePost",
        maxCount: 3,
        color: tailwindToHex("gray-400/80"),
        label: "Trade",
        relatedBuildings: ["grandBazaar", "merchantsGuild"],
      },
      {
        buildingType: "clerksHut",
        maxCount: 3,
        color: tailwindToHex("gray-400/80"),
        label: "Knowledge",
        relatedBuildings: ["scriptorium", "inkwardenAcademy"],
      },
    ],
    // Third ring: Resource buildings and pits
    [
      {
        buildingType: "blacksmith",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Blacksmith",
        relatedBuildings: ["grandBlacksmith"],
      },
      {
        buildingType: "foundry",
        maxCount: 3,
        color: tailwindToHex("gray-400/80"),
        label: "Foundry",
        relatedBuildings: ["primeFoundry", "masterworkFoundry"],
      },
      {
        buildingType: "shallowPit",
        maxCount: 4,
        color: tailwindToHex("gray-400/80"),
        label: "Pit",
        relatedBuildings: ["deepeningPit", "deepPit", "bottomlessPit"],
      },
    ],
    // Fourth ring: Advanced buildings
    [
      {
        buildingType: "altar",
        maxCount: 4,
        color: tailwindToHex("gray-400/80"),
        label: "Religion",
        relatedBuildings: ["shrine", "temple", "sanctum"],
      },
      {
        buildingType: "blackMonolith",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Sacrifice",
        relatedBuildings: ["pillarOfClarity", "boneTemple"],
      },
    ],
    // Fifth ring: Fortifications
    [
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
    .map((ringConfig, ringIndex) => {
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

      // Get padding angle for this specific ring
      const paddingAngle = getPaddingAngle(ringIndex);
      const startAngle = getStartAngle(paddingAngle);

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
      const foregroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: seg.maxCount,
        fill: "transparent",
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
          currentCount,
          maxCount: seg.maxCount,
          segmentId: `${ringIndex}-${index}`,
        };
      });

      // Check if all segments in this ring are full
      const isRingComplete = progressSegments.every((seg) => seg.isFull);

      return {
        backgroundSegments,
        progressSegments,
        foregroundSegments,
        innerRadius,
        outerRadius,
        paddingAngle,
        startAngle,
        isRingComplete,
      };
    })
    .filter((ring) => ring !== null);

  return (
    <div 
      ref={containerRef}
      className="w-48 h-48 flex flex-col items-center justify-center relative"
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="text-xl text-neutral-400">▨</span>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {processedRings.map((ring, ringIndex) => [
            // Background ring
            <Pie
              key={`background-${ringIndex}`}
              data={ring.backgroundSegments}
              cx="50%"
              cy="50%"
              innerRadius={ring.innerRadius}
              outerRadius={ring.outerRadius}
              paddingAngle={ring.paddingAngle}
              dataKey="value"
              startAngle={ring.startAngle}
              endAngle={-360 + ring.startAngle}
              cornerRadius={5}
              strokeWidth={0}
              isAnimationActive={false}
              style={{ outline: "none" }}
            >
              {ring.backgroundSegments.map((entry, entryIndex) => (
                <Cell
                  key={`bg-cell-${ringIndex}-${entryIndex}`}
                  fill={entry.fill}
                />
              ))}
            </Pie>,

            // Progress segments
            ...ring.progressSegments.map((segment, segIndex) => {
              const segmentColor =
                segment.isFull
                  ? tailwindToHex("blue-400")
                  : segment.fill;

              const achievementId = `building-${segment.segmentId}`;
              const isClaimed = claimedAchievements.includes(achievementId);
              const isInteractive = segment.isFull && !isClaimed;
              const showTooltip = true; // Show tooltip for all segments
              
              const handleSegmentClick = () => {
                if (isInteractive) {
                  // Calculate silver reward: 50 * maxCount
                  const silverReward = 50 * segment.maxCount;
                  
                  // Award silver
                  useGameStore.getState().updateResource("silver", silverReward);
                  
                  // Add log entry and mark as claimed in one state update
                  useGameStore.setState((state) => ({
                    log: [
                      ...state.log,
                      {
                        id: `achievement-${achievementId}-${Date.now()}`,
                        message: `Achievement unlocked: ${segment.name} complete! +${silverReward} silver`,
                        timestamp: Date.now(),
                        type: "event" as const,
                      },
                    ].slice(-100),
                    claimedAchievements: [...(state.claimedAchievements || []), achievementId],
                  }));
                  
                  // Clear hover state
                  setHoveredSegment(null);
                  setClickedSegment(null);
                }
              };

              return (
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
                  strokeWidth={segment.isFull ? (isClaimed ? 1 : 1.5) : 0}
                  stroke={
                    segment.isFull ? tailwindToHex("blue-900") : undefined
                  }
                  isAnimationActive={false}
                  style={{ 
                    outline: "none", 
                    pointerEvents: showTooltip ? "auto" : "none",
                    cursor: isInteractive ? "pointer" : "default",
                    opacity: isClaimed ? 0.5 : 1
                  }}
                  onMouseEnter={(e: any) => {
                    if (showTooltip) {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setHoveredSegment({
                          id: segment.segmentId,
                          name: segment.name,
                          currentCount: segment.currentCount,
                          maxCount: segment.maxCount,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }
                  }}
                  onMouseMove={(e: any) => {
                    if (showTooltip && hoveredSegment?.id === segment.segmentId) {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setHoveredSegment({
                          id: segment.segmentId,
                          name: segment.name,
                          currentCount: segment.currentCount,
                          maxCount: segment.maxCount,
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (showTooltip && clickedSegment !== segment.segmentId) {
                      setHoveredSegment(null);
                    }
                  }}
                  onClick={handleSegmentClick}
                >
                  <Cell fill={segmentColor} />
                </Pie>
              );
            }),

            // Foreground ring
            <Pie
              key={`foreground-${ringIndex}`}
              data={ring.foregroundSegments}
              cx="50%"
              cy="50%"
              innerRadius={ring.innerRadius}
              outerRadius={ring.outerRadius}
              paddingAngle={ring.paddingAngle}
              dataKey="value"
              startAngle={ring.startAngle}
              endAngle={-360 + ring.startAngle}
              cornerRadius={5}
              strokeWidth={0.25}
              stroke={tailwindToHex("neutral-400")}
              isAnimationActive={false}
              style={{ outline: "none", pointerEvents: "none" }}
            ></Pie>,
          ])}
        </PieChart>
      </ResponsiveContainer>

      {/* Tooltip display for hovered segment */}
      {hoveredSegment && (
        <div 
          className="absolute bg-popover border rounded-md px-2 py-1 text-xs shadow-md z-50 pointer-events-none whitespace-nowrap"
          style={{
            left: `${hoveredSegment.x}px`,
            top: `${hoveredSegment.y}px`,
            transform: 'translate(-50%, calc(-100% - 10px))'
          }}
        >
          <div className="font-semibold">{hoveredSegment.name}</div>
          <div className="text-muted-foreground">
            {hoveredSegment.currentCount}/{hoveredSegment.maxCount}
          </div>
        </div>
      )}
    </div>
  );
}
