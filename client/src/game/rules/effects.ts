import { GameState } from "@shared/schema";

// Define action bonuses interface
export interface ActionBonuses {
  resourceBonus: Record<string, number>;
  resourceMultiplier: number;
  probabilityBonus: Record<string, number>;
  cooldownReduction: number;
}

// Define effects that tools and clothing provide
export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  bonuses: {
    // Resource gathering bonuses
    resourceMultipliers?: Record<string, number>;
    resourceBonuses?: Record<string, number>;

    // Action-specific bonuses
    actionBonuses?: Record<
      string,
      {
        cooldownReduction?: number; // Percentage reduction (0.1 = 10% reduction)
        resourceBonus?: Record<string, number>; // Fixed bonus to specific resources
        resourceMultiplier?: number; // Multiplier for all resources (1.25 = 25% bonus)
        probabilityBonus?: Record<string, number>; // Bonus to probability effects
      }
    >;

    // General bonuses
    generalBonuses?: {
      gatheringSpeed?: number; // Multiplier for all gathering actions
      craftingSpeed?: number; // Multiplier for crafting actions
      explorationBonus?: number; // Bonus resources when exploring
      luck?: number; // Luck bonus
      strength?: number; // Strength bonus
      knowledge?: number; // Knowledge bonus
      madness?: number; // Madness bonus
      madnessReduction?: number; // Reduction in madness
      craftingCostReduction?: number; // Percentage reduction in crafting costs (0.1 = 10% reduction)
      buildingCostReduction?: number; // Percentage reduction in building costs (0.1 = 10% reduction)
      MAX_EMBER_BOMBS?: number; // Bonus to max ember bombs capacity
      MAX_CINDERFLAME_BOMBS?: number; // Bonus to max cinderflame bombs capacity
    };
  };
}

// Tool effects
export const toolEffects: Record<string, EffectDefinition> = {
  stone_axe: {
    id: "stone_axe",
    name: "Stone Axe",
    description: "Basic axe for chopping wood",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 1.25,
          cooldownReduction: 0.25,
        },
        buildTorch: {
          cooldownReduction: 0.25,
        },
      },
    },
  },

  stone_pickaxe: {
    id: "stone_pickaxe",
    name: "Stone Pickaxe",
    description: "Rudimentary pickaxe for mining",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.25,
          cooldownReduction: 1,
        },
      },
    },
  },

  spear: {
    id: "spear",
    name: "Spear",
    description: "Improves hunting efficiency",
    bonuses: {
      actionBonuses: {},
    },
  },

  iron_axe: {
    id: "iron_axe",
    name: "Iron Axe",
    description: "Sharp axe for heavy chopping",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 1.5,
          cooldownReduction: 0.5,
        },
        buildTorch: {
          cooldownReduction: 0.5,
        },
      },
    },
  },

  iron_pickaxe: {
    id: "iron_pickaxe",
    name: "Iron Pickaxe",
    description: "Durable pickaxe for mining efficiently",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.5,
          cooldownReduction: 1,
        },
      },
    },
  },

  steel_axe: {
    id: "steel_axe",
    name: "Steel Axe",
    description: "Finely crafted axe forged from tempered steel",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 1.75,
          cooldownReduction: 0.75,
        },
      },
    },
  },

  steel_pickaxe: {
    id: "steel_pickaxe",
    name: "Steel Pickaxe",
    description: "Very sturdy mining tool crafted from resilient steel",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.75,
          cooldownReduction: 2,
        },
      },
    },
  },

  obsidian_axe: {
    id: "obsidian_axe",
    name: "Obsidian Axe",
    description: "Legendary axe with razor-sharp volcanic edges",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 2.0,
          cooldownReduction: 1,
        },
      },
    },
  },

  obsidian_pickaxe: {
    id: "obsidian_pickaxe",
    name: "Obsidian Pickaxe",
    description: "Masterful tool for mining made of volcanic glass",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 2.0,
          cooldownReduction: 4,
        },
      },
    },
  },

  adamant_axe: {
    id: "adamant_axe",
    name: "Adamant Axe",
    description: "Unbreakable axe, forged from the hardest metal",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 3.0,
          cooldownReduction: 1.5,
        },
      },
    },
  },

  adamant_pickaxe: {
    id: "adamant_pickaxe",
    name: "Adamant Pickaxe",
    description: "Pinnacle of mining tools, unyielding and precise",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 3.0,
          cooldownReduction: 6,
        },
      },
    },
  },

  iron_lantern: {
    id: "iron_lantern",
    name: "Iron Lantern",
    description: "Simple lantern providing reliable light",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.25,
          cooldownReduction: 1,
        },
        ventureDeeper: {
          cooldownReduction: 2,
        },
      },
    },
  },

  steel_lantern: {
    id: "steel_lantern",
    name: "Steel Lantern",
    description: "Bright and sturdy, illuminating the darkest places.",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.5,
          cooldownReduction: 2,
        },
      },
    },
  },

  obsidian_lantern: {
    id: "obsidian_lantern",
    name: "Obsidian Lantern",
    description: "Powerful lantern that casts a strong, unwavering light",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 2.0,
          cooldownReduction: 3,
        },
      },
    },
  },

  adamant_lantern: {
    id: "adamant_lantern",
    name: "Adamant Lantern",
    description: "Ultimate light source, illuminating every path",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 3.0,
          cooldownReduction: 4,
        },
      },
    },
  },

  reinforced_rope: {
    id: "reinforced_rope",
    name: "Reinforced Rope",
    description: "Strong rope that enables access to deeper cave chambers",
    bonuses: {
      actionBonuses: {},
    },
  },

  occultist_map: {
    id: "occultist_map",
    name: "Occultist Map",
    description:
      "Time-worn map revealing the hidden chamber of an accultist in the cave",
    bonuses: {
      actionBonuses: {},
    },
  },

  giant_trap: {
    id: "giant_trap",
    name: "Giant Trap",
    description: "Massive trap capable of catching gigantic forest creatures",
    bonuses: {
      actionBonuses: {},
    },
  },
};

