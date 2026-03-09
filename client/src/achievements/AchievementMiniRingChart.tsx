import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { tailwindToHex } from "@/lib/tailwindColors";
import type { AchievementChartConfig } from "./AchievementRingChart";

const SEGMENT_COLOR = tailwindToHex("gray-400/50");
const BACKGROUND_COLOR = tailwindToHex("neutral-800");

interface Props {
  config: AchievementChartConfig;
}

/** Compact label-free ring chart for tab triggers. */
export default function AchievementMiniRingChart({ config }: Props) {
  const state = useGameStore.getState();
  const claimedAchievements = useGameStore(
    (s) => s.claimedAchievements || []
  );

  const size = 40;
  const startRadius = 2;
  const ringSize = 1.5;
  const spaceBetweenRings = 1.5;

  const ringConfigs = config.rings.map((segments, index) => {
    const innerRadius = startRadius + index * (ringSize + spaceBetweenRings);
    const outerRadius = innerRadius + ringSize;
    return { segments, innerRadius, outerRadius };
  });

  const paddingAngle = 3;
  const startAngle = 90 - paddingAngle / 2;

  return (
    <div
      className="flex items-center justify-center shrink-0 overflow-visible p-1 pointer-events-none select-none"
      style={{ width: size, height: size, minWidth: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          {ringConfigs.map((ring, ringIndex) => {
            const totalMaxCount = ring.segments.reduce(
              (sum, s) => sum + s.maxCount,
              0
            );
            const totalDegrees = 360 - ring.segments.length * paddingAngle;

            const backgroundSegments = ring.segments.map((s) => ({
              value: s.maxCount,
              fill: BACKGROUND_COLOR,
            }));

            let currentStartAngle = startAngle;
            const progressSegments = ring.segments.map((seg) => {
              const currentCount = seg.getCount(state);
              const segmentDegrees =
                (totalDegrees * seg.maxCount) / totalMaxCount;
              const adjustedCount = currentCount === 1 ? 1.3 : currentCount;
              const progress =
                seg.maxCount > 0 ? Math.min(adjustedCount / seg.maxCount, 1) : 0;
              const startA = currentStartAngle;
              const progressEndAngle = startA - segmentDegrees * progress;
              currentStartAngle = startA - segmentDegrees - paddingAngle;

              const achievementId = `${config.idPrefix}-${seg.segmentId}`;
              const isClaimed = claimedAchievements.includes(achievementId);
              const isFull = currentCount >= seg.maxCount;
              const fill = isFull
                ? config.completedColor
                : SEGMENT_COLOR;

              return {
                startAngle: startA,
                endAngle: progressEndAngle,
                fill: isClaimed ? `${fill}4D` : fill,
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
                  <Cell key={i} fill={BACKGROUND_COLOR} />
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
    </div>
  );
}
