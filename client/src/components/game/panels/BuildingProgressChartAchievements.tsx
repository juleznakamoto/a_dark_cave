import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import { useState, useRef, useEffect } from "react";

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
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const mobileTooltip = useMobileTooltip();

  // Ring sizing parameters
  const startRadius = 20; // Inner radius of the first ring
  const ringSize = 5; // Thickness of each ring
  const spaceBetweenRings = 6; // Gap between rings

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
      {
        buildingType: "furTents",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Fur Tents",
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
        maxCount: 3,
        color: tailwindToHex("gray-400/80"),
        label: "Foundry",
        relatedBuildings: ["primeFoundry", "masterworkFoundry"],
      },
      {
        buildingType: "tannery",
        maxCount: 2,
        color: tailwindToHex("gray-400/80"),
        label: "Tannery",
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
        buildingType: "traps",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Traps",
      },
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
      {
        buildingType: "blackMonolith",
        maxCount: 3,
        color: tailwindToHex("gray-400/80"),
        label: "Black Monolith",
        relatedBuildings: ["pillarOfClarity", "boneTemple"]
      },
      {
        buildingType: "darkEstate",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Dark Estate",
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
      {
        buildingType: "fortifiedMoat",
        maxCount: 1,
        color: tailwindToHex("gray-400/80"),
        label: "Fortified Moat",
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
      const isRingComplete = progressSegments.every(seg => seg.isFull);

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

  const chartRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="w-full h-48 w-48 flex flex-col items-center justify-center relative" ref={chartRef}>
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
              style={{ outline: 'none' }}
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
              const segmentColor = ring.isRingComplete && segment.isFull 
                ? tailwindToHex("blue-400") 
                : segment.fill;
              
              return (
                <Pie
                  key={`progress-${ringIndex}-${segIndex}`}
                  data={[{ value: 1, name: segment.name, count: `${segment.currentCount}/${segment.maxCount}` }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={ring.innerRadius}
                  outerRadius={ring.outerRadius}
                  dataKey="value"
                  startAngle={segment.startAngle}
                  endAngle={segment.endAngle}
                  cornerRadius={5}
                  strokeWidth={segment.isFull ? 1 : 0}
                  stroke={segment.isFull ? tailwindToHex("blue-900") : undefined}
                  isAnimationActive={false}
                  style={{ outline: 'none', cursor: ring.isRingComplete ? 'pointer' : 'default' }}
                  onMouseEnter={ring.isRingComplete ? () => setHoveredSegment(segment.segmentId) : undefined}
                  onMouseLeave={ring.isRingComplete ? () => setHoveredSegment(null) : undefined}
                  onClick={ring.isRingComplete && mobileTooltip.isMobile 
                    ? (e) => mobileTooltip.handleTooltipClick(segment.segmentId, e as any) 
                    : undefined}
                >
                  <Cell fill={segmentColor} title={ring.isRingComplete ? `${segment.name}: ${segment.currentCount}/${segment.maxCount}` : undefined} />
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
              style={{ outline: 'none' }}
            >
            </Pie>
          ])}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Tooltip for mobile - show when segment is clicked */}
      {processedRings.map((ring, ringIndex) => 
        ring.isRingComplete && ring.progressSegments.map((segment, segIndex) => {
          const isOpen = mobileTooltip.isTooltipOpen(segment.segmentId);
          
          if (!isOpen || !mobileTooltip.isMobile) return null;
          
          return (
            <TooltipProvider key={segment.segmentId}>
              <Tooltip open={true}>
                <TooltipTrigger asChild>
                  <div className="absolute top-1/2 left-1/2 w-0 h-0" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">{segment.name}</div>
                    <div>{segment.currentCount}/{segment.maxCount}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })
      )}
    </div>
  );
}