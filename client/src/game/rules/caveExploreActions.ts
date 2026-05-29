import { Action, GameState } from "@shared/schema";
import { ActionResult } from "@/game/actions";
import { applyActionEffects } from "./actionEffects";
import { gameEvents, LogEntry } from "./events";
import { logger } from "../../lib/logger";
import { isPlaylightReferralUrl } from "@/lib/playlight";
import { PLAYLIGHT_WELCOME_GOLD } from "@/game/playlightRewards";
import { buildLocalizedEventLogEntry } from "@/i18n/buildEventLogEntry";
import {
  getActionLogMessage,
  resolveInheritedActionLogMessage,
} from "@/i18n/resolveGameText";
import { getTotalMadness } from "./effectsCalculation";

const CAVE_FIRST_VISIT_LOG_FALLBACKS: Record<string, Record<string, string>> = {
  lightFire: {
    firstVisit:
      "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.",
    firstVisitBoost:
      "The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting. Someone left you a gift.",
  },
  chopWood: {
    firstVisit:
      "Some wood lies scattered near the cave's entrance. It might prove useful.",
  },
  exploreCave: {
    firstVisit:
      "The torchlight illuminates the cave walls. In the flickering light, you notice a path leading deeper into the caves.",
  },
  ventureDeeper: {
    firstVisit:
      "The air grows colder as you descend the path deeper into the cave. The walls around you seem unnaturally smooth, as if shaped by someone.",
  },
  descendFurther: {
    firstVisit:
      "With the lantern casting a steady glow, you descend even deeper. Suddenly your feet touch manmade stone steps, worn by time.",
  },
  exploreRuins: {
    firstVisit:
      "At the end of the stairs, a vast cavern opens before you. In the dark lie the ruins of a lost city, the remains of a civilization long gone.",
  },
  exploreTemple: {
    firstVisit:
      "As you delve deeper into the ruins of the underground city, a grand temple emerges from the cavern floor, mostly intact, its shadow stretching over the forgotten remnants of the city.",
  },
  exploreCitadel: {
    firstVisit:
      "At the deepest part of the city, a massive citadel rises before you. Its size suggests it houses something of great power, or something of great danger.",
  },
};

const CAVE_EXPLORE_LOG_FALLBACKS: Record<string, string> = {
  blastPortal:
    "The ember bombs detonate in a bright flash of fire and light. The ancient gate cracks and crumbles. Whatever could have been sealed within has been released. The city should get ready for whatever comes out of there.",
  lowChamber:
    "Using the reinforced rope, you descend into the low chamber. Amongst the treasures you find a mastermason's chisel, a tool of legendary craftsmanship.",
  occultistChamber:
    "Following the occultist's map, you find the chamber containing his treasures. Amongst them is his grimoire, filled with forbidden knowledge and arcane secrets.",
  exploreUndergroundLake:
    "Using the skull lantern's grim glow, you descend to the underground lake and build a small boat. On a tiny island in the middle of the dark lake, forgotten treasures lie in shadow, untouched for ages.",
  lureLakeCreature:
    "You set a massive trap at the edge of the underground lake, baited with piles of meat. Hours pass before the black waters erupt, and a titanic, tentacled horror rises from the depths and crawls into the trap.",
  hiddenLibrary:
    "The monastery's map leads you deep into the cave to the hidden library where you find a codex.",
};

function pushCaveExploreLog(
  result: ActionResult,
  actionId: string,
  idPrefix: string,
): void {
  const fallback = CAVE_EXPLORE_LOG_FALLBACKS[actionId] ?? "";
  result.logEntries!.push({
    id: `${idPrefix}-${Date.now()}`,
    message: getActionLogMessage(actionId, "complete", fallback),
    timestamp: Date.now(),
    type: "system",
  });
}

function pushFirstVisitLog(
  result: ActionResult,
  actionId: string,
  logKey: string,
  idPrefix: string,
): void {
  const fallback = CAVE_FIRST_VISIT_LOG_FALLBACKS[actionId]?.[logKey] ?? "";
  result.logEntries!.push({
    id: `${idPrefix}-${Date.now()}`,
    message: getActionLogMessage(actionId, logKey, fallback),
    timestamp: Date.now(),
    type: "system",
  });
}