// Weapon effects
export const weaponEffects: Record<string, EffectDefinition> = {
  crude_bow: {
    id: "crude_bow",
    name: "Crude Bow",
    description: "Simple bow, reliable for any challenge",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.25,
        },
      },
      generalBonuses: {
        strength: 1,
      },
    },
  },

  huntsman_bow: {
    id: "huntsman_bow",
    name: "Huntsman Bow",
    description: "Improved bow, finely balanced and precise",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.5,
        },
      },
      generalBonuses: {
        strength: 2,
      },
    },
  },

  long_bow: {
    id: "long_bow",
    name: "Long Bow",
    description: "Superior bow with extended reach and accuracy",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.75,
        },
      },
      generalBonuses: {
        strength: 3,
      },
    },
  },

  war_bow: {
    id: "war_bow",
    name: "War Bow",
    description: "Very powerful bow, crafted for strength and precision",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 2.0,
        },
      },
      generalBonuses: {
        strength: 4,
      },
    },
  },

  master_bow: {
    id: "master_bow",
    name: "Master Bow",
    description: "Ultimate bow, unmatched in power and control",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 3.0,
        },
      },
      generalBonuses: {
        strength: 5,
      },
    },
  },

  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    description: "Sturdy iron blade that enhances your combat prowess",
    bonuses: {
      generalBonuses: {
        strength: 3,
      },
    },
  },

  steel_sword: {
    id: "steel_sword",
    name: "Steel Sword",
    description: "Finely crafted steel blade with superior balance",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
    },
  },

  obsidian_sword: {
    id: "obsidian_sword",
    name: "Obsidian Sword",
    description: "Razor-sharp blade forged from volcanic glass",
    bonuses: {
      generalBonuses: {
        strength: 8,
      },
    },
  },

  adamant_sword: {
    id: "adamant_sword",
    name: "Adamant Sword",
    description: "Ultimate weapon forged from the hardest metal",
    bonuses: {
      generalBonuses: {
        strength: 12,
      },
    },
  },

  frostglass_sword: {
    id: "frostglass_sword",
    name: "Frostglass Sword",
    description: "Blade forged from frostglas, radiating cold power",
    bonuses: {
      generalBonuses: {
        strength: 35,
      },
      actionBonuses: {},
    },
  },

  bloodstone_staff: {
    id: "bloodstone_staff",
    name: "Bloodstone Staff",
    description: "Staff crowned with bloodstone, pulsing with dark energy",
    bonuses: {
      generalBonuses: {
        strength: 5,
        knowledge: 30,
      },
      actionBonuses: {},
    },
  },

  arbalest: {
    id: "arbalest",
    name: "Arbalest",
    description: "Meticulously decorated arbalest designed by a great engineer",
    bonuses: {
      generalBonuses: {
        strength: 10,
      },
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.25,
        },
      },
    },
  },

  nightshade_bow: {
    id: "nightshade_bow",
    name: "Nightshade Bow",
    description: "Bow made of very dark wood, poisoning the enemy",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
      actionBonuses: {},
    },
  },
};

