
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";

interface ItemSegment {
  itemType: string;
  itemKeys: (keyof GameState["tools"] | keyof GameState["weapons"] | keyof GameState["clothing"] | keyof GameState["relics"])[];
  color: string;
  label: string;
  category: "tools" | "weapons" | "clothing" | "relics";
  maxCount: number;
}

interface RingConfig {
  segments: ItemSegment[];
  innerRadius: number;
  outerRadius: number;
}

export default function ItemProgressChart() {
  const tools = useGameStore((state) => state.tools);
  const weapons = useGameStore((state) => state.weapons);
  const clothing = useGameStore((state) => state.clothing);
  const relics = useGameStore((state) => state.relics);

  // Ring sizing parameters
  const startRadius = 16;
  const ringSize = 4;
  const spaceBetweenRings = 5;
  
  const getPaddingAngle = (ringIndex: number) => {
    return Math.max(2, 14 - ringIndex * 2);
  };
  
  const backgroundColor = tailwindToHex("neutral-800");
  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  // Define ring segment configurations - each segment represents upgradable progression
  const ringSegments: ItemSegment[][] = [
    // First ring: Axes and Pickaxes progression
    [
      {
        itemType: "axes",
        itemKeys: ["stone_axe", "iron_axe", "steel_axe", "obsidian_axe", "adamant_axe"],
        color: tailwindToHex("gray-400/80"),
        label: "Axes",
        category: "tools",
        maxCount: 5,
      },
      {
        itemType: "pickaxes",
        itemKeys: ["stone_pickaxe", "iron_pickaxe", "steel_pickaxe", "obsidian_pickaxe", "adamant_pickaxe"],
        color: tailwindToHex("gray-400/80"),
        label: "Pickaxes",
        category: "tools",
        maxCount: 5,
      },
    ],
    // Second ring: Lanterns and Swords
    [
      {
        itemType: "lanterns",
        itemKeys: ["iron_lantern", "steel_lantern", "obsidian_lantern", "adamant_lantern"],
        color: tailwindToHex("gray-400/80"),
        label: "Lanterns",
        category: "tools",
        maxCount: 4,
      },
      {
        itemType: "swords",
        itemKeys: ["iron_sword", "steel_sword", "obsidian_sword", "adamant_sword", "frostglass_sword"],
        color: tailwindToHex("gray-400/80"),
        label: "Swords",
        category: "weapons",
        maxCount: 5,
      },
    ],
    // Third ring: Bows progression
    [
      {
        itemType: "bows",
        itemKeys: ["crude_bow", "huntsman_bow", "long_bow", "war_bow", "master_bow"],
        color: tailwindToHex("gray-400/80"),
        label: "Bows",
        category: "weapons",
        maxCount: 5,
      },
      {
        itemType: "special_weapons",
        itemKeys: ["arbalest", "nightshade_bow", "bloodstone_staff"],
        color: tailwindToHex("gray-400/80"),
        label: "Special Weapons",
        category: "weapons",
        maxCount: 3,
      },
    ],
    // Fourth ring: Clothing and other tools
    [
      {
        itemType: "clothing",
        itemKeys: ["explorer_pack", "hunter_cloak", "grenadier_bag", "highpriest_robe", "loggers_gloves"],
        color: tailwindToHex("gray-400/80"),
        label: "Clothing",
        category: "clothing",
        maxCount: 5,
      },
      {
        itemType: "special_tools",
        itemKeys: ["blacksmith_hammer", "reinforced_rope", "giant_trap", "occultist_map", "mastermason_chisel"],
        color: tailwindToHex("gray-400/80"),
        label: "Special Tools",
        category: "tools",
        maxCount: 5,
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
      const totalMaxCount = segments.reduce((sum, seg) => sum + seg.maxCount, 0);

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
        const currentCount = getItemCount(seg);
        const segmentDegrees = (totalDegrees * seg.maxCount) / totalMaxCount;
        
        const segmentStartAngle = currentEndAngle;
        const segmentEndAngle = segmentStartAngle - segmentDegrees;
        currentEndAngle = segmentEndAngle;

        // Calculate progress within this segment
        const progress = seg.maxCount > 0 ? currentCount / seg.maxCount : 0;
        const progressDegrees = segmentDegrees * progress;

        const adjustedStartAngle = index === 0
          ? segmentStartAngle
          : segmentStartAngle - paddingAngle * index;
        const adjustedProgressAngle = index === 0
          ? segmentStartAngle - progressDegrees
          : segmentStartAngle - progressDegrees - paddingAngle * index;

        const isFull = currentCount >= seg.maxCount;

        return {
          name: seg.label,
          fill: seg.color,
          startAngle: adjustedStartAngle,
          endAngle: adjustedProgressAngle,
          isFull: isFull,
        };
      });

      return {
        backgroundSegments,
        progressSegments,
        foregroundSegments,
        innerRadius,
        outerRadius,
        paddingAngle,
        startAngle,
      };
    })
    .filter((ring) => ring !== null);

  return (
    <div className="w-full h-36 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {processedRings.map((ring, ringIndex) => (
            <>
              {/* Background ring */}
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
              </Pie>

              {/* Progress segments */}
              {ring.progressSegments.map((segment, segIndex) => (
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
                  strokeWidth={segment.isFull ? 1.5 : 0}
                  stroke={segment.isFull ? tailwindToHex("red-600") : undefined}
                  isAnimationActive={false}
                  style={{ outline: 'none' }}
                >
                  <Cell fill={segment.fill} />
                </Pie>
              ))}
              
              {/* Foreground ring */}
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
                stroke={tailwindToHex("neutral-200")}
                isAnimationActive={false}
                style={{ outline: 'none' }}
              >
              </Pie>
            </>
          ))}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
