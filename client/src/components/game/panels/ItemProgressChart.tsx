import { useGameStore } from "@/game/state";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { GameState } from "@shared/schema";
import { tailwindToHex } from "@/lib/tailwindColors";

interface ItemSegment {
  itemType: string;
  itemKeys: (
    | keyof GameState["tools"]
    | keyof GameState["weapons"]
    | keyof GameState["clothing"]
    | keyof GameState["relics"]
  )[];
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
  // Ring sizing parameters
  const startRadius = 12;
  const ringSize = 3;
  const spaceBetweenRings = 2.8;

  const getPaddingAngle = (ringIndex: number) => {
    return Math.max(2, 14 - ringIndex * 2);
  };

  const backgroundColor = tailwindToHex("neutral-800");
  const getStartAngle = (paddingAngle: number) => 90 - paddingAngle / 2;

  // Define ring segment configurations - each segment represents upgradable progression
  const ringSegments: ItemSegment[][] = [
    // First ring: Tools
    [
      {
        itemType: "axes",
        itemKeys: [
          "stone_axe",
          "iron_axe",
          "steel_axe",
          "obsidian_axe",
          "adamant_axe",
        ],
        color: tailwindToHex("gray-400/80"),
        label: "Axes",
        category: "tools",
        maxCount: 5,
      },
      {
        itemType: "pickaxes",
        itemKeys: [
          "stone_pickaxe",
          "iron_pickaxe",
          "steel_pickaxe",
          "obsidian_pickaxe",
          "adamant_pickaxe",
        ],
        color: tailwindToHex("gray-400/80"),
        label: "Pickaxes",
        category: "tools",
        maxCount: 5,
      },
      {
        itemType: "lanterns",
        itemKeys: [
          "iron_lantern",
          "steel_lantern",
          "obsidian_lantern",
          "adamant_lantern",
        ],
        color: tailwindToHex("gray-400/80"),
        label: "Lanterns",
        category: "tools",
        maxCount: 4,
      },
      {
        itemType: "blacksmith_hammer",
        itemKeys: ["blacksmith_hammer"],
        color: tailwindToHex("gray-400/80"),
        label: "Blacksmith Hammer",
        category: "tools",
        maxCount: 1,
      },
      {
        itemType: "mastermason_chisel",
        itemKeys: ["mastermason_chisel"],
        color: tailwindToHex("gray-400/80"),
        label: "Mastermason Chisel",
        category: "tools",
        maxCount: 1,
      },
    ],

    // Second ring: Weapons
    [
      {
        itemType: "swords",
        itemKeys: [
          "iron_sword",
          "steel_sword",
          "obsidian_sword",
          "adamant_sword",
        ],
        color: tailwindToHex("gray-400/80"),
        label: "Swords",
        category: "weapons",
        maxCount: 4,
      },
      {
        itemType: "bows",
        itemKeys: [
          "crude_bow",
          "huntsman_bow",
          "long_bow",
          "war_bow",
          "master_bow",
        ],
        color: tailwindToHex("gray-400/80"),
        label: "Bows",
        category: "weapons",
        maxCount: 5,
      },
      {
        itemType: "arbalest",
        itemKeys: ["arbalest"],
        color: tailwindToHex("gray-400/80"),
        label: "Arbalest",
        category: "weapons",
        maxCount: 1,
      },
      {
        itemType: "nightshade_bow",
        itemKeys: ["nightshade_bow"],
        color: tailwindToHex("gray-400/80"),
        label: "Nightshade Bow",
        category: "weapons",
        maxCount: 1,
      },
      {
        itemType: "compound_bow",
        itemKeys: ["compound_bow"],
        color: tailwindToHex("gray-400/80"),
        label: "Compound Bow",
        category: "weapons",
        maxCount: 1,
      },
      {
        itemType: "frostglass_sword",
        itemKeys: ["frostglass_sword"],
        color: tailwindToHex("gray-400/80"),
        label: "Frostglass Sword",
        category: "weapons",
        maxCount: 1,
      },
      {
        itemType: "bloodstone_staff",
        itemKeys: ["bloodstone_staff"],
        color: tailwindToHex("gray-400/80"),
        label: "Bloodstone Staff",
        category: "weapons",
        maxCount: 1,
      },
    ],
    // Third ring: Relics
    [
      {
        itemType: "whispering_cube",
        itemKeys: ["whispering_cube"],
        color: tailwindToHex("gray-400/80"),
        label: "Whispering Cube",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "wooden_figure",
        itemKeys: ["wooden_figure"],
        color: tailwindToHex("gray-400/80"),
        label: "Wooden Figure",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "bone_dice",
        itemKeys: ["bone_dice"],
        color: tailwindToHex("gray-400/80"),
        label: "Bone Dice",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "blackened_mirror",
        itemKeys: ["blackened_mirror"],
        color: tailwindToHex("gray-400/80"),
        label: "Blackened Mirror",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "unnamed_book",
        itemKeys: ["unnamed_book"],
        color: tailwindToHex("gray-400/80"),
        label: "Unnamed Book",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "ancient_scrolls",
        itemKeys: ["ancient_scrolls"],
        color: tailwindToHex("gray-400/80"),
        label: "Ancient Scrolls",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "elder_scroll",
        itemKeys: ["elder_scroll"],
        color: tailwindToHex("gray-400/80"),
        label: "Elder Scroll",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "ravens_orb",
        itemKeys: ["ravens_orb"],
        color: tailwindToHex("gray-400/80"),
        label: "Raven's Orb",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "occultist_grimoire",
        itemKeys: ["occultist_grimoire"],
        color: tailwindToHex("gray-400/80"),
        label: "Occultist Grimoire",
        category: "relics",
        maxCount: 1,
      },
      {
        itemType: "shadow_flute",
        itemKeys: ["shadow_flute"],
        color: tailwindToHex("gray-400/80"),
        label: "Shadow Flute",
        category: "relics",
        maxCount: 1,
      },
    ],
    // Fourth ring: Clothing
    [
      {
        itemType: "explorer_pack",
        itemKeys: ["explorer_pack"],
        color: tailwindToHex("gray-400/80"),
        label: "Explorer Pack",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "hunter_cloak",
        itemKeys: ["hunter_cloak"],
        color: tailwindToHex("gray-400/80"),
        label: "Hunter Cloak",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "grenadier_bag",
        itemKeys: ["grenadier_bag"],
        color: tailwindToHex("gray-400/80"),
        label: "Grenadier Bag",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "highpriest_robe",
        itemKeys: ["highpriest_robe"],
        color: tailwindToHex("gray-400/80"),
        label: "Highpriest Robe",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "loggers_gloves",
        itemKeys: ["loggers_gloves"],
        color: tailwindToHex("gray-400/80"),
        label: "Logger's Gloves",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "tarnished_amulet",
        itemKeys: ["tarnished_amulet"],
        color: tailwindToHex("gray-400/80"),
        label: "Tarnished Amulet",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "bloodstained_belt",
        itemKeys: ["bloodstained_belt"],
        color: tailwindToHex("gray-400/80"),
        label: "Bloodstained Belt",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "ravenfeather_mantle",
        itemKeys: ["ravenfeather_mantle"],
        color: tailwindToHex("gray-400/80"),
        label: "Ravenfeather Mantle",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "muttering_amulet",
        itemKeys: ["muttering_amulet"],
        color: tailwindToHex("gray-400/80"),
        label: "Muttering Amulet",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "ring_of_clarity",
        itemKeys: ["ring_of_clarity"],
        color: tailwindToHex("gray-400/80"),
        label: "Ring of Clarity",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "alphas_hide",
        itemKeys: ["alphas_hide"],
        color: tailwindToHex("gray-400/80"),
        label: "Alpha's Hide",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "ebony_ring",
        itemKeys: ["ebony_ring"],
        color: tailwindToHex("gray-400/80"),
        label: "Ebony Ring",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "cracked_crown",
        itemKeys: ["cracked_crown"],
        color: tailwindToHex("gray-400/80"),
        label: "Cracked Crown",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "black_bear_fur",
        itemKeys: ["black_bear_fur"],
        color: tailwindToHex("gray-400/80"),
        label: "Black Bear Fur",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "ring_of_drowned",
        itemKeys: ["ring_of_drowned"],
        color: tailwindToHex("gray-400/80"),
        label: "Ring of Drowned",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "red_mask",
        itemKeys: ["red_mask"],
        color: tailwindToHex("gray-400/80"),
        label: "Red Mask",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "moon_bracelet",
        itemKeys: ["moon_bracelet"],
        color: tailwindToHex("gray-400/80"),
        label: "Moon Bracelet",
        category: "clothing",
        maxCount: 1,
      },
      {
        itemType: "bone_necklace",
        itemKeys: ["bone_necklace"],
        color: tailwindToHex("gray-400/80"),
        label: "Bone Necklace",
        category: "clothing",
        maxCount: 1,
      },
    ],
    // Fifth ring: ???
    [],
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
      const totalMaxCount = segments.reduce(
        (sum, seg) => sum + seg.maxCount,
        0,
      );

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
    <div className="w-full h-20 w-20 flex flex-col items-center justify-center">
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
                style={{ outline: "none" }}
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
                  strokeWidth={segment.isFull ? 1 : 0}
                  stroke={segment.isFull ? tailwindToHex("red-900") : undefined}
                  isAnimationActive={false}
                  style={{ outline: "none" }}
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
                stroke={tailwindToHex("neutral-400")}
                isAnimationActive={false}
                style={{ outline: "none" }}
              ></Pie>
            </>
          ))}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
