
import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";

interface ItemSegment {
  itemType: string;
  itemKey: keyof GameState["tools"] | keyof GameState["weapons"] | keyof GameState["clothing"] | keyof GameState["relics"];
  color: string;
  label: string;
  category: "tools" | "weapons" | "clothing" | "relics";
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

  // Define ring segment configurations
  const ringSegments: ItemSegment[][] = [
    // First ring: Basic tools
    [
      {
        itemType: "stone_axe",
        itemKey: "stone_axe",
        color: tailwindToHex("gray-400/80"),
        label: "Stone Axe",
        category: "tools",
      },
      {
        itemType: "stone_pickaxe",
        itemKey: "stone_pickaxe",
        color: tailwindToHex("gray-400/80"),
        label: "Stone Pickaxe",
        category: "tools",
      },
      {
        itemType: "iron_axe",
        itemKey: "iron_axe",
        color: tailwindToHex("gray-400/80"),
        label: "Iron Axe",
        category: "tools",
      },
      {
        itemType: "iron_pickaxe",
        itemKey: "iron_pickaxe",
        color: tailwindToHex("gray-400/80"),
        label: "Iron Pickaxe",
        category: "tools",
      },
    ],
    // Second ring: Advanced tools
    [
      {
        itemType: "steel_axe",
        itemKey: "steel_axe",
        color: tailwindToHex("gray-400/80"),
        label: "Steel Axe",
        category: "tools",
      },
      {
        itemType: "steel_pickaxe",
        itemKey: "steel_pickaxe",
        color: tailwindToHex("gray-400/80"),
        label: "Steel Pickaxe",
        category: "tools",
      },
      {
        itemType: "obsidian_axe",
        itemKey: "obsidian_axe",
        color: tailwindToHex("gray-400/80"),
        label: "Obsidian Axe",
        category: "tools",
      },
      {
        itemType: "obsidian_pickaxe",
        itemKey: "obsidian_pickaxe",
        color: tailwindToHex("gray-400/80"),
        label: "Obsidian Pickaxe",
        category: "tools",
      },
      {
        itemType: "adamant_axe",
        itemKey: "adamant_axe",
        color: tailwindToHex("gray-400/80"),
        label: "Adamant Axe",
        category: "tools",
      },
      {
        itemType: "adamant_pickaxe",
        itemKey: "adamant_pickaxe",
        color: tailwindToHex("gray-400/80"),
        label: "Adamant Pickaxe",
        category: "tools",
      },
    ],
    // Third ring: Lanterns
    [
      {
        itemType: "iron_lantern",
        itemKey: "iron_lantern",
        color: tailwindToHex("gray-400/80"),
        label: "Iron Lantern",
        category: "tools",
      },
      {
        itemType: "steel_lantern",
        itemKey: "steel_lantern",
        color: tailwindToHex("gray-400/80"),
        label: "Steel Lantern",
        category: "tools",
      },
      {
        itemType: "obsidian_lantern",
        itemKey: "obsidian_lantern",
        color: tailwindToHex("gray-400/80"),
        label: "Obsidian Lantern",
        category: "tools",
      },
      {
        itemType: "adamant_lantern",
        itemKey: "adamant_lantern",
        color: tailwindToHex("gray-400/80"),
        label: "Adamant Lantern",
        category: "tools",
      },
    ],
    // Fourth ring: Weapons (Swords and Bows)
    [
      {
        itemType: "iron_sword",
        itemKey: "iron_sword",
        color: tailwindToHex("gray-400/80"),
        label: "Iron Sword",
        category: "weapons",
      },
      {
        itemType: "steel_sword",
        itemKey: "steel_sword",
        color: tailwindToHex("gray-400/80"),
        label: "Steel Sword",
        category: "weapons",
      },
      {
        itemType: "obsidian_sword",
        itemKey: "obsidian_sword",
        color: tailwindToHex("gray-400/80"),
        label: "Obsidian Sword",
        category: "weapons",
      },
      {
        itemType: "adamant_sword",
        itemKey: "adamant_sword",
        color: tailwindToHex("gray-400/80"),
        label: "Adamant Sword",
        category: "weapons",
      },
      {
        itemType: "crude_bow",
        itemKey: "crude_bow",
        color: tailwindToHex("gray-400/80"),
        label: "Crude Bow",
        category: "weapons",
      },
      {
        itemType: "huntsman_bow",
        itemKey: "huntsman_bow",
        color: tailwindToHex("gray-400/80"),
        label: "Huntsman Bow",
        category: "weapons",
      },
    ],
    // Fifth ring: Advanced Weapons
    [
      {
        itemType: "long_bow",
        itemKey: "long_bow",
        color: tailwindToHex("gray-400/80"),
        label: "Long Bow",
        category: "weapons",
      },
      {
        itemType: "war_bow",
        itemKey: "war_bow",
        color: tailwindToHex("gray-400/80"),
        label: "War Bow",
        category: "weapons",
      },
      {
        itemType: "master_bow",
        itemKey: "master_bow",
        color: tailwindToHex("gray-400/80"),
        label: "Master Bow",
        category: "weapons",
      },
      {
        itemType: "arbalest",
        itemKey: "arbalest",
        color: tailwindToHex("gray-400/80"),
        label: "Arbalest",
        category: "weapons",
      },
      {
        itemType: "nightshade_bow",
        itemKey: "nightshade_bow",
        color: tailwindToHex("gray-400/80"),
        label: "Nightshade Bow",
        category: "weapons",
      },
      {
        itemType: "frostglass_sword",
        itemKey: "frostglass_sword",
        color: tailwindToHex("gray-400/80"),
        label: "Frostglass Sword",
        category: "weapons",
      },
      {
        itemType: "bloodstone_staff",
        itemKey: "bloodstone_staff",
        color: tailwindToHex("gray-400/80"),
        label: "Bloodstone Staff",
        category: "weapons",
      },
    ],
    // Sixth ring: Clothing
    [
      {
        itemType: "explorer_pack",
        itemKey: "explorer_pack",
        color: tailwindToHex("gray-400/80"),
        label: "Explorer's Pack",
        category: "clothing",
      },
      {
        itemType: "hunter_cloak",
        itemKey: "hunter_cloak",
        color: tailwindToHex("gray-400/80"),
        label: "Hunter Cloak",
        category: "clothing",
      },
      {
        itemType: "grenadier_bag",
        itemKey: "grenadier_bag",
        color: tailwindToHex("gray-400/80"),
        label: "Grenadier's Bag",
        category: "clothing",
      },
      {
        itemType: "highpriest_robe",
        itemKey: "highpriest_robe",
        color: tailwindToHex("gray-400/80"),
        label: "Highpriest Robe",
        category: "clothing",
      },
      {
        itemType: "loggers_gloves",
        itemKey: "loggers_gloves",
        color: tailwindToHex("gray-400/80"),
        label: "Logger's Gloves",
        category: "clothing",
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

  // Helper function to get item status
  const getItemStatus = (segment: ItemSegment): boolean => {
    const state = useGameStore.getState();
    const category = segment.category;
    const itemKey = segment.itemKey;
    
    if (category === "tools") {
      return state.tools[itemKey as keyof typeof state.tools] || false;
    } else if (category === "weapons") {
      return state.weapons[itemKey as keyof typeof state.weapons] || false;
    } else if (category === "clothing") {
      return state.clothing[itemKey as keyof typeof state.clothing] || false;
    } else if (category === "relics") {
      return state.relics[itemKey as keyof typeof state.relics] || false;
    }
    return false;
  };

  // Process each ring and filter out rings with no items acquired
  const processedRings = ringConfigs
    .map((ringConfig, ringIndex) => {
      const { segments, innerRadius, outerRadius } = ringConfig;

      // Check if this ring has any items acquired
      const hasAnyItem = segments.some((seg) => getItemStatus(seg));

      // Skip this ring if no items are acquired
      if (!hasAnyItem) {
        return null;
      }

      const paddingAngle = getPaddingAngle(ringIndex);
      const startAngle = getStartAngle(paddingAngle);
      const totalDegrees = 360 - segments.length * paddingAngle;

      // Create background segments
      const backgroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: 1,
        fill: backgroundColor,
      }));

      // Create foreground segments (borders only, no fill)
      const foregroundSegments = segments.map((seg) => ({
        name: seg.label,
        value: 1,
        fill: "transparent",
      }));
      
      // Create progress segments with calculated angles
      let currentEndAngle = startAngle;
      const progressSegments = segments.map((seg, index) => {
        const hasItem = getItemStatus(seg);
        const segmentDegrees = totalDegrees / segments.length;
        
        const segmentStartAngle = currentEndAngle;
        const segmentEndAngle = segmentStartAngle - segmentDegrees;
        currentEndAngle = segmentEndAngle;

        const adjustedStartAngle = index === 0
          ? segmentStartAngle
          : segmentStartAngle - paddingAngle * index;
        const adjustedEndAngle = index === 0
          ? segmentEndAngle
          : segmentEndAngle - paddingAngle * index;

        return {
          name: seg.label,
          fill: hasItem ? seg.color : "transparent",
          startAngle: adjustedStartAngle,
          endAngle: adjustedEndAngle,
          isFull: hasItem,
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
