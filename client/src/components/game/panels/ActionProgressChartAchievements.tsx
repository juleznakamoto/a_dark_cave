import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";
import { useState, useRef } from "react";

// Segment colors
const SEGMENT_COLOR = tailwindToHex("gray-400/80");
const COMPLETED_COLOR = tailwindToHex("green-600");
const COMPLETED_STROKE_COLOR = tailwindToHex("green-900");
const BACKGROUND_COLOR = tailwindToHex("neutral-800");
const BORDER_COLOR = tailwindToHex("neutral-400");

interface ActionSegment {
  segmentType: string;
  maxCount: number;
  color: string;
  label: string;
  getCount: (state: GameState) => number;
  reward?: number; // Optional custom silver reward
}

interface RingConfig {
  segments: ActionSegment[];
  innerRadius: number;
  outerRadius: number;
}

export default function ActionProgressChartAchievements() {
  const state = useGameStore.getState();
  const claimedAchievements = useGameStore(
    (state) => state.claimedAchievements || [],
  );

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

  // Ring sizing parameters
  const startRadius = 20;
  const ringSize = 5;
  const spaceBetweenRings = 7;

  const getPaddingAngle = (ringIndex: number) => {
    return Math.max(2, 14 - ringIndex * 2);
  };

  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  // Define ring segment configurations
  const ringSegments: ActionSegment[][] = [
    // First ring: Sacrifices
    [
      {
        segmentType: "exploreCave",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Cave Explore",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.caveExplore?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
      {
        segmentType: "chopWood",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Chop Wood",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.chopWood?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
      {
        segmentType: "hunt",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Hunt",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.hunt?.level || 0;
          return count === 1 ? 1.3 : count;
        },
      },
    ],
    // Second ring: Cave & Gathering Actions
    [
      {
        segmentType: "mineStone",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Mine Stone",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineStone?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentType: "mineIron",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Mine Iron",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineIron?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentType: "mineCoal",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Mine Coal",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineCoal?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentType: "mineSulfur",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Mine Sulfur",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineSulfur?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentType: "mineObsidian",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Mine Obsidian",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineObsidian?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
      {
        segmentType: "mineAdamant",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Mine Adamant",
        getCount: (state: GameState) => {
          const count = state.buttonUpgrades?.mineAdamant?.level || 0;
          return count === 1 ? 1.8 : count;
        },
      },
    ],
    // Third ring: Mining Actions
    [
      {
        segmentType: "boneTotems",
        maxCount: 20,
        color: SEGMENT_COLOR,
        label: "Bone Totem Sacrifices",
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.boneTotemsUsageCount) || 0, 20),
        reward: 500,
      },
      {
        segmentType: "leatherTotems",
        maxCount: 20,
        color: SEGMENT_COLOR,
        label: "Leather Totem Sacrifices",
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.leatherTotemsUsageCount) || 0, 20),
        reward: 500,
      },
      {
        segmentType: "animals",
        maxCount: 10,
        color: SEGMENT_COLOR,
        label: "Animal Sacrifices",
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.animalsSacrificeLevel) || 0, 10),
        reward: 500,
      },
    ],
    // Fourth ring: Bomb Crafting
    [
      {
        segmentType: "emberBombs",
        maxCount: 25,
        color: SEGMENT_COLOR,
        label: "Ember Bombs Crafted",
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.emberBombsCrafted) || 0, 25),
        reward: 500,
      },
      {
        segmentType: "ashfireBombs",
        maxCount: 20,
        color: SEGMENT_COLOR,
        label: "Ashfire Bombs Crafted",
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.ashfireBombsCrafted) || 0, 20),
        reward: 500,
      },
      {
        segmentType: "voidBombs",
        maxCount: 15,
        color: SEGMENT_COLOR,
        label: "Void Bombs Crafted",
        getCount: (state: GameState) =>
          Math.min(
            state.cruelMode
              ? Number(state.story?.seen?.voidBombsCrafted) || 0
              : 0,
            15,
          ),
        reward: 500,
      },
    ],
    // Fifth ring: Merchant Purchases
    [
      {
        segmentType: "merchantPurchases",
        maxCount: 100,
        color: SEGMENT_COLOR,
        label: "Merchant Purchases",
        getCount: (state: GameState) =>
          Math.min(Number(state.story?.seen?.merchantPurchases) || 0, 100),
        reward: 500,
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

  // Process each ring and filter out rings with no progress
  const processedRings = ringConfigs
    .map((ringConfig, ringIndex) => {
      const { segments, innerRadius, outerRadius } = ringConfig;

      // Check if this ring has any progress
      const hasAnyProgress = segments.some((seg) => seg.getCount(state) > 0);

      // Skip this ring if no progress
      if (!hasAnyProgress) {
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

      // Create foreground segments
      const foregroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: seg.maxCount,
        fill: "transparent",
      }));

      let currentEndAngle = startAngle;
      const progressSegments = segments.map((seg, index) => {
        const currentCount = seg.getCount(state);
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
          currentCount: currentCount,
          maxCount: seg.maxCount,
          segmentId: `${ringIndex}-${seg.segmentType}`,
          reward: seg.reward,
        };
      });

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
        <span className="text-xl text-neutral-400">⧗</span>
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

              const achievementId = `action-${segment.segmentId}`;
              const isClaimed = claimedAchievements.includes(achievementId);
              const isInteractive = segment.isFull && !isClaimed;
              const showTooltip = true;

              const handleSegmentClick = () => {
                if (isInteractive) {
                  const silverReward = segment.reward ?? 50 * segment.maxCount;

                  useGameStore
                    .getState()
                    .updateResource("silver", silverReward);

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

                  setHoveredSegment(null);
                  setClickedSegment(null);
                }
              };

              return [
                // Invisible larger hit area for easier interaction
                <Pie
                  key={`hitarea-${ringIndex}-${segIndex}`}
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={ring.innerRadius - 2}
                  outerRadius={ring.outerRadius + 2}
                  dataKey="value"
                  startAngle={segment.startAngle}
                  endAngle={segment.endAngle}
                  fill="transparent"
                  strokeWidth={0}
                  isAnimationActive={false}
                  style={{
                    outline: "none",
                    pointerEvents: showTooltip ? "auto" : "none",
                    cursor: isInteractive ? "pointer" : "default",
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
                  <Cell fill="transparent" />
                </Pie>,
                // Visible segment
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
                  style={{
                    outline: "none",
                    pointerEvents: "none",
                    opacity: isClaimed ? 0.3 : 1,
                  }}
                >
                  <Cell fill={segmentColor} />
                </Pie>
              ];
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
