import { z } from "zod";

// Define LogEntry schema first since it's used in gameStateSchema
export const logEntrySchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.number(),
  type: z.enum(["system", "action", "event", "production"]).default("system"),
  visualEffect: z
    .object({
      type: z.enum(["glow", "pulse"]),
      duration: z.number(), // in seconds
    })
    .optional(),
  relevant_stats: z.array(z.string()).optional(),
  choices: z.any().optional(), // Store choices for timed events
  isTimedChoice: z.boolean().optional(),
  baseDecisionTime: z.number().optional(),
  fallbackChoice: z.any().optional(),
  showAsTimedTab: z.boolean().optional(),
  timedTabDuration: z.number().optional(),
});

// Define AttackWaveTimer schema
const attackWaveTimerSchema = z.object({
  startTime: z.number().default(0),
  duration: z.number().default(0),
  defeated: z.boolean().default(false),
  provoked: z.boolean().default(false),
  pausedAt: z.number().optional(), // Timestamp when timer was paused
  elapsedTime: z.number().default(0), // Accumulated elapsed time (only increments when not paused)
});

// Game state schema for A Dark Cave
export const gameStateSchema = z.object({
  gameId: z.string().optional(), // Unique identifier for this game playthrough
  resources: z
    .object({
      wood: z.number().min(0).default(0),
      stone: z.number().min(0).default(0),
      food: z.number().min(0).default(0),
      bones: z.number().min(0).default(0),
      fur: z.number().min(0).default(0),
      leather: z.number().min(0).default(0),
      bone_totem: z.number().min(0).default(0),
      leather_totem: z.number().min(0).default(0),
      iron: z.number().min(0).default(0),
      coal: z.number().min(0).default(0),
      sulfur: z.number().min(0).default(0),
      obsidian: z.number().min(0).default(0),
      adamant: z.number().min(0).default(0),
      steel: z.number().min(0).default(0),
      blacksteel: z.number().min(0).default(0),
      moonstone: z.number().min(0).default(0),
      black_powder: z.number().min(0).default(0),
      ember_bomb: z.number().min(0).default(0),
      ashfire_dust: z.number().min(0).default(0),
      ashfire_bomb: z.number().min(0).default(0),
      void_bomb: z.number().min(0).default(0),
      torch: z.number().min(0).default(0),
      silver: z.number().min(0).default(0),
      gold: z.number().min(0).default(0),
    })
    .default({}),
  stats: z
    .object({
      strength: z.number().min(0).default(0),
      knowledge: z.number().min(0).default(0),
      luck: z.number().min(0).default(0),
      madness: z.number().min(0).default(0),
      madnessFromEvents: z.number().min(0).default(0),
    })
    .default({}),
  boostMode: z.boolean().default(false),
  flags: z
    .object({
      villageUnlocked: z.boolean().default(false),
      forestUnlocked: z.boolean().default(false),
      bastionUnlocked: z.boolean().default(false),
      gameStarted: z.boolean().default(false),
      starvationActive: z.boolean().default(false),
      firstWolfAttack: z.boolean().default(false),
      monolithUnlocked: z.boolean().default(false),
      humanSacrificeUnlocked: z.boolean().default(false),
      hasCity: z.boolean().default(false),
      hasFortress: z.boolean().default(false),
      hasHitResourceLimit: z.boolean().default(false),
    })
    .default({}),
  schematics: z
    .object({
      arbalest_schematic: z.boolean().default(false),
      nightshade_bow_schematic: z.boolean().default(false),
      stormglass_halberd_schematic: z.boolean().default(false),
      skeleton_key_schematic: z.boolean().default(false),
    })
    .default({}),
  tools: z
    .object({
      stone_axe: z.boolean().default(false),
      stone_pickaxe: z.boolean().default(false),
      iron_axe: z.boolean().default(false),
      iron_pickaxe: z.boolean().default(false),
      steel_axe: z.boolean().default(false),
      steel_pickaxe: z.boolean().default(false),
      obsidian_axe: z.boolean().default(false),
      obsidian_pickaxe: z.boolean().default(false),
      adamant_axe: z.boolean().default(false),
      adamant_pickaxe: z.boolean().default(false),
      natharit_pickaxe: z.boolean().default(false),
      bone_saw: z.boolean().default(false),
      skull_lantern: z.boolean().default(false),
      lantern: z.boolean().default(false),
      iron_lantern: z.boolean().default(false),
      steel_lantern: z.boolean().default(false),
      obsidian_lantern: z.boolean().default(false),
      adamant_lantern: z.boolean().default(false),
      blacksteel_axe: z.boolean().default(false),
      blacksteel_pickaxe: z.boolean().default(false),
      blacksteel_lantern: z.boolean().default(false),
      blacksmith_hammer: z.boolean().default(false),
      reinforced_rope: z.boolean().default(false),
      giant_trap: z.boolean().default(false),
      occultist_map: z.boolean().default(false),
      hidden_library_map: z.boolean().default(false),
      mastermason_chisel: z.boolean().default(false),
      skeleton_key: z.boolean().default(false),
      crow_harness: z.boolean().default(false),
    })
    .default({}),
  weapons: z
    .object({
      iron_sword: z.boolean().default(false),
      steel_sword: z.boolean().default(false),
      obsidian_sword: z.boolean().default(false),
      adamant_sword: z.boolean().default(false),
      blacksteel_sword: z.boolean().default(false),
      blacksteel_bow: z.boolean().default(false),
      crude_bow: z.boolean().default(false),
      huntsman_bow: z.boolean().default(false),
      long_bow: z.boolean().default(false),
      war_bow: z.boolean().default(false),
      master_bow: z.boolean().default(false),
      ashen_dagger: z.boolean().default(false),
      arbalest: z.boolean().default(false),
      nightshade_bow: z.boolean().default(false),
      compound_bow: z.boolean().default(false),
      frostglass_sword: z.boolean().default(false),
      bloodstone_staff: z.boolean().default(false),
      nordic_war_axe: z.boolean().default(false),
      stormglass_halberd: z.boolean().default(false),
    })
    .default({}),
  clothing: z
    .object({
      explorer_pack: z.boolean().default(false),
      hunter_cloak: z.boolean().default(false),
      grenadier_bag: z.boolean().default(false),
      highpriest_robe: z.boolean().default(false),
      loggers_gloves: z.boolean().default(false),
      tarnished_amulet: z.boolean().default(false),
      bloodstained_belt: z.boolean().default(false),
      ravenfeather_mantle: z.boolean().default(false),
      muttering_amulet: z.boolean().default(false),
      ring_of_clarity: z.boolean().default(false),
      alphas_hide: z.boolean().default(false),
      ebony_ring: z.boolean().default(false),
      cracked_crown: z.boolean().default(false),
      black_bear_fur: z.boolean().default(false),
      ring_of_drowned: z.boolean().default(false),
      red_mask: z.boolean().default(false),
      moon_bracelet: z.boolean().default(false),
      bone_necklace: z.boolean().default(false),
      sacrificial_tunic: z.boolean().default(false),
      shadow_boots: z.boolean().default(false),
      feeding_ring: z.boolean().default(false),
      unnamed_book: z.boolean().default(false),
      occultist_grimoire: z.boolean().default(false),
      ravens_orb: z.boolean().default(false),
    })
    .default({}),
  relics: z
    .object({
      whispering_cube: z.boolean().default(false),
      odd_trinket: z.boolean().default(false),
      wooden_figure: z.boolean().default(false),
      bone_dice: z.boolean().default(false),
      blackened_mirror: z.boolean().default(false),
      unnamed_book: z.boolean().default(false),
      ancient_scrolls: z.boolean().default(false),
      elder_scroll: z.boolean().default(false),
      ravens_orb: z.boolean().default(false),
      occultist_grimoire: z.boolean().default(false),
      shadow_flute: z.boolean().default(false),
      hollow_king_scepter: z.boolean().default(false),
      bloodstone: z.boolean().default(false),
      frostglass: z.boolean().default(false),
      tarnished_compass: z.boolean().default(false),
      sealed_chest: z.boolean().default(false),
      stonebinders_codex: z.boolean().default(false),
      chitin_plates: z.boolean().default(false),
    })
    .default({}),
  fellowship: z
    .object({
      restless_knight: z.boolean().default(false),
      elder_wizard: z.boolean().default(false),
      ashwraith_huntress: z.boolean().default(false),
      one_eyed_crow: z.boolean().default(false),
    })
    .default({}),
  blessings: z
    .object({
      dagons_gift: z.boolean().default(false),
      flames_touch: z.boolean().default(false),
      ravens_mark: z.boolean().default(false),
      ashen_embrace: z.boolean().default(false),
      dagons_gift_enhanced: z.boolean().default(false),
      flames_touch_enhanced: z.boolean().default(false),
      ravens_mark_enhanced: z.boolean().default(false),
      ashen_embrace_enhanced: z.boolean().default(false),
      forests_grace: z.boolean().default(false),
      sharp_aim: z.boolean().default(false),
      bell_blessing: z.boolean().default(false),
      fishers_hand: z.boolean().default(false),
    })
    .default({}),
  books: z
    .object({
      book_of_ascension: z.boolean().default(false),
      book_of_war: z.boolean().default(false),
      book_of_trials: z.boolean().default(false),
    })
    .default({}),
  buildings: z
    .object({
      woodenHut: z.number().default(0),
      stoneHut: z.number().default(0),
      longhouse: z.number().default(0),
      furTents: z.number().default(0),
      cabin: z.number().default(0),
      greatCabin: z.number().default(0),
      grandHunterLodge: z.number().default(0),
      timberMill: z.number().default(0),
      quarry: z.number().default(0),
      blacksmith: z.number().default(0),
      advancedBlacksmith: z.number().default(0),
      grandBlacksmith: z.number().default(0),
      foundry: z.number().default(0),
      primeFoundry: z.number().default(0),
      masterworkFoundry: z.number().default(0),
      tannery: z.number().default(0),
      masterTannery: z.number().default(0),
      highTannery: z.number().default(0),
      clerksHut: z.number().default(0),
      scriptorium: z.number().default(0),
      inkwardenAcademy: z.number().default(0),
      tradePost: z.number().default(0),
      grandBazaar: z.number().default(0),
      merchantsGuild: z.number().default(0),
      shallowPit: z.number().default(0),
      deepeningPit: z.number().default(0),
      deepPit: z.number().default(0),
      bottomlessPit: z.number().default(0),
      supplyHut: z.number().default(0),
      storehouse: z.number().default(0),
      fortifiedStorehouse: z.number().default(0),
      villageWarehouse: z.number().default(0),
      grandRepository: z.number().default(0),
      greatVault: z.number().default(0),
      alchemistHall: z.number().default(0),
      altar: z.number().default(0),
      shrine: z.number().default(0),
      temple: z.number().default(0),
      sanctum: z.number().default(0),
      bastion: z.number().default(0),
      watchtower: z.number().default(0),
      palisades: z.number().default(0),
      fortifiedMoat: z.number().default(0),
      wizardTower: z.number().default(0),
      traps: z.number().default(0),
      blackMonolith: z.number().default(0),
      boneTemple: z.number().default(0),
      pillarOfClarity: z.number().default(0),
      darkEstate: z.number().default(0),
      chitinPlating: z.number().default(0),
    })
    .default({}),
  villagers: z
    .object({
      free: z.number().min(0).default(0),
      hunter: z.number().min(0).default(0),
      gatherer: z.number().min(0).default(0),
      tanner: z.number().min(0).default(0),
      iron_miner: z.number().min(0).default(0),
      coal_miner: z.number().min(0).default(0),
      sulfur_miner: z.number().min(0).default(0),
      obsidian_miner: z.number().min(0).default(0),
      adamant_miner: z.number().min(0).default(0),
      moonstone_miner: z.number().min(0).default(0),
      steel_forger: z.number().min(0).default(0),
      blacksteel_forger: z.number().min(0).default(0),
      powder_maker: z.number().min(0).default(0),
      ashfire_dust_maker: z.number().min(0).default(0),
    })
    .default({}),
  story: z
    .object({
      seen: z.record(z.union([z.boolean(), z.number()])).default({}),
      merchantPurchases: z.number().default(0),
    })
    .default({ seen: {}, merchantPurchases: 0 }),
  hoveredTooltips: z.record(z.boolean()).default({}),
  damagedBuildings: z
    .object({
      bastion: z.boolean().default(false),
      watchtower: z.boolean().default(false),
      palisades: z.boolean().default(false),
    })
    .default({}),
  events: z
    .object({
      available: z.array(z.string()).default([]),
      active: z.array(z.string()).default([]),
      log: z.array(z.string()).default([]),
      whisperingVoices: z.boolean().default(false),
      shadowsMove: z.boolean().default(false),
      villagerStares: z.boolean().default(false),
      bloodInWater: z.boolean().default(false),
      facesInWalls: z.boolean().default(false),
      wrongVillagers: z.boolean().default(false),
      skinCrawling: z.boolean().default(false),
      creatureInHut: z.boolean().default(false),
      wrongReflections: z.boolean().default(false),
      villagersStareAtSky: z.boolean().default(false),
      monolithDemand: z.boolean().default(false),
      humanSacrificeDemand: z.boolean().default(false),
      cube01: z.boolean().default(false),
      cube02: z.boolean().default(false),
      cube03: z.boolean().default(false),
      cube04: z.boolean().default(false),
      cube05: z.boolean().default(false),
      cube06: z.boolean().default(false),
      cube07: z.boolean().default(false),
      cube08: z.boolean().default(false),
      cube09: z.boolean().default(false),
      cube10: z.boolean().default(false),
      cube11: z.boolean().default(false),
      cube13: z.boolean().default(false),
      cube14a: z.boolean().default(false),
      cube14b: z.boolean().default(false),
      cube14c: z.boolean().default(false),
      cube14d: z.boolean().default(false),
      cube15a: z.boolean().default(false),
      cube15b: z.boolean().default(false),
      slaughteredCreatures: z.boolean().default(false),
      communicatedWithCreatures: z.boolean().default(false),
      encounteredCreaturesChoice: z.boolean().default(false),
      // Riddle Events
      whispererInTheDark: z.boolean().default(false),
      whispererInTheDark_correct: z.boolean().default(false),
      riddleOfAges: z.boolean().default(false),
      riddleOfAges_correct: z.boolean().default(false),
      riddleOfDevourer: z.boolean().default(false),
      riddleOfDevourer_correct: z.boolean().default(false),
      riddleOfTears: z.boolean().default(false),
      riddleOfTears_correct: z.boolean().default(false),
      riddleOfEternal: z.boolean().default(false),
      riddleOfEternal_correct: z.boolean().default(false),
      whisperersReward: z.boolean().default(false),
      bloodiedAwakening: z.boolean().default(false),
      desperateAmputation: z.boolean().default(false),
      mercenaryDemand: z.boolean().default(false),
    })
    .default({}),
  effects: z
    .object({
      resource_bonus: z.record(z.string(), z.number()).default({}),
      resource_multiplier: z.record(z.string(), z.number()).default({}),
      probability_bonus: z.record(z.string(), z.number()).default({}),
      cooldown_reduction: z.record(z.string(), z.number()).default({}),
    })
    .default({}),
  bastion_stats: z
    .object({
      defense: z.number().min(0).default(0),
      attack: z.number().min(0).default(0),
      attackFromFortifications: z.number().min(0).default(0),
      attackFromStrength: z.number().min(0).default(0),
      integrity: z.number().min(0).default(0),
    })
    .default({}),
  log: z.array(logEntrySchema).default([]),
  current_population: z.number().min(0).default(0),
  total_population: z.number().min(0).default(0),
  templeDedicated: z.boolean().default(false),
  templeDedicatedTo: z.string().default(""),
  triggeredEvents: z.record(z.boolean()).default({}),
  eventCooldowns: z.record(z.number()).default({}), // Tracks last trigger time (timestamp) for each event
  feastState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
      lastAcceptedLevel: z.number().default(0),
    })
    .default({
      isActive: false,
      endTime: 0,
      lastAcceptedLevel: 0,
    }),
  boneDevourerState: z.object({
    lastAcceptedLevel: z.number().default(0),
  }).default({
    lastAcceptedLevel: 0,
  }),

  greatFeastState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
    })
    .default({
      isActive: false,
      endTime: 0,
    }),

  greatFeastActivations: z.number().default(0),

  miningBoostState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
    })
    .default({
      isActive: false,
      endTime: 0,
    }),

  combatSkills: z
    .object({
      crushingStrikeLevel: z.number().default(0),
      bloodflameSphereLevel: z.number().default(0),
    })
    .default({
      crushingStrikeLevel: 0,
      bloodflameSphereLevel: 0,
    }),

  activatedPurchases: z.record(z.boolean()).default({}),
  feastActivations: z.record(z.number()).default({}), // purchaseId -> activations remaining
  cruelMode: z.boolean().default(false), // Cruel mode flag
  CM: z.number().default(0), // Number of cruel mode games completed
  BTP: z.number().default(0), // Buy To Play mode (0 = normal, 1 = BTP active)
  attackWaveTimers: z.record(attackWaveTimerSchema).default({}),
  curseState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
    })
    .default({
      isActive: false,
      endTime: 0,
    }),
  frostfallState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
    })
    .default({
      isActive: false,
      endTime: 0,
    }),

  woodcutterState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
    })
    .default({ isActive: false, endTime: 0 }),

  fogState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
      duration: z.number().default(0),
    })
    .default({ isActive: false, endTime: 0, duration: 0 }),
  shopNotificationSeen: z.boolean().default(false), // Added new field for shop notification
  authNotificationSeen: z.boolean().default(false), // Added new field for auth notification
  authNotificationVisible: z.boolean().default(false), // Added new field for auth notification visibility
  mysteriousNoteShopNotificationSeen: z.boolean().default(false), // Track if mysterious note shop notification has been seen
  mysteriousNoteDonateNotificationSeen: z.boolean().default(false), // Track if mysterious note donate notification has been seen
  isUserSignedIn: z.boolean().default(false), // Track if user is currently signed in
  detectedCurrency: z.enum(["EUR", "USD"]).nullable().default(null), // Currency detection (persists across game restarts)
  playTime: z.number().default(0), // Track total play time in milliseconds
  lastResourceSnapshotTime: z.number().default(0).optional(),
  isNewGame: z.boolean().default(false), // Track if this is a newly started game
  startTime: z.number().default(0), // Timestamp when the current game was started
  allowPlayTimeOverwrite: z.boolean().default(false), // Allow overwriting higher playTime on next save (used for game restarts)
  hasMadeNonFreePurchase: z.boolean().default(false), // Track if player has made any non-free shop purchase
  referralCode: z.string().optional(), // Store the referral code used during signup
  referrals: z
    .array(
      z.object({
        userId: z.string(),
        claimed: z.boolean().default(false),
        timestamp: z.number(),
      }),
    )
    .default([]), // Track referrals with claim status
  referralCount: z.number().default(0), // Computed from referrals array length
  referredUsers: z.array(z.string()).default([]), // List of referred user IDs (computed from referrals)
  social_media_rewards: z
    .record(
      z.object({
        claimed: z.boolean().default(false),
        timestamp: z.number().optional(),
      }),
    )
    .default({}), // Track social media follow rewards by platform (e.g., 'instagram', 'twitter', etc.)
  timedEventTab: z
    .object({
      isActive: z.boolean().default(false),
      event: logEntrySchema.nullable().default(null),
      expiryTime: z.number().default(0),
      startTime: z.number().optional(),
    })
    .default({
      isActive: false,
      event: null,
      expiryTime: 0,
    }),
  sleepUpgrades: z
    .object({
      lengthLevel: z.number().default(0), // 0-5
      intensityLevel: z.number().default(0), // 0-5
    })
    .default({ lengthLevel: 0, intensityLevel: 0 }),
  focus: z.number().default(0), // Focus points accumulated from sleep
  totalFocusEarned: z.number().default(0), // Total focus earned across all sleep sessions
  focusState: z
    .object({
      isActive: z.boolean().default(false),
      endTime: z.number().default(0),
      startTime: z.number().default(0),
      duration: z.number().default(0),
    })
    .default({
      isActive: false,
      endTime: 0,
      startTime: 0,
      duration: 0,
    }),

  huntingSkills: z.object({
    level: z.number().default(0),
  }).default({ level: 0 }),

  crowsEyeSkills: z.object({
    level: z.number().default(0),
  }).default({ level: 0 }),

  tradeEstablishState: z.object({
    remainingOptions: z.array(z.string()).default(["mountain_monastery", "swamp_tribe", "shore_fishermen"]),
  }).default({ remainingOptions: ["mountain_monastery", "swamp_tribe", "shore_fishermen"] }),

  buttonUpgrades: z
    .object({
      caveExplore: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      mineStone: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      mineIron: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      mineCoal: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      mineSulfur: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      mineObsidian: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      mineAdamant: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      hunt: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
      chopWood: z
        .object({
          clicks: z.number().default(0),
          level: z.number().default(0),
        })
        .default({ clicks: 0, level: 0 }),
    })
    .default({
      caveExplore: { clicks: 0, level: 0 },
      mineStone: { clicks: 0, level: 0 },
      mineIron: { clicks: 0, level: 0 },
      mineCoal: { clicks: 0, level: 0 },
      mineSulfur: { clicks: 0, level: 0 },
      mineObsidian: { clicks: 0, level: 0 },
      mineAdamant: { clicks: 0, level: 0 },
      hunt: { clicks: 0, level: 0 },
      chopWood: { clicks: 0, level: 0 },
    }),
  // Analytics: Track button clicks since last save (not persisted to local storage)
  clickAnalytics: z.record(z.number()).default({}), // Track button clicks by button ID
  // Achievements
  unlockedAchievements: z.array(z.string()).default([]),
  claimedAchievements: z.array(z.string()).default([]), // Achievement segment IDs that have been claimed for silver
  username: z.string().optional(), // Player's chosen username for leaderboard
  cooldowns: z.record(z.number()).default({}), // Track current cooldown time remaining for each action
  // Merchant trades state (persisted when merchant is active)
  merchantTrades: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      cost: z.string(),
      buyResource: z.string(),
      buyAmount: z.number(),
      sellResource: z.string(),
      sellAmount: z.number(),
      executed: z.boolean(),
    })
  ).default([]),

  timedTabDuration: z.number().default(0),

  // Idle Mode state
  idleModeState: z.object({
    isActive: z.boolean().default(false),
    startTime: z.number().default(0),
    needsDisplay: z.boolean().default(false),
  }).default({
    isActive: false,
    startTime: 0,
    needsDisplay: false,
  }),
});

