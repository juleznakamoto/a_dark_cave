import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { useRef } from "react";
import { tailwindToHex } from "@/lib/tailwindColors";

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

  const containerRef = useRef<HTMLDivElement>(null);

  // Ring sizing parameters: thinner segments, more space for labels
  const startRadius = 32;
  const ringSize = 6;
  const spaceBetweenRings = 12;
  const labelOffset = 22;

  // Per-ring radius increment so labels on adjacent rings don't overlap when text overflows
  const labelRadiusIncrement = 8;

  // Max label radius for outermost ring (building config has 5 rings)
  const maxLabelRadius =
    startRadius +
    (config.rings.length - 1) * (ringSize + spaceBetweenRings) +
    ringSize +
    labelOffset +
    (config.rings.length - 1) * labelRadiusIncrement;

  // ViewBox must extend beyond center to fit curved labels (text extends above/below baseline)
  const viewBoxPad = maxLabelRadius + 18;
  const viewBoxMinX = 104 - viewBoxPad;
  const viewBoxMinY = 120 - viewBoxPad;
  const viewBoxSize = viewBoxPad * 2;

  const getPaddingAngle = (ringIndex: number) => Math.max(6, 30 - ringIndex * 2);
  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  // SVG arc path for textPath: 0° = right, 90° = top, angles CCW
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number
  ) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy - r * Math.sin((angleDeg * Math.PI) / 180),
  });

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startDeg: number,
    endDeg: number,
    reverse: boolean
  ) => {
    const start = polarToCartesian(cx, cy, r, reverse ? endDeg : startDeg);
    const end = polarToCartesian(cx, cy, r, reverse ? startDeg : endDeg);
    const span = Math.abs(endDeg - startDeg);
    const largeArc = span > 180 ? 1 : 0;
    // sweep-flag: 0 = CW, 1 = CCW. Our segments go CCW (startAngle > endAngle)
    const sweep = reverse ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
  };

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
        const geometricEnd =
          segmentAngles.endAngle - (index > 0 ? paddingAngle * index : 0);
        const midAngle = (adjustedStartAngle + geometricEnd) / 2;

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
          midAngle,
          geometricStart: adjustedStartAngle,
          geometricEnd,
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
      className="w-64 h-72 flex flex-col items-center justify-center relative min-w-0"
      style={{ touchAction: "manipulation" }}
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
                    pointerEvents: "auto",
                    cursor: isInteractive ? "pointer" : "default",
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

      {/* Curved arc labels for each segment */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <svg
          className="w-full h-full"
          viewBox={`${viewBoxMinX} ${viewBoxMinY} ${viewBoxSize} ${viewBoxSize}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {processedRings.map((ring, ringIndex) =>
              ring.progressSegments.map((segment, segIndex) => {
                const labelRadius =
                  ring.outerRadius +
                  labelOffset +
                  ringIndex * labelRadiusIncrement;
                const cx = 104;
                const cy = 120;
                const reverse =
                  segment.midAngle > 90 && segment.midAngle < 270;
                // Use 92% of segment arc to give long labels room while leaving padding
                const segmentSpan =
                  segment.geometricStart - segment.geometricEnd;
                const subSpan = segmentSpan * 0.92;
                const subStart = segment.midAngle + subSpan / 2;
                const subEnd = segment.midAngle - subSpan / 2;
                const d = describeArc(
                  cx,
                  cy,
                  labelRadius,
                  subStart,
                  subEnd,
                  reverse
                );
                return (
                  <path
                    key={`path-${ringIndex}-${segIndex}`}
                    id={`arc-label-${config.idPrefix}-${ringIndex}-${segIndex}`}
                    d={d}
                    fill="none"
                  />
                );
              })
            )}
          </defs>
          {processedRings.map((ring, ringIndex) =>
            ring.progressSegments.map((segment, segIndex) => (
              <text
                key={`label-${ringIndex}-${segIndex}`}
                className="fill-neutral-300 font-medium"
                style={{ fontSize: 13 }}
              >
                <textPath
                  href={`#arc-label-${config.idPrefix}-${ringIndex}-${segIndex}`}
                  startOffset="50%"
                  textAnchor="middle"
                >
                  {segment.name}
                </textPath>
              </text>
            ))
          )}
        </svg>
      </div>
    </div>
  );
}