const CAVE_LOOT_LOG_FALLBACKS: Record<string, Record<string, string>> = {
  exploreCave: {
    debrisScroll:
      "Among the debris you uncover a timeworn scroll containing wisdom for enduring this unforgiving world.",
    torchBag: "You find an old, dusty bag with 25 Torches in the cave.",
  },
  ventureDeeper: {
    tarnishedAmulet:
      "In the cave's shadows, something glints. You find a Tarnished Amulet.",
    silverSack: "You find a small leather sack containing 50 Silver.",
    mapFragment: "On the cave floor you find a tattered fragment of a map.",
  },
};

type ActionLogMessageRef = {
  actionId: string;
  logKey: string;
  vars?: Record<string, string | number>;
};

function appendActionLogMessages(
  logMessages: Array<string | ActionLogMessageRef | LogEntry>,
  result: ActionResult,
): void {
  logMessages.forEach((message) => {
    if (typeof message === "string") {
      if (!message.trim()) return;
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message,
        timestamp: Date.now(),
        type: "system",
      });
    } else if (
      message &&
      typeof message === "object" &&
      "logKey" in message &&
      "actionId" in message
    ) {
      const ref = message as ActionLogMessageRef;
      const resolved = resolveInheritedActionLogMessage(
        ref.actionId,
        ref.logKey,
        CAVE_LOOT_LOG_FALLBACKS,
        ref.vars,
      );
      if (!resolved.trim()) return;
      result.logEntries!.push({
        id: `probability-effect-${Date.now()}-${Math.random()}`,
        message: resolved,
        timestamp: Date.now(),
        type: "system",
      });
    } else if (
      message &&
      typeof message === "object" &&
      (message as LogEntry).type === "event"
    ) {
      result.logEntries!.push(message as LogEntry);
    }
  });
}

// Helper function to process triggered events from action effects
function processTriggeredEvents(
  effectUpdates: any,
  result: ActionResult,
  state: GameState,
): void {
  if (
    effectUpdates.triggeredEvents &&
    effectUpdates.triggeredEvents.length > 0
  ) {
    logger.log(
      `[CAVE EXPLORE] Processing triggered events:`,
      effectUpdates.triggeredEvents,
    );

    effectUpdates.triggeredEvents.forEach((eventId: string) => {
      // Prevent event from happening again if it's already been triggered
      if (state.triggeredEvents?.[eventId]) {
        logger.log(
          `[CAVE EXPLORE] Skipping already triggered event: ${eventId}`,
        );
        return;
      }

      const eventDef = gameEvents[eventId];
      if (eventDef) {
        logger.log(`[CAVE EXPLORE] Found event definition for: ${eventId}`, {
          title: eventDef.title,
          hasChoices: !!eventDef.choices,
        });

        // Mark as triggered in state updates
        if (!effectUpdates.triggeredEventsState)
          effectUpdates.triggeredEventsState = {};
        effectUpdates.triggeredEventsState[eventId] = true;

        const logEntry: LogEntry = buildLocalizedEventLogEntry(
          eventId,
          eventDef,
          state,
        );

        result.logEntries!.push(logEntry);
      } else {
        logger.warn(`[CAVE EXPLORE] No event definition found for: ${eventId}`);
      }
    });

    // Merge triggered events state into main state updates
    if (effectUpdates.triggeredEventsState) {
      effectUpdates.triggeredEvents = {
        ...(state.triggeredEvents || {}),
        ...effectUpdates.triggeredEventsState,
      };
      delete effectUpdates.triggeredEventsState;
    } else {
      delete effectUpdates.triggeredEvents;
    }
  }
}

