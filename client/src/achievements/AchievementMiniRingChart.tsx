import type { GameState } from "@shared/schema";
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { tailwindToHex } from "@/lib/tailwindColors";
import type { AchievementChartConfig } from "./achievementTypes";
import {
  INCOMPLETE_COLOR,
  COMPLETE_COLOR,
  BACKGROUND_COLOR_HEX,
  BACKGROUND_SELECTED_COLOR_HEX,
} from "./achievementColors";

interface Props {
  config: AchievementChartConfig;
  isActive?: boolean;
  /** When true, hide progress (show empty rings). Used for locked tabs. */
  hideProgress?: boolean;
}

/** Compact label-free ring chart for tab triggers. */
export default function AchievementMiniRingChart({
  config,
  isActive = false,
  hideProgress = false,
}: Props) {
  const state = useGameStore.getState();
  const claimedAchievements = useGameStore((s) => s.claimedAchievements || []);
  void useGameStore(
    (s) =>
      (s.story?.heavySleeperHours ?? 0) + (s.totalFocusEarned ?? 0),
  );

  const size = 58;
  const centerHoleRadius = 10; // Space for icon in center, rings start outside
  const ringSize = 1.5;
  const spaceBetweenRings = 1.7;

  const ringConfigs = config.rings.map((segments, index) => {
    const innerRadius =
      centerHoleRadius + index * (ringSize + spaceBetweenRings);
    const outerRadius = innerRadius + ringSize;
    return { segments, innerRadius, outerRadius };
  });

  const paddingAngle = 3;
  const startAngle = 90 - paddingAngle / 2;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 overflow-visible p-1 pointer-events-none select-none"
      style={{ width: size, height: size, minWidth: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
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
              const isClaimed = claimedAchievements.includes(achievementId);
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
                cornerRadius={2}
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
                  cornerRadius={2}
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
        className="absolute inset-0 flex items-center justify-center text-foreground text-[10px] font-medium"
        style={{ opacity: isActive ? 1 : 0.5 }}
      >
        {config.centerSymbol}
      </span>
    </div>
  );
}