export type GameState = z.infer<typeof gameStateSchema>;

// Action schema for game rules
export const actionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  tooltipEffects: z
    .union([
      z.array(z.string()),
      z.function().args(z.any()).returns(z.array(z.string())),
    ])
    .optional(),
  building: z.boolean().optional(),
  category: z.enum(["crafting", "building"]).optional(),
  show_when: z
    .union([
      z.record(z.string(), z.any()),
      z.record(z.number(), z.record(z.string(), z.any())),
    ])
    .optional(),
  cost: z
    .union([
      z.record(z.string(), z.any()),
      z.record(z.number(), z.record(z.string(), z.any())),
    ])
    .optional(),
  effects: z.union([
    z.record(z.string(), z.any()),
    z.record(z.number(), z.record(z.string(), z.any())),
    z.function().args(z.any()).returns(z.record(z.string(), z.any())),
  ]),
  productionEffects: z
    .union([
      z.record(z.string(), z.record(z.string(), z.number())),
      z.function().args(z.any()).returns(z.record(z.string(), z.record(z.string(), z.number()))),
    ])
    .optional(),
  statsEffects: z.record(z.string(), z.number()).optional(),
  unlocks: z.array(z.string()).optional(),
  craftingCostReduction: z.number().optional(),
  buildingCostReduction: z.number().optional(),
  success_chance: z.function().args(z.any()).returns(z.number()).optional(),
  relevant_stats: z
    .array(z.enum(["strength", "knowledge", "luck", "madness"]))
    .optional(),
  cooldown: z.number().optional(),
  actionBonuses: z.record(z.string(), z.object({
    resourceMultiplier: z.number().optional(),
    resourceBonus: z.record(z.string(), z.number()).optional(),
    cooldownReduction: z.number().optional(),
    probabilityBonus: z.record(z.string(), z.number()).optional(),
  })).optional(),
  upgrade_key: z.string().optional(),
  canExecute: z.function().args(z.any()).returns(z.boolean()).optional(),
});

export type Action = z.infer<typeof actionSchema>;

// Save data schema
export const saveDataSchema = z.object({
  gameState: gameStateSchema,
  timestamp: z.number(),
  playTime: z.number().default(0),
});

export type SaveData = z.infer<typeof saveDataSchema>;