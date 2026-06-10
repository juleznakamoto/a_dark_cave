import type { CSSProperties } from "react";
import type { GameState } from "@shared/schema";
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { tailwindToHex } from "@/lib/tailwindColors";
import type { AchievementChartConfig } from "./achievementTypes";
import {
  INCOMPLETE_COLOR,
  COMPLETE_COLOR,
  BACKGROUND_COLOR_HEX,
  BACKGROUND_SELECTED_COLOR_HEX,
} from "./achievementColors";
import { isCategoryFullyComplete } from "./achievementProgress";

interface Props {
  config: AchievementChartConfig;
  isActive?: boolean;
  /** When true, hide progress (show empty rings). Used for locked tabs. */
  hideProgress?: boolean;
  centerSymbolClassName?: string;
  /** Outer pixel size of the chart. Defaults to the compact tab-trigger size. */
  size?: number;
  /** Extra styles for the center glyph (e.g. scaled `paddingTop` nudge on large charts). */
  centerSymbolStyle?: CSSProperties;
}

const BASE_SIZE = 58;

/** Compact label-free ring chart for tab triggers. */
export default function AchievementMiniRingChart({
  config,
  isActive = false,
  hideProgress = false,
  centerSymbolClassName,
  size = BASE_SIZE,
  centerSymbolStyle,
}: Props) {
  const state = useGameStore.getState();
  void useGameStore(
    (s) =>
      (s.story?.heavySleeperHours ?? 0) + (s.totalFocusEarned ?? 0),
  );

  // Radii are in chart pixel units; scale them with the outer size so larger
  // charts (e.g. share image) keep the same ring proportions as the tab icon.
  const scale = size / BASE_SIZE;
  const centerHoleRadius = 10 * scale; // Space for icon in center, rings start outside
  const ringSize = 1.5 * scale;
  const spaceBetweenRings = 1.7 * scale;
  const cornerRadius = 2 * scale;

  const ringConfigs = config.rings.map((segments, index) => {
    const innerRadius =
      centerHoleRadius + index * (ringSize + spaceBetweenRings);
    const outerRadius = innerRadius + ringSize;
    return { segments, innerRadius, outerRadius };
  });

  const paddingAngle = 3;
  const startAngle = 90 - paddingAngle / 2;

  const categoryComplete =
    !hideProgress &&
    isCategoryFullyComplete(config, state as unknown as GameState);
  const centerIconColor = categoryComplete
    ? (COMPLETE_COLOR[config.idPrefix] ?? undefined)
    : undefined;

  const ringOpacity = isActive ? 1 : 0.9;
  const iconOpacity = isActive ? 1 : 0.5;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 overflow-visible p-1 pointer-events-none select-none"
      style={{ width: size, height: size, minWidth: size }}
    >
      <ResponsiveContainer width="100%" height="100%" style={{ opacity: ringOpacity }}>
        <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          {ringConfigs.map((ring, ringIndex) => {
            const totalMaxCount = ring.segments.reduce(
              (sum, s) => sum + s.maxCount,
              0,
            );
            const totalDegrees = 360 - ring.segments.length * paddingAngle;

            const bgColor = isActive ? BACKGROUND_SELECTED_COLOR_HEX : BACKGROUND_COLOR_HEX;
            const backgroundSegments = ring.segments.map((s) => ({
              value: s.maxCount,
              fill: bgColor,
            }));

            let currentStartAngle = startAngle;
            const progressSegments = ring.segments.map((seg) => {
              const currentCount = hideProgress ? 0 : seg.getCount(state as unknown as GameState);
              const segmentDegrees =
                (totalDegrees * seg.maxCount) / totalMaxCount;
              const adjustedCount = currentCount === 1 ? 1.3 : currentCount;
              const progress =
                seg.maxCount > 0
                  ? Math.min(adjustedCount / seg.maxCount, 1)
                  : 0;
              const startA = currentStartAngle;
              const progressEndAngle = startA - segmentDegrees * progress;
              currentStartAngle = startA - segmentDegrees - paddingAngle;

              const achievementId = `${config.idPrefix}-${seg.segmentId}`;
              const isFull = currentCount >= seg.maxCount;
              const fill = isFull
                ? (COMPLETE_COLOR[config.idPrefix] ??
                  tailwindToHex("gray-400/50"))
                : (INCOMPLETE_COLOR[config.idPrefix] ??
                  tailwindToHex("gray-400/50"));

              return {
                startAngle: startA,
                endAngle: progressEndAngle,
                fill,
                key: achievementId,
              };
            });

            return [
              <Pie
                key={`bg-${ringIndex}`}
                data={backgroundSegments}
                cx="50%"
                cy="50%"
                innerRadius={ring.innerRadius}
                outerRadius={ring.outerRadius}
                paddingAngle={paddingAngle}
                dataKey="value"
                startAngle={startAngle}
                endAngle={-360 + startAngle}
                cornerRadius={cornerRadius}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {backgroundSegments.map((_, i) => (
                  <Cell key={i} fill={bgColor} />
                ))}
              </Pie>,
              ...progressSegments.map((seg, segIndex) => (
                <Pie
                  key={`prog-${ringIndex}-${segIndex}`}
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={ring.innerRadius}
                  outerRadius={ring.outerRadius}
                  dataKey="value"
                  startAngle={seg.startAngle}
                  endAngle={seg.endAngle}
                  cornerRadius={cornerRadius}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  <Cell fill={seg.fill} />
                </Pie>
              )),
            ];
          })}
        </PieChart>
      </ResponsiveContainer>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-noto-symbols-2 font-medium",
          !centerIconColor && "text-foreground",
          centerSymbolClassName,
        )}
        style={{
          opacity: iconOpacity,
          fontSize: 10 * scale,
          ...(centerIconColor ? { color: centerIconColor } : {}),
          ...centerSymbolStyle,
        }}
      >
        {config.centerSymbol}
      </span>
    </div>
  );
}