// Base items for each cave exploration stage
const caveItems = {
  exploreCave: [
    {
      key: "survivors_notes",
      probability: 0.2,
      logMessageKey: "debrisScroll",
      category: "relics",
      condition: "!books.book_of_trials",
    },
    {
      key: "torch",
      probability: 0.35,
      value: 25,
      logMessageKey: "torchBag",
      category: "resources",
      stageOnly: true, // Only on Explore Cave, not inherited to later stages
      condition: "!story.seen.torchBagFound",
      alsoSet: { "story.seen.torchBagFound": true },
    },
  ],
  ventureDeeper: [
    {
      key: "tarnished_amulet",
      probability: 0.005,
      logMessageKey: "tarnishedAmulet",
      category: "clothing",
    },
    {
      key: "bloodstained_belt",
      probability: 0.01,
      isChoice: true,
      eventId: "bloodstainedBeltChoice",
      category: "clothing",
    },
    {
      key: "silver",
      probability: 0.25,
      value: 50,
      logMessageKey: "silverSack",
      category: "resources",
      condition: "!story.seen.silverSackFound",
      alsoSet: { "story.seen.silverSackFound": true },
      stageOnly: true, // Only on Venture Deeper, not inherited to later stages
    },
    {
      key: "mapFragmentCaveFound",
      probability: 0.005,
      category: "story",
      condition:
        "!story.seen.mapFragmentCaveFound && !story.seen.swampMapAssembled",
      logMessageKey: "mapFragment",
    },
    {
      key: "clarity_elixir",
      probability: 0.01,
      category: "consumable",
      isChoice: true,
      eventId: "clarityElixirCaveFoundVentureDeeper",
      seenKey: "clarityElixirFoundVentureDeeper",
      minMadness: 2,
    },
  ],
  descendFurther: [
    {
      key: "bone_dice",
      probability: 0.015,
      isChoice: true,
      eventId: "boneDiceChoice",
      category: "relics",
    },
    {
      key: "clarity_elixir",
      probability: 0.01,
      category: "consumable",
      isChoice: true,
      eventId: "clarityElixirCaveFoundDescendFurther",
      seenKey: "clarityElixirFoundDescendFurther",
      minMadness: 2,
    },
  ],
  exploreRuins: [
    {
      key: "ring_of_drowned",
      probability: 0.02,
      isChoice: true,
      eventId: "ringOfDrownedChoice",
      category: "clothing",
    },
    {
      key: "clarity_elixir",
      probability: 0.01,
      category: "consumable",
      isChoice: true,
      eventId: "clarityElixirCaveFoundExploreRuins",
      seenKey: "clarityElixirFoundExploreRuins",
      minMadness: 2,
    },
  ],
  exploreTemple: [
    {
      key: "shadow_flute",
      probability: 0.025,
      isChoice: true,
      eventId: "shadowFluteChoice",
      category: "relics",
    },
  ],
  exploreCitadel: [
    {
      key: "hollow_king_scepter",
      probability: 0.03,
      isChoice: true,
      eventId: "hollowKingScepterChoice",
      category: "relics",
    },
  ],
};

/** Items only drop when user has explored the cave before (not on first click). */
function requireCaveExplored(
  baseCondition: string | ((s: GameState) => boolean) | undefined,
): (state: GameState) => boolean {
  return (state: GameState) => {
    if (!state.story?.seen?.caveExplored) return false;
    if (!baseCondition) return true;
    if (typeof baseCondition === "function") return baseCondition(state);
    // Simple path check: !path means path must be falsy
    const isNegated = baseCondition.startsWith("!");
    const path = isNegated ? baseCondition.slice(1) : baseCondition;
    const parts = path.split(".");
    let cur: unknown = state;
    for (const p of parts) {
      cur = (cur as Record<string, unknown>)?.[p];
      if (cur === undefined) return isNegated;
    }
    return isNegated ? !cur : !!cur;
  };
}

