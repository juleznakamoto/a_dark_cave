import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";
import { useState, useRef } from "react";

// Segment colors
const SEGMENT_COLOR = tailwindToHex("gray-400/80");
const COMPLETED_COLOR = tailwindToHex("red-600");
const COMPLETED_STROKE_COLOR = tailwindToHex("red-900");
const BACKGROUND_COLOR = tailwindToHex("neutral-800");
const BORDER_COLOR = tailwindToHex("neutral-400");

interface ItemSegment {
  itemType: string;
  itemKeys: (
    | keyof GameState["tools"]
    | keyof GameState["weapons"]
    | keyof GameState["clothing"]
    | keyof GameState["relics"]
  )[];
  color: string;
  label: string;
  category: "tools" | "weapons" | "clothing" | "relics";
  maxCount: number;
  reward?: number; // Optional custom silver reward
}

interface RingConfig {
  segments: ItemSegment[];
  innerRadius: number;
  outerRadius: number;
  isRingComplete?: boolean; // Added to track if the entire ring is complete
}

export default function ItemProgressChart() {
  // Ring sizing parameters
  const startRadius = 20; // Inner radius of the first ring
  const ringSize = 5; // Thickness of each ring
  const spaceBetweenRings = 7; // Gap between rings

  const getPaddingAngle = (ringIndex: number) => {
    return Math.max(2, 14 - ringIndex * 2);
  };

  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  const claimedAchievements = useGameStore(
    (state) => state.claimedAchievements || [],
  );

  // State for tooltip interaction
  const [hoveredSegment, setHoveredSegment] = useState<{
    id: string;
    name: string;
    currentCount: number;
    maxCount: number;
  } | null>(null);
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [clickedSegment, setClickedSegment] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Define ring segment configurations - each segment represents upgradable progression
  const ringSegments: ItemSegment[][] = [
    // First ring: Tools
    [
      {
        itemType: "axes",
        itemKeys: [
          "stone_axe",
          "iron_axe",
          "steel_axe",
          "obsidian_axe",
          "adamant_axe",
        ],
        color: SEGMENT_COLOR,
        label: "Chop",
        category: "tools",
        maxCount: 5,
      },
      {
        itemType: "pickaxes",
        itemKeys: [
          "stone_pickaxe",
          "iron_pickaxe",
          "steel_pickaxe",
          "obsidian_pickaxe",
          "adamant_pickaxe",
        ],
        color: SEGMENT_COLOR,
        label: "Dig",
        category: "tools",
        maxCount: 5,
      },
      {
        itemType: "lanterns",
        itemKeys: [
          "iron_lantern",
          "steel_lantern",
          "obsidian_lantern",
          "adamant_lantern",
        ],
        color: SEGMENT_COLOR,
        label: "Illuminate",
        category: "tools",
        maxCount: 4,
        reward: 250,

      },
    ],

    // Second ring: Weapons
    [
      {
        itemType: "swords",
        itemKeys: [
          "iron_sword",
          "steel_sword",
          "obsidian_sword",
          "adamant_sword",
        ],
        color: SEGMENT_COLOR,
        label: "Swords",
        category: "weapons",
        maxCount: 4,
        reward: 500,
      },
      {
        itemType: "bows",
        itemKeys: [
          "crude_bow",
          "huntsman_bow",
          "long_bow",
          "war_bow",
          "master_bow",
        ],
        color: SEGMENT_COLOR,
        label: "Bows",
        category: "weapons",
        maxCount: 5,
      },
    ],
    // Third ring: Relics
    [
      {
        itemType: "explorer_pack",
        itemKeys: [
          "explorer_pack",
          "hunter_cloak",
          "grenadier_bag",
          "highpriest_robe",
          "loggers_gloves",
          "sacrificial_tunic",
        ],
        color: SEGMENT_COLOR,
        label: "Leather Crafting",
        category: "clothing",
        maxCount: 6,
        reward: 500,
      },
    ],
    // Fourth ring: Clothing
    [],
    // Fifth ring: ???
    [],
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

  // Helper function to get item count for a segment
  const getItemCount = (segment: ItemSegment): number => {
    const state = useGameStore.getState();
    let count = 0;

    for (const itemKey of segment.itemKeys) {
      if (segment.category === "tools") {
        if (state.tools[itemKey as keyof typeof state.tools]) count++;
      } else if (segment.category === "weapons") {
        if (state.weapons[itemKey as keyof typeof state.weapons]) count++;
      } else if (segment.category === "clothing") {
        if (state.clothing[itemKey as keyof typeof state.clothing]) count++;
      } else if (segment.category === "relics") {
        if (state.relics[itemKey as keyof typeof state.relics]) count++;
      }
    }

    return count;
  };

  // Process each ring and filter out rings with no items acquired
  const processedRings = ringConfigs
    .map((ringConfig, ringIndex) => {
      const { segments, innerRadius, outerRadius } = ringConfig;

      // Check if this ring has any items acquired
      const hasAnyItem = segments.some((seg) => getItemCount(seg) > 0);

      // Skip this ring if no items are acquired
      if (!hasAnyItem) {
        return null;
      }

      const paddingAngle = getPaddingAngle(ringIndex);
      const startAngle = getStartAngle(paddingAngle);
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
        fill: BACKGROUND_COLOR,
      }));

      // Create foreground segments (borders only, no fill)
      const foregroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: seg.maxCount,
        fill: "transparent",
      }));

      let currentEndAngle = startAngle;
      const progressSegments = segments.map((seg, index) => {
        const currentCount = getItemCount(seg);
        const segmentDegrees = (totalDegrees * seg.maxCount) / totalMaxCount;

        const segmentStartAngle = currentEndAngle;
        const segmentEndAngle = segmentStartAngle - segmentDegrees;
        currentEndAngle = segmentEndAngle;

        const progress = seg.maxCount > 0 ? currentCount / seg.maxCount : 0;
        const progressDegrees = segmentDegrees * progress;

        const adjustedStartAngle =
          index === 0
            ? segmentStartAngle
            : segmentStartAngle - paddingAngle * index;
        const adjustedProgressAngle =
          index === 0
            ? segmentStartAngle - progressDegrees
            : segmentStartAngle - progressDegrees - paddingAngle * index;

        const isFull = currentCount >= seg.maxCount;

        return {
          name: seg.label,
          fill: seg.color,
          startAngle: adjustedStartAngle,
          endAngle: adjustedProgressAngle,
          isFull: isFull,
          currentCount: currentCount, // Add currentCount for tooltip
          maxCount: seg.maxCount, // Add maxCount for tooltip
          segmentId: `${ringIndex}-${seg.itemType}`, // Unique ID for segment
          reward: seg.reward,
        };
      });

      // Check if the entire ring is complete
      const isRingComplete = segments.every(
        (seg) => getItemCount(seg) >= seg.maxCount,
      );

      return {
        backgroundSegments,
        progressSegments,
        foregroundSegments,
        innerRadius,
        outerRadius,
        paddingAngle,
        startAngle,
        isRingComplete, // Add ring completion status
      };
    })
    .filter((ring) => ring !== null);

  return (
    <div
      ref={containerRef}
      className="w-40 h-48 flex flex-col items-center justify-center relative"
      onMouseMove={(e) => {
        if (hoveredSegment) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setMousePosition({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }
        }
      }}
      onMouseLeave={() => {
        setHoveredSegment(null);
        setMousePosition(null);
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span className="text-xl text-neutral-400">❖</span>
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
              const segmentColor = segment.isFull
                ? COMPLETED_COLOR
                : segment.fill;

              const achievementId = `item-${segment.segmentId}`;
              const isClaimed = claimedAchievements.includes(achievementId);
              const isInteractive = segment.isFull && !isClaimed;
              const showTooltip = true; // Show tooltip for all segments

              const handleSegmentClick = () => {
                if (isInteractive) {
                  // Use custom reward if specified, otherwise default to 50 * maxCount
                  const silverReward = segment.reward ?? (50 * segment.maxCount);

                  // Award silver
                  useGameStore
                    .getState()
                    .updateResource("silver", silverReward);

                  // Add log entry and mark as claimed in one state update
                  useGameStore.setState((state) => ({
                    log: [
                      ...state.log,
                      {
                        id: `achievement-${achievementId}-${Date.now()}`,
                        message: `${segment.name} Achievement complete: +${silverReward} silver`,
                        timestamp: Date.now(),
                        type: "event" as const,
                      },
                    ].slice(-100),
                    claimedAchievements: [
                      ...(state.claimedAchievements || []),
                      achievementId,
                    ],
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
                  stroke={segment.isFull ? COMPLETED_STROKE_COLOR : undefined}
                  isAnimationActive={false}
                  className="border-8 border-transparent"
                  style={{
                    outline: "none",
                    pointerEvents: showTooltip ? "auto" : "none",
                    cursor: isInteractive ? "pointer" : "default",
                    opacity: isClaimed ? 0.4 : 1,
                  }}
                  onMouseEnter={(e: any) => {
                    if (showTooltip) {
                      const rect =
                        containerRef.current?.getBoundingClientRect();
                      if (rect) {
                        setHoveredSegment({
                          id: segment.segmentId,
                          name: segment.name,
                          currentCount: segment.currentCount,
                          maxCount: segment.maxCount,
                        });
                        setMousePosition({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        });
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (showTooltip && clickedSegment !== segment.segmentId) {
                      setHoveredSegment(null);
                      setMousePosition(null);
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
              stroke={BORDER_COLOR}
              isAnimationActive={false}
              style={{ outline: "none", pointerEvents: "none" }}
            ></Pie>,
          ])}
        </PieChart>
      </ResponsiveContainer>

      {/* Tooltip display for hovered segment */}
      {hoveredSegment && mousePosition && (
        <div
          className="absolute bg-popover border rounded-md px-2 py-1 text-xs shadow-md z-50 pointer-events-none whitespace-nowrap"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: "translate(-50%, calc(-100% - 5px))",
          }}
        >
          <div>{hoveredSegment.name}</div>
        </div>
      )}
    </div>
  );
}