// Relic effects
export const clothingEffects: Record<string, EffectDefinition> = {
  cracked_crown: {
    id: "cracked_crown",
    name: "Cracked Crown",
    description: "Ancient golden crown radiating with mysterious power",
    bonuses: {
      generalBonuses: {
        luck: 5,
        knowledge: 3,
        madness: 3,
      },
      actionBonuses: {},
    },
  },

  tarnished_amulet: {
    id: "tarnished_amulet",
    name: "Tarnished Amulet",
    description: "Timeworn amulet that brings good fortune",
    bonuses: {
      generalBonuses: {
        luck: 5,
      },
    },
  },

  ring_of_clarity: {
    id: "ring_of_clarity",
    name: "Ring of Clarity",
    description: "Ring carved out of very clear crytal",
    bonuses: {
      generalBonuses: {
        madnessReduction: 5,
      },
    },
  },

  grenadier_bag: {
    id: "grenadier_bag",
    name: "Grenadier's Bag",
    description: "Reinforced leather bag for carrying explosives",
    bonuses: {
      generalBonuses: {
        MAX_EMBER_BOMBS: 1,
        MAX_CINDERFLAME_BOMBS: 1,
      },
    },
  },

  bloodstained_belt: {
    id: "bloodstained_belt",
    name: "Bloodstained Belt",
    description: "Leather belt stained with old blood that grants raw power",
    bonuses: {
      generalBonuses: {
        strength: 3,
      },
    },
  },

  ravenfeather_mantle: {
    id: "ravenfeather_mantle",
    name: "Ravenfeather Mantle",
    description: "Mystical mantle woven from shimmering raven feathers",
    bonuses: {
      generalBonuses: {
        luck: 5,
        strength: 3,
      },
    },
  },

  alphas_hide: {
    id: "alphas_hide",
    name: "Alpha's Hide",
    description: "Hide of the wolf pack leader, imbued with primal power",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.15,
        },
      },
      generalBonuses: {
        luck: 3,
        strength: 4,
      },
    },
  },

  whispering_amulet: {
    id: "whispering_amulet",
    name: "Whispering Amulet",
    description: "Mysterious amulet that whispers ancient secrets",
    bonuses: {
      generalBonuses: {
        luck: 3,
        knowledge: 4,
        madness: 3,
      },
    },
  },

  old_trinket: {
    id: "old_trinket",
    name: "Old Trinket",
    description: "Ancient trinket that grants both strength and luck",
    bonuses: {
      generalBonuses: {
        luck: 2,
        strength: 3,
      },
    },
  },

  blacksmith_hammer: {
    id: "blacksmith_hammer",
    name: "Blacksmith Hammer",
    description: "Legendary blacksmith hammer once owned by a great blacksmith",
    bonuses: {
      generalBonuses: {
        strength: 4,
        craftingCostReduction: 0.1,
      },
    },
  },

  elder_scroll: {
    id: "elder_scroll",
    name: "Elder Scroll",
    description: "Ancient scroll containing forbidden knowledge",
    bonuses: {
      generalBonuses: {
        knowledge: 10,
        madness: 3,
      },
    },
  },
  dragon_bone_dice: {
    id: "dragon_bone_dice",
    name: "Dragon Bone Dice",
    description: "Six-sided dice carved from ancient dragon bone",
    bonuses: {
      generalBonuses: {
        luck: 3,
        madness: 2,
      },
    },
  },
  ring_of_drowned: {
    id: "ring_of_drowned",
    name: "Ring of Drowned",
    description: "Tarnished ring that is always wet and cold",
    bonuses: {
      generalBonuses: {
        luck: 4,
        madness: 3,
      },
    },
  },
  shadow_flute: {
    id: "shadow_flute",
    name: "Shadow Flute",
    description: "Bone flute that makes shadows move unnaturally",
    bonuses: {
      generalBonuses: {
        luck: 2,
        knowledge: 4,
        madness: 3,
      },
    },
  },
  hollow_king_scepter: {
    id: "hollow_king_scepter",
    name: "Hollow King Scepter",
    description: "Scepter of the lost king, radiating power and madness",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 1.25,
        },
      },
      generalBonuses: {
        strength: 3,
        knowledge: 7,
        madness: 5,
      },
    },
  },

  wooden_figure: {
    id: "wooden_figure",
    name: "Wooden Figure",
    description:
      "Carved wooden figure of an unsettling creature with tentacles",
    bonuses: {
      generalBonuses: {
        luck: 5,
        madness: 4,
      },
    },
  },

  blackened_mirror: {
    id: "blackened_mirror",
    name: "Blackened Mirror",
    description:
      "Tall cracked mirror framed in black iron that radiates cold aura",
    bonuses: {
      generalBonuses: {
        knowledge: 7,
        madness: 3,
      },
    },
  },

  ebony_ring: {
    id: "ebony_ring",
    name: "Ebony Ring",
    description:
      "Dark ring left as a gift by the forest gods, pulsing with otherworldly power",
    bonuses: {
      generalBonuses: {
        luck: 5,
        strength: 3,
        madness: 2,
      },
    },
  },

  red_mask: {
    id: "red_mask",
    name: "Red Mask",
    description: "Repulsive mask crafted from deep crimson leather",
    bonuses: {
      generalBonuses: {
        luck: 3,
        knowledge: 2,
        madness: 3,
      },
    },
  },

  black_bear_fur: {
    id: "black_bear_fur",
    name: "Black Bear Fur",
    description: "Cursed black fur from an otherworldy giant bear",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.25,
        },
      },
      generalBonuses: {
        strength: 5,
        madness: 3,
      },
    },
  },

  seeker_pack: {
    id: "seeker_pack",
    name: "Seeker Pack",
    description:
      "Well-crafted leather backpack easing the weight upon the shoulders",
    bonuses: {
      actionBonuses: {
        gatherWood: {
          resourceMultiplier: 1.2,
        },
        exploreCave: {
          resourceMultiplier: 1.2,
        },
        ventureDeeper: {
          resourceMultiplier: 1.2,
        },
        descendFurther: {
          resourceMultiplier: 1.2,
        },
        exploreRuins: {
          resourceMultiplier: 1.2,
        },
        exploreTemple: {
          resourceMultiplier: 1.2,
        },
        exploreCitadel: {
          resourceMultiplier: 1.2,
        },
        lowChamber: {
          resourceMultiplier: 1.2,
        },
        alchemistChamber: {
          resourceMultiplier: 1.2,
        },
      },
    },
  },

  hunter_cloak: {
    id: "hunter_cloak",
    name: "Hunter Cloak",
    description: "Supple leather cloak that silences every movement",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 1.2,
        },
      },
    },
  },

  unnamed_book: {
    id: "unnamed_book",
    name: "Unnamed Book",
    description: "Book bound in human skin filled with forbidden knowledge",
    bonuses: {
      generalBonuses: {
        knowledge: 8,
        madness: 5,
      },
    },
  },

  occultist_grimoire: {
    id: "occultist_grimoire",
    name: "Occultist Grimoire",
    description:
      "Grimoire containing the unholy knowledge of a heretic occultist",
    bonuses: {
      generalBonuses: {
        knowledge: 7,
        madness: 3,
      },
    },
  },

  mastermason_chisel: {
    id: "mastermason_chisel",
    name: "Mastermason Chisel",
    description: "Exquisitely crafted tool of a long-forgotten master builder",
    bonuses: {
      generalBonuses: {
        craftingCostReduction: 0.1,
        buildingCostReduction: 0.1,
      },
    },
  },

  // Relic effects
  ravens_orb: {
    id: "ravens_orb",
    name: "Raven's Orb",
    description: "Dark orb blessed by ravens with ancient knowledge",
    bonuses: {
      generalBonuses: {
        knowledge: 6,
        madness: 2,
      },
    },
  },

  murmuring_cube: {
    id: "murmuring_cube",
    name: "Murmuring Cube",
    description: "Perfectly polished metal cube of unknown origin",
    bonuses: {},
  },

  ancient_scrolls: {
    id: "ancient_scrolls",
    name: "Ancient Scrolls",
    description:
      "Mysterious scrolls written in an unknown language, waiting to be decrypted",
    bonuses: {},
  },

  // Schematics
  arbalest_schematic: {
    id: "arbalest_schematic",
    name: "Arbalest Schematic",
    description: "Blueprint for crafting a powerful arbalest",
    bonuses: {},
  },

  nightshade_bow_schematic: {
    id: "nightshade_bow_schematic",
    name: "Nightshade Bow Schematic",
    description: "Blueprint for crafting a poisonous nightshade bow",
    bonuses: {},
  },

  ashen_dagger: {
    id: "ashen_dagger",
    name: "Ashen Dagger",
    description: "Dagger forged of volcanic ash given by the Ashbringer",
    bonuses: {
      generalBonuses: {
        strength: 5,
      },
    },
  },

  // Blessings
  dagons_gift: {
    id: "dagons_gift",
    name: "Dagon's Gift",
    description: "+100% resources when hunting",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 2.0,
        },
      },
    },
  },

  flames_touch: {
    id: "flames_touch",
    name: "Flame's Touch",
    description: "+1 Steel from Steel Forger",
    bonuses: {
      actionBonuses: {
        forge: {
          resourceBonus: {
            steel: 1,
          },
        },
      },
    },
  },

  ravens_mark: {
    id: "ravens_mark",
    name: "Raven's Mark",
    description: "More Strangers approach",
    bonuses: {},
  },

  ashen_embrace: {
    id: "ashen_embrace",
    name: "Ashen Embrace",
    description: "+100% resources when mining",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 2.0,
        },
      },
    },
  },

  // Enhanced blessings
  dagons_gift_enhanced: {
    id: "dagons_gift_enhanced",
    name: "Dagon's Great Gift",
    description: "+300% resources when hunting",
    bonuses: {
      actionBonuses: {
        hunt: {
          resourceMultiplier: 4.0, // 300% bonus
        },
      },
    },
  },

  flames_touch_enhanced: {
    id: "flames_touch_enhanced",
    name: "Strong Flame's Touch",
    description: "+3 Steel from Steel Forger",
    bonuses: {
      actionBonuses: {
        forge: {
          resourceBonus: {
            steel: 3,
          },
        },
      },
    },
  },

  ravens_mark_enhanced: {
    id: "ravens_mark_enhanced",
    name: "Raven's Great Mark",
    description: "Much more Strangers approach",
    bonuses: {},
  },

  ashen_embrace_enhanced: {
    id: "ashen_embrace_enhanced",
    name: "Deep Ashen Embrace",
    description: "+300% resources when mining",
    bonuses: {
      actionBonuses: {
        mining: {
          resourceMultiplier: 4.0, // 300% bonus
        },
      },
    },
  },
};
