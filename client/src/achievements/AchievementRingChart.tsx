import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { useState, useRef, useCallback, useEffect } from "react";
import { tailwindToHex } from "@/lib/tailwindColors";
import { useIsMobile } from "@/hooks/use-mobile";

const SEGMENT_COLOR = tailwindToHex("gray-400/70");
const BACKGROUND_COLOR = tailwindToHex("neutral-800");
const BORDER_COLOR = tailwindToHex("neutral-400");

export interface AchievementSegment {
  segmentId: string;           // unique within chart, e.g. "0-2", "1-axes"
  maxCount: number;
  label: string;
  reward?: number;
  getCount: (state: GameState) => number;
}

export interface AchievementChartConfig {
  idPrefix: string;            // "building" | "item" | "action"
  completedColor: string;
  completedStrokeColor: string;
  centerSymbol: string;
  rings: AchievementSegment[][];
}

interface RingConfig {
  segments: AchievementSegment[];
  innerRadius: number;
  outerRadius: number;
}

interface Props {
  config: AchievementChartConfig;
}

export default function AchievementRingChart({ config }: Props) {
  const state = useGameStore.getState();
  const claimedAchievements = useGameStore(
    (state) => state.claimedAchievements || [],
  );
  const BTP = useGameStore((state) => state.BTP || 0);

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
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipOpenedByHoldRef = useRef(false);
  const isMobile = useIsMobile();

  // Ring sizing parameters
  const startRadius = 20;
  const ringSize = 5;
  const spaceBetweenRings = 7;

  const getPaddingAngle = (ringIndex: number) => Math.max(2, 14 - ringIndex * 2);
  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  // Calculate ring configurations with radius values
  const ringConfigs: RingConfig[] = config.rings.map((segments, index) => {
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
    const adjustedCount = currentCount === 1 ? 1.3 : currentCount;
    const progress = maxCount > 0 ? adjustedCount / maxCount : 0;
    const progressAngle = startAngle + segmentLength * progress;

    return { startAngle, endAngle, progressAngle };
  };

  // Process each ring
  const processedRings = ringConfigs
    .map((ringConfig, ringIndex) => {
      const { segments, innerRadius, outerRadius } = ringConfig;

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
        const currentCount = seg.getCount(state);
        const segmentDegrees = (totalDegrees * seg.maxCount) / totalMaxCount;

        const segmentAngles = calculateSegment(
          currentCount,
          seg.maxCount,
          currentEndAngle,
          segmentDegrees,
        );
        currentEndAngle = segmentAngles.endAngle;

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
          fill: SEGMENT_COLOR,
          startAngle: adjustedStartAngle,
          endAngle: adjustedProgressAngle,
          isFull: isFull,
          currentCount: currentCount,
          maxCount: seg.maxCount,
          segmentId: seg.segmentId,
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

  // Find which segment contains a point (for touch hold-to-show)
  const findSegmentAtPosition = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const x = clientX - rect.left - cx;
      const y = clientY - rect.top - cy;
      const radius = Math.sqrt(x * x + y * y);
      // Recharts: 0° = right, 90° = top (CCW). Screen y is down, so angle = atan2(-y, x)
      const angleDeg =
        (Math.atan2(-y, x) * 180) / Math.PI;
      const normalizedAngle = angleDeg < 0 ? angleDeg + 360 : angleDeg;

      for (const ring of processedRings) {
        for (const segment of ring.progressSegments) {
          const { startAngle, endAngle } = segment;
          const inRadius =
            radius >= ring.innerRadius - 2 && radius <= ring.outerRadius + 2;
          const inAngle =
            startAngle >= endAngle
              ? normalizedAngle >= endAngle && normalizedAngle <= startAngle
              : normalizedAngle >= endAngle || normalizedAngle <= startAngle;
          if (inRadius && inAngle) {
            return {
              id: segment.segmentId,
              name: segment.name,
              currentCount: segment.currentCount,
              maxCount: segment.maxCount,
              x: clientX - rect.left,
              y: clientY - rect.top,
            };
          }
        }
      }
      return null;
    },
    [processedRings]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      const touch = e.touches[0];
      if (!touch) return;
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        const seg = findSegmentAtPosition(touch.clientX, touch.clientY);
        if (seg) {
          tooltipOpenedByHoldRef.current = true;
          setHoveredSegment({
            id: seg.id,
            name: seg.name,
            currentCount: seg.currentCount,
            maxCount: seg.maxCount,
          });
          setMousePosition({ x: seg.x, y: seg.y });
        }
      }, 250);
    },
    [isMobile, findSegmentAtPosition]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (tooltipOpenedByHoldRef.current) {
        e.preventDefault();
        tooltipOpenedByHoldRef.current = false;
      }
    },
    [isMobile]
  );

  const handleTouchCancel = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  // Close tooltip when user taps elsewhere (matches centralized tooltip behavior)
  useEffect(() => {
    if (!hoveredSegment || !isMobile) return;
    const handleOutside = (e: TouchEvent | MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setHoveredSegment(null);
        setMousePosition(null);
      }
    };
    document.addEventListener("touchstart", handleOutside, true);
    document.addEventListener("click", handleOutside, true);
    return () => {
      document.removeEventListener("touchstart", handleOutside, true);
      document.removeEventListener("click", handleOutside, true);
    };
  }, [hoveredSegment, isMobile]);

  return (
    <div
      ref={containerRef}
      className="w-40 h-48 flex flex-col items-center justify-center relative"
      style={{ touchAction: "manipulation" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
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
        <span className="text-xl text-neutral-400">{config.centerSymbol}</span>
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
                ? config.completedColor
                : segment.fill;

              const achievementId = `${config.idPrefix}-${segment.segmentId}`;
              const isClaimed = claimedAchievements.includes(achievementId);
              const isInteractive = segment.isFull && !isClaimed;
              const showTooltip = true;

              const handleSegmentClick = () => {
                if (isInteractive) {
                  const silverReward =
                    (segment.reward || 0 + BTP * 250) ?? 50 * segment.maxCount;

                  useGameStore
                    .getState()
                    .updateResource("silver", silverReward);

                  useGameStore.setState((state) => ({
                    log: [
                      ...state.log,
                      {
                        id: `achievement-${achievementId}-${Date.now()}`,
                        message: `${segment.name} Achievement complete: +${silverReward} Silver`,
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
                  stroke={segment.isFull ? config.completedStrokeColor : undefined}
                  isAnimationActive={false}
                  style={{
                    outline: "none",
                    pointerEvents: "none",
                    opacity: isClaimed ? 0.3 : 1,
                  }}
                >
                  <Cell fill={segmentColor} />
                </Pie>,
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