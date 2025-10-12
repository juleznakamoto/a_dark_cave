
import { useMemo } from "react";
import { useGameStore } from "@/game/state";

interface DonutLayer {
  id: string;
  segments: {
    label: string;
    current: number;
    max: number;
    color: string;
  }[];
  radius: number;
  strokeWidth: number;
}

export default function BuildingProgressChart() {
  const { buildings } = useGameStore();

  const layers: DonutLayer[] = useMemo(() => [
    {
      id: "housing",
      radius: 35,
      strokeWidth: 8,
      segments: [
        {
          label: "Wooden Huts",
          current: buildings.woodenHut || 0,
          max: 10,
          color: "#3b82f6", // blue
        },
        {
          label: "Stone Huts",
          current: buildings.stoneHut || 0,
          max: 10,
          color: "#8b5cf6", // purple
        },
        {
          label: "Longhouses",
          current: buildings.longhouse || 0,
          max: 2,
          color: "#ec4899", // pink
        },
      ],
    },
    // Placeholder layers for future use
    {
      id: "placeholder1",
      radius: 46,
      strokeWidth: 8,
      segments: [],
    },
    {
      id: "placeholder2",
      radius: 57,
      strokeWidth: 8,
      segments: [],
    },
    {
      id: "placeholder3",
      radius: 68,
      strokeWidth: 8,
      segments: [],
    },
    {
      id: "placeholder4",
      radius: 79,
      strokeWidth: 8,
      segments: [],
    },
  ], [buildings.woodenHut, buildings.stoneHut, buildings.longhouse]);

  const size = 200;
  const center = size / 2;

  const calculateSegmentPath = (
    startAngle: number,
    endAngle: number,
    radius: number,
    strokeWidth: number
  ) => {
    const innerRadius = radius - strokeWidth / 2;
    const outerRadius = radius + strokeWidth / 2;

    const startX = center + innerRadius * Math.cos(startAngle);
    const startY = center + innerRadius * Math.sin(startAngle);
    const endX = center + innerRadius * Math.cos(endAngle);
    const endY = center + innerRadius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    return `
      M ${center} ${center}
      L ${startX} ${startY}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}
      Z
    `;
  };

  const renderLayer = (layer: DonutLayer) => {
    if (layer.segments.length === 0) {
      // Render placeholder as grey ring
      return (
        <circle
          key={layer.id}
          cx={center}
          cy={center}
          r={layer.radius}
          fill="none"
          stroke="#333333"
          strokeWidth={layer.strokeWidth}
          opacity={0.3}
        />
      );
    }

    const totalMax = layer.segments.reduce((sum, seg) => sum + seg.max, 0);
    let currentAngle = -Math.PI / 2; // Start at top

    return layer.segments.map((segment, index) => {
      const segmentPercentage = segment.max / totalMax;
      const segmentAngle = segmentPercentage * 2 * Math.PI;
      const filledPercentage = segment.current / segment.max;

      // Grey background for the entire segment
      const greyPath = (
        <path
          key={`${layer.id}-${index}-grey`}
          d={calculateSegmentPath(
            currentAngle,
            currentAngle + segmentAngle,
            layer.radius,
            layer.strokeWidth
          )}
          fill="#333333"
          opacity={0.3}
        />
      );

      // Colored fill for the completed portion
      const filledAngle = segmentAngle * filledPercentage;
      const coloredPath = filledPercentage > 0 ? (
        <path
          key={`${layer.id}-${index}-colored`}
          d={calculateSegmentPath(
            currentAngle,
            currentAngle + filledAngle,
            layer.radius,
            layer.strokeWidth
          )}
          fill={segment.color}
        />
      ) : null;

      currentAngle += segmentAngle;

      return (
        <g key={`${layer.id}-${index}`}>
          {greyPath}
          {coloredPath}
        </g>
      );
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        {layers.map(renderLayer)}
      </svg>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs justify-center">
        {layers[0].segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">
              {segment.label}: {segment.current}/{segment.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