// Helper function to get inherited items with 10% probability bonus
function getInheritedItems(actionId: string) {
  const stageOrder = [
    "exploreCave",
    "ventureDeeper",
    "descendFurther",
    "exploreRuins",
    "exploreTemple",
    "exploreCitadel",
  ];
  const currentIndex = stageOrder.indexOf(actionId);

  const inheritedItems: any = {};
  const isExploreCaveStage = actionId === "exploreCave";

  // Add items from all previous stages with 0.5% probability bonus
  for (let i = 0; i <= currentIndex; i++) {
    const stageId = stageOrder[i];
    const items = caveItems[stageId as keyof typeof caveItems];

    items.forEach((item) => {
      // stageOnly items (e.g. torch bag, silver sack) only apply on their own stage
      if ("stageOnly" in item && item.stageOnly && i !== currentIndex) return;
      const adjustedProbability =
        i === currentIndex
          ? item.probability
          : item.probability + 0.005 * (currentIndex - i);

      // Determine the category (relics, clothing, or resources)
      const category = item.category || "relics";

      if (category === "resources") {
        // Resource bonus: add to resources (e.g. silver sack, torch bag)
        const baseCondition =
          "condition" in item && typeof item.condition === "string"
            ? item.condition
            : undefined;
        inheritedItems[`_resource_${item.key}`] = {
          probability: Math.min(adjustedProbability, 1.0),
          value: (item as { value?: number }).value,
          addTo: `resources.${item.key}`,
          logMessage: (item as { logMessage?: string }).logMessage,
          ...(isExploreCaveStage
            ? { condition: requireCaveExplored(baseCondition) }
            : baseCondition && { condition: baseCondition }),
          ...("alsoSet" in item && item.alsoSet && { alsoSet: item.alsoSet }),
        };
      } else if (category === "story") {
        const itemKey = item.key as string;
        const baseCondition =
          "condition" in item && typeof item.condition === "string"
            ? item.condition
            : undefined;
        const fullPath = `story.seen.${itemKey}`;
        inheritedItems[fullPath] = {
          probability: Math.min(adjustedProbability, 1.0),
          value: true,
          ...(isExploreCaveStage
            ? { condition: requireCaveExplored(baseCondition) }
            : baseCondition && { condition: baseCondition }),
          ...((item as { logMessageKey?: string }).logMessageKey && {
            logMessageKey: (item as { logMessageKey: string }).logMessageKey,
          }),
        };
      } else if (category === "consumable") {
        const seenKey = (item as { seenKey?: string }).seenKey;
        const minMadness = (item as { minMadness?: number }).minMadness ?? 0;
        const isChoiceItem = "isChoice" in item && item.isChoice;
        inheritedItems[`_consumable_${item.key}_${stageId}`] = {
          probability: Math.min(adjustedProbability, 1.0),
          value: true,
          condition: (s: GameState) => {
            if (minMadness > 0 && getTotalMadness(s) < minMadness) return false;
            if (seenKey && s.story?.seen?.[seenKey]) return false;
            return true;
          },
          ...(isChoiceItem && {
            isChoice: true,
            eventId: (item as { eventId: string }).eventId,
          }),
          ...(!isChoiceItem && {
            madnessDelta:
              (item as { madnessDelta?: number }).madnessDelta ?? -2,
            ...(seenKey && {
              alsoSet: { [`story.seen.${seenKey}`]: true },
            }),
            ...((item as { logMessageKey?: string }).logMessageKey && {
              logMessageKey: (item as { logMessageKey: string }).logMessageKey,
            }),
          }),
        };
      } else {
        // Clothing/relic: boolean item
        const basePath = `!${category}.${item.key}`;
        const eventPart =
          "eventId" in item && item.eventId
            ? ` && !story.seen.${item.eventId}`
            : "";
        const itemCondition =
          "condition" in item &&
            typeof (item as { condition?: string }).condition === "string"
            ? (item as { condition: string }).condition
            : undefined;
        const baseCondition =
          itemCondition != null
            ? (state: GameState) => {
              const cat = (state as Record<string, unknown>)[category];
              if (
                cat &&
                typeof cat === "object" &&
                (cat as Record<string, unknown>)[item.key]
              )
                return false;
              if (
                "eventId" in item &&
                item.eventId &&
                state.story?.seen?.[item.eventId]
              )
                return false;
              const isNegated = itemCondition.startsWith("!");
              const path = isNegated ? itemCondition.slice(1) : itemCondition;
              const parts = path.split(".");
              let cur: unknown = state;
              for (const p of parts) {
                cur = (cur as Record<string, unknown>)?.[p];
                if (cur === undefined) return isNegated;
              }
              return isNegated ? !cur : !!cur;
            }
            : basePath + eventPart;
        inheritedItems[`${category}.${item.key}`] = {
          probability: Math.min(adjustedProbability, 1.0),
          value: true,
          condition: isExploreCaveStage
            ? requireCaveExplored(baseCondition)
            : baseCondition,
          ...("isChoice" in item &&
            item.isChoice && { isChoice: item.isChoice }),
          ...("eventId" in item && item.eventId && { eventId: item.eventId }),
          ...((item as { logMessageKey?: string }).logMessageKey && {
            logMessageKey: (item as { logMessageKey: string }).logMessageKey,
          }),
        };
      }
    });
  }

  return inheritedItems;
}

