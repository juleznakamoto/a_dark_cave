
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface RingSegment {
  name: string;
  maxValue: number;
  currentValue: number;
  fill: string;
}

interface Ring {
  segments: RingSegment[];
  innerRadius: number;
  outerRadius: number;
}

export default function BuildingProgressChart() {
  const { buildings } = useGameStore();

  const paddingAngle = 5;
  const backgroundColor = "#cccdc6";

  // Define rings configuration - easily add more rings here
  const rings: Ring[] = [
    {
      innerRadius: 14,
      outerRadius: 18,
      segments: [
        {
          name: "Wooden Huts",
          maxValue: 10,
          currentValue: buildings.woodenHut || 0,
          fill: "#3b82f6",
        },
        {
          name: "Stone Huts",
          maxValue: 10,
          currentValue: buildings.stoneHut || 0,
          fill: "#10b981",
        },
        {
          name: "Longhouses",
          maxValue: 2,
          currentValue: buildings.longhouse || 0,
          fill: "#f59e0b",
        },
      ],
    },
    // Add more rings here easily:
    // {
    //   innerRadius: 20,
    //   outerRadius: 24,
    //   segments: [
    //     { name: "...", maxValue: 10, currentValue: 0, fill: "#..." },
    //   ],
    // },
  ];

  // Calculate segment angles for a ring
  const calculateSegmentAngles = (segments: RingSegment[]) => {
    const totalMax = segments.reduce((sum, seg) => sum + seg.maxValue, 0);
    const totalAngle = 345; // 360 - padding for full circle
    let currentStartAngle = 90;

    return segments.map((segment) => {
      const segmentAngle = (totalAngle * segment.maxValue) / totalMax;
      const segmentLength = segmentAngle;
      const progressRatio = segment.currentValue / segment.maxValue;
      const progressAngle = segmentLength * progressRatio;

      const result = {
        startAngle: currentStartAngle,
        endAngle: currentStartAngle - segmentAngle,
        progressEndAngle: currentStartAngle - progressAngle,
        ...segment,
      };

      currentStartAngle = result.endAngle - paddingAngle;
      return result;
    });
  };

  return (
    <div className="w-full h-48 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {rings.map((ring, ringIndex) => {
            const segmentData = calculateSegmentAngles(ring.segments);
            
            return (
              <g key={`ring-${ringIndex}`}>
                {/* Background segments */}
                <Pie
                  data={segmentData.map((seg) => ({
                    value: seg.maxValue,
                    fill: backgroundColor,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={ring.innerRadius}
                  outerRadius={ring.outerRadius}
                  paddingAngle={paddingAngle}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  cornerRadius={5}
                  strokeWidth={0.5}
                  isAnimationActive={false}
                >
                  {segmentData.map((entry, entryIndex) => (
                    <Cell
                      key={`bg-cell-${ringIndex}-${entryIndex}`}
                      fill={backgroundColor}
                    />
                  ))}
                </Pie>

                {/* Progress segments */}
                {segmentData.map((segment, segmentIndex) => (
                  <Pie
                    key={`progress-${ringIndex}-${segmentIndex}`}
                    data={[{ value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={ring.innerRadius}
                    outerRadius={ring.outerRadius}
                    dataKey="value"
                    startAngle={segment.startAngle}
                    endAngle={segment.progressEndAngle}
                    cornerRadius={5}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    <Cell fill={segment.fill} />
                  </Pie>
                ))}
              </g>
            );
          })}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