export const caveExploreActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    show_when: {},
    cost: {},
    effects: {
      "story.seen.fireLit": true,
    },
    cooldown: 1,
  },

  chopWood: {
    id: "chopWood",
    label: "Gather Wood",
    minVillagers: 0,
    show_when: {},
    cost: {},
    effects: (state: GameState) => {
      const woodAmount = state.BTP === 1 ? "random(6,14)" : "random(6,12)";
      return {
        "resources.wood": woodAmount,
        "story.seen.hasWood": true,
        "story.seen.firstWoodGathered": true,
        "resources.veinroot": {
          probability: 0.005,
          condition: "story.seen.veinrootDiscovered",
          value: 1,
        },
      };
    },
    executionTime: 4,
    cooldown: 0,
    upgrade_key: "chopWood",
  },

  exploreCave: {
    id: "exploreCave",
    label: "Explore Cave",
    show_when: {
      "story.seen.actionCraftTorch": true,
      "buildings.blacksmith": 0,
    },
    cost: {
      "resources.torch": 2,
    },
    effects: {
      "resources.wood": "random(5,10)",
      "resources.stone": "random(3,7)",
      "resources.coal": "random(3,7)",
      "resources.iron": "random(3,7)",
      ...getInheritedItems("exploreCave"),
      "story.seen.hasStone": true,
      "story.seen.caveExplored": true,
    },
    cooldown: 0,
    executionTime: 7.5, // 5 + 0*5 (exploreCave is first/level 0)
    upgrade_key: "exploreCave",
  },

  ventureDeeper: {
    id: "ventureDeeper",
    label: "Venture Deeper",
    show_when: {
      "buildings.blacksmith": 1,
      "tools.iron_lantern": false,
    },
    cost: {
      "resources.torch": 5,
      "resources.food": 25,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.stone": "random(4,8)",
        "resources.coal": "random(4,8)",
        "resources.iron": "random(4,8)",
        "resources.sulfur": "random(4,8)",
        "resources.silver": `random(2,${4 * multiplier})`,
        ...getInheritedItems("ventureDeeper"),
        "story.seen.venturedDeeper": true,
      };
    },
    cooldown: 0,
    executionTime: 15, // 5 + 1*5 (ventureDeeper is second/level 1)
    upgrade_key: "ventureDeeper",
  },

  descendFurther: {
    id: "descendFurther",
    label: "Descend Further",
    expeditionVillagersRequired: () => 2,
    show_when: {
      "tools.iron_lantern": true,
      "tools.steel_lantern": false,
    },
    cost: {
      "resources.food": 50,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.stone": "random(5,10)",
        "resources.coal": "random(5,10)",
        "resources.iron": "random(5,10)",
        "resources.obsidian": "random(0,2)",
        "resources.silver": `random(2,${6 * multiplier})`,
        ...getInheritedItems("descendFurther"),
        "story.seen.descendedFurther": true,
      };
    },
    cooldown: 0,
    executionTime: 20, // 5 + 2*5 (descendFurther is third/level 2)
    upgrade_key: "descendFurther",
  },

  exploreRuins: {
    id: "exploreRuins",
    label: "Explore Ruins",
    expeditionVillagersRequired: () => 3,
    show_when: {
      "tools.steel_lantern": true,
      "tools.obsidian_lantern": false,
    },
    cost: {
      "resources.food": 100,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.obsidian": "random(1,4)",
        "resources.adamant": "random(0,2)",
        "resources.silver": `random(2,${8 * multiplier})`,
        "resources.gold": `random(2,${4 * multiplier})`,
        ...getInheritedItems("exploreRuins"),
        "story.seen.exploredRuins": true,
      };
    },
    cooldown: 0,
    executionTime: 25, // 5 + 3*5 (exploreRuins is fourth/level 3)
    upgrade_key: "exploreRuins",
  },

  exploreTemple: {
    id: "exploreTemple",
    label: "Explore Temple",
    expeditionVillagersRequired: () => 4,
    show_when: {
      "tools.obsidian_lantern": true,
      "tools.adamant_lantern": false,
    },
    cost: {
      "resources.food": 500,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.obsidian": "random(1,6)",
        "resources.adamant": "random(1,4)",
        "resources.moonstone": "random(0,1)",
        "resources.silver": `random(2,${10 * multiplier})`,
        "resources.gold": `random(2,${6 * multiplier})`,

        ...getInheritedItems("exploreTemple"),
        "story.seen.exploredTemple": true,
      };
    },
    cooldown: 0,
    executionTime: 30, // 5 + 4*5 (exploreTemple is fifth/level 4)
    upgrade_key: "exploreTemple",
  },

  exploreCitadel: {
    id: "exploreCitadel",
    label: "Explore Citadel",
    expeditionVillagersRequired: () => 5,
    show_when: {
      "tools.adamant_lantern": true,
    },
    cost: {
      "resources.food": 750,
    },
    effects: (state: GameState) => {
      const multiplier = state.BTP === 1 ? 2 : 1;
      return {
        "resources.obsidian": "random(1,8)",
        "resources.adamant": "random(1,6)",
        "resources.moonstone": "random(0,2)",
        "resources.silver": `random(4,${14 * multiplier})`,
        "resources.gold": `random(2,${8 * multiplier})`,
        ...getInheritedItems("exploreCitadel"),
        "story.seen.exploredCitadel": true,
      };
    },
    cooldown: 0,
    executionTime: 35, // 5 + 5*5 (exploreCitadel is sixth/level 5)
    upgrade_key: "exploreCitadel",
  },

  lowChamber: {
    id: "lowChamber",
    label: "Low Chamber",
    expeditionVillagersRequired: () => 6,
    show_when: {
      "tools.reinforced_rope": true,
      "story.seen.lowChamberExplored": false,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: (state: GameState) => {
      const silverBonus = state.BTP === 1 ? 150 : 1;
      const goldBonus = state.BTP === 1 ? 100 : 0;
      return {
        "resources.silver": 250 + silverBonus,
        "resources.gold": 50 + goldBonus,
        "resources.obsidian": 50,
        "resources.adamant": 50,
        "tools.mastermason_chisel": true,
        "story.seen.lowChamberExplored": true,
      };
    },
    executionTime: 60,
    cooldown: 0,
  },

  occultistChamber: {
    id: "occultistChamber",
    label: "Occultist Chamber",
    expeditionVillagersRequired: () => 6,
    show_when: {
      "tools.occultist_map": true,
      "story.seen.occultistChamberExplored": false,
    },
    cost: {
      "resources.food": 1000,
    },
    effects: (state: GameState) => {
      const goldBonus = state.BTP === 1 ? 150 : 0;
      return {
        "resources.gold": 150 + goldBonus,
        "resources.obsidian": 75,
        "resources.adamant": 50,
        "resources.moonstone": 25,
        "relics.occultist_grimoire": true,
        "story.seen.occultistChamberExplored": true,
      };
    },
    executionTime: 60,
    cooldown: 0,
  },

  hiddenLibrary: {
    id: "hiddenLibrary",
    label: "Hidden Library",
    expeditionVillagersRequired: () => 6,
    show_when: {
      "tools.hidden_library_map": true,
      "story.seen.hiddenLibraryExplored": false,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: (state: GameState) => {
      const goldBonus = state.BTP === 1 ? 100 : 0;
      return {
        "resources.gold": 100 + goldBonus,
        "relics.stonebinders_codex": true,
        "story.seen.hiddenLibraryExplored": true,
      };
    },
    executionTime: 60,
    cooldown: 0,
  },

  exploreUndergroundLake: {
    id: "exploreUndergroundLake",
    label: "Underground Lake",
    expeditionVillagersRequired: () => 6,
    show_when: {
      "story.seen.undergroundLakeDiscovered": true,
      "story.seen.undergroundLakeExplored": false,
    },
    cost: {
      "resources.food": 2500,
      "resources.wood": 5000,
      "resources.iron": 500,
    },
    effects: (state: GameState) => {
      const goldBonus = state.BTP === 1 ? 100 : 0;
      return {
        "resources.silver": 500,
        "resources.gold": 100 + goldBonus,
        "resources.obsidian": 150,
        "resources.adamant": 100,
        "resources.moonstone": 25,
        "story.seen.undergroundLakeExplored": true,
      };
    },
    executionTime: 60,
    cooldown: 0,
  },

  lureLakeCreature: {
    id: "lureLakeCreature",
    label: "Place Trap",
    expeditionVillagersRequired: () => 6,
    show_when: {
      "story.seen.undergroundLakeCreatureDiscovered": true,
      "story.seen.lakeCreatureLured": false,
    },
    cost: {
      "resources.food": 10000,
      "resources.wood": 5000,
      "resources.steel": 1000,
    },
    effects: {
      "story.seen.lakeCreatureLured": true,
    },
    executionTime: 60,
    cooldown: 0,
  },

  blastPortal: {
    id: "blastPortal",
    label: "Blast Gate",
    show_when: {
      "story.seen.portalDiscovered": true,
      "story.seen.portalBlasted": false,
    },
    cost: {
      "resources.ember_bomb": 10,
    },
    effects: {
      "resources.ember_bomb": -10,
      "story.seen.portalBlasted": true,
    },
    executionTime: 1,
    cooldown: 0,
  },

  encounterBeyondPortal: {
    id: "encounterBeyondPortal",
    label: "Venture beyond Gate",
    expeditionVillagersRequired: () => 6,
    show_when: {
      "story.seen.portalBlasted": true,
      "story.seen.beyondGateVentureUnlocked": true,
      "story.seen.encounteredBeyondPortal": false,
    },
    cost: {
      "resources.food": 2500,
    },
    effects: {
      "story.seen.encounteredBeyondPortal": true,
    },
    executionTime: 30,
    cooldown: 0,
  },
};

// Action handlers
export function handleLightFire(
  state: GameState,
  result: ActionResult,
): ActionResult {
  result.stateUpdates.flags = { ...state.flags, gameStarted: true };
  result.stateUpdates.story = {
    ...state.story,
    seen: {
      ...state.story.seen,
      ...(result.stateUpdates.story?.seen || {}),
      fireLit: true,
    },
  };

  // Apply boost mode resources if active
  if (state.boostMode) {
    result.stateUpdates.resources = {
      ...state.resources,
      wood: (state.resources.wood || 0) + 5000,
      stone: (state.resources.stone || 0) + 5000,
      food: (state.resources.food || 0) + 2000,
      torch: (state.resources.torch || 0) + 100,
      iron: (state.resources.iron || 0) + 1000,
      steel: (state.resources.steel || 0) + 500,
      gold: (state.resources.gold || 0) + 10000,
    };
  }

  const playlightNewMember =
    isPlaylightReferralUrl() &&
    state.story.seen.playlightMemberGoldGranted !== true;

  if (playlightNewMember) {
    const mergedRes = result.stateUpdates.resources
      ? { ...state.resources, ...result.stateUpdates.resources }
      : { ...state.resources };

    result.stateUpdates.resources = {
      ...mergedRes,
      gold: (mergedRes.gold ?? 0) + PLAYLIGHT_WELCOME_GOLD,
    };

    const seenExtra: Record<string, boolean | number> = {
      playlightMemberGoldGranted: true,
    };
    if (!state.hasMadeNonFreePurchase) {
      seenExtra.playlightFirstPurchaseDiscountActive = true;
    }

    result.stateUpdates.story = {
      ...(result.stateUpdates.story || state.story),
      seen: {
        ...(result.stateUpdates.story?.seen || {}),
        ...seenExtra,
      },
    };

    result.delayedEffects!.push(() => {
      void import("@/game/state").then(({ useGameStore }) => {
        useGameStore.setState({ playlightWelcomeDialogOpen: true });
      });
    });
  }

  pushFirstVisitLog(
    result,
    "lightFire",
    state.boostMode ? "firstVisitBoost" : "firstVisit",
    "fire-lit",
  );

  return result;
}

export function handleChopWood(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("chopWood", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Add message for first time gathering wood
  if (!state.story.seen.firstWoodGathered) {
    pushFirstVisitLog(result, "chopWood", "firstVisit", "first-wood-gather");
  }

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCave(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreCave", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for first time exploring the cave
  if (!state.story.seen.caveExplored) {
    pushFirstVisitLog(result, "exploreCave", "firstVisit", "explore-cave");
  }

  // Increment cave explore count for basic achievements
  effectUpdates.story = {
    ...state.story,
    ...effectUpdates.story,
    seen: {
      ...state.story?.seen,
      ...(effectUpdates.story as { seen?: Record<string, unknown> })?.seen,
      caveExploreCount: (Number(state.story?.seen?.caveExploreCount) || 0) + 1,
    },
  };

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleVentureDeeper(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("ventureDeeper", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for venturing deeper
  if (!state.story.seen.venturedDeeper) {
    pushFirstVisitLog(result, "ventureDeeper", "firstVisit", "venture-deeper");
  }

  // Increment cave explore count for basic achievements
  effectUpdates.story = {
    ...state.story,
    ...effectUpdates.story,
    seen: {
      ...state.story?.seen,
      ...(effectUpdates.story as { seen?: Record<string, unknown> })?.seen,
      caveExploreCount: (Number(state.story?.seen?.caveExploreCount) || 0) + 1,
    },
  };

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleDescendFurther(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("descendFurther", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for descending further
  if (!state.story.seen.descendedFurther) {
    pushFirstVisitLog(
      result,
      "descendFurther",
      "firstVisit",
      "descend-further",
    );
  }

  // Increment cave explore count for basic achievements
  effectUpdates.story = {
    ...state.story,
    ...effectUpdates.story,
    seen: {
      ...state.story?.seen,
      ...(effectUpdates.story as { seen?: Record<string, unknown> })?.seen,
      caveExploreCount: (Number(state.story?.seen?.caveExploreCount) || 0) + 1,
    },
  };

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreRuins(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreRuins", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for exploring ruins
  if (!state.story.seen.exploredRuins) {
    pushFirstVisitLog(result, "exploreRuins", "firstVisit", "explore-ruins");
  }

  // Increment cave explore count for basic achievements
  effectUpdates.story = {
    ...state.story,
    ...effectUpdates.story,
    seen: {
      ...state.story?.seen,
      ...(effectUpdates.story as { seen?: Record<string, unknown> })?.seen,
      caveExploreCount: (Number(state.story?.seen?.caveExploreCount) || 0) + 1,
    },
  };

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreTemple(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreTemple", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for exploring temple
  if (!state.story.seen.exploredTemple) {
    pushFirstVisitLog(result, "exploreTemple", "firstVisit", "explore-temple");
  }

  // Increment cave explore count for basic achievements
  effectUpdates.story = {
    ...state.story,
    ...effectUpdates.story,
    seen: {
      ...state.story?.seen,
      ...(effectUpdates.story as { seen?: Record<string, unknown> })?.seen,
      caveExploreCount: (Number(state.story?.seen?.caveExploreCount) || 0) + 1,
    },
  };

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreCitadel(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreCitadel", state);

  // Handle any log messages from probability effects
  if (effectUpdates.logMessages) {
    appendActionLogMessages(effectUpdates.logMessages, result);
    delete effectUpdates.logMessages;
  }

  // Process triggered events (cave choice events)
  processTriggeredEvents(effectUpdates, result, state);

  // Add a special log message for exploring citadel
  if (!state.story.seen.exploredCitadel) {
    pushFirstVisitLog(
      result,
      "exploreCitadel",
      "firstVisit",
      "explore-citadel",
    );
  }

  // Increment cave explore count for basic achievements
  effectUpdates.story = {
    ...state.story,
    ...effectUpdates.story,
    seen: {
      ...state.story?.seen,
      ...(effectUpdates.story as { seen?: Record<string, unknown> })?.seen,
      caveExploreCount: (Number(state.story?.seen?.caveExploreCount) || 0) + 1,
    },
  };

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleLowChamber(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("lowChamber", state);

  pushCaveExploreLog(result, "lowChamber", "low-chamber-explored");

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleoccultistChamber(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("occultistChamber", state);

  pushCaveExploreLog(result, "occultistChamber", "occultist-chamber-explored");

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleBlastPortal(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("blastPortal", state);

  pushCaveExploreLog(result, "blastPortal", "portal-blasted");

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleEncounterBeyondPortal(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("encounterBeyondPortal", state);

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleExploreUndergroundLake(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("exploreUndergroundLake", state);

  pushCaveExploreLog(
    result,
    "exploreUndergroundLake",
    "underground-lake-explored",
  );

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleLureLakeCreature(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("lureLakeCreature", state);

  pushCaveExploreLog(result, "lureLakeCreature", "lake-creature-lured");

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}

export function handleHiddenLibrary(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const effectUpdates = applyActionEffects("hiddenLibrary", state);

  pushCaveExploreLog(result, "hiddenLibrary", "hidden-library-explored");

  Object.assign(result.stateUpdates, effectUpdates);
  return result;
}
