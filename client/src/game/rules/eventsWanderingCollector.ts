import type { GameEvent, EventChoice, LogEntry } from "./eventTypes";
import type { GameState } from "@shared/schema";
import {
  getClothingOrRelicEffectName,
  getEffectName,
} from "@/i18n/resolveGameText";
import { weaponEffects } from "./effects";
import { isGameStoryCompleted } from "./eventsAttackWaves";
import {
  COLLECTOR_MAX_OFFERS,
  clearCollectorItemRejectedInSeen,
  getCollectorItemCategory,
  getOwnedCollectorItems,
  getRejectedCollectorItems,
  selectCollectorOfferItems,
} from "./collectorRejectedItems";

const COLLECTOR_BUY_BASE_REWARD = 100;
const COLLECTOR_BUY_REWARD_STEP = 50;
const COLLECTOR_SELL_BASE_COST = 200;
const COLLECTOR_SELL_COST_STEP = 100;
export const COLLECTOR_MAX_VISITS = 7;

/** Fixed gold price when the collector resells the leatherbound book after a Chainmaster sell. */
export const LEATHERBOUND_BOOK_RESELL_GOLD = 1000;
export const LEATHERBOUND_BOOK_ITEM_ID = "leatherbound_book";
export const LEATHERBOUND_BOOK_BUY_CHOICE_ID = `buy_${LEATHERBOUND_BOOK_ITEM_ID}`;
/** Madness granted when buying the book teaches Chainmaster secrets. */
export const LEATHERBOUND_BOOK_RESELL_MADNESS = 2;

/** UI slice carried on the timed-tab store for this visit (not on GameState schema). */
export type CollectorTimedTabTradeState = {
  collectorBuyAvailable?: boolean;
  collectorSellAvailable?: boolean;
  collectorBuyDone?: boolean;
  collectorSellDone?: boolean;
  /** Choice id that received the checkmark in the Buy section. */
  collectorBuyChoiceId?: string;
  /** Choice id that received the checkmark in the Sell section. */
  collectorSellChoiceId?: string;
};

export function isCollectorTradeChoiceId(choiceId: string): boolean {
  return (
    choiceId.startsWith("buy_") ||
    (choiceId.startsWith("sell_") && choiceId !== "sell_nothing")
  );
}

export function isCollectorLeaveChoiceId(choiceId: string): boolean {
  return choiceId === "sell_nothing";
}

export function isWanderingCollectorEventId(eventId: string): boolean {
  return (
    eventId === "wandering_collector" ||
    eventId.startsWith("wandering_collector-")
  );
}

/**
 * Buy/sell buttons are fixed when the collector arrives. A later click must
 * run that button, not a new four-item window built from the live inventory.
 * `null` means this is not a stored-trade lookup (leave, or no snapshot).
 */
export function findStoredCollectorTradeChoice(
  eventId: string,
  choiceId: string,
  currentLogEntry?: Pick<LogEntry, "choices">,
): EventChoice | null {
  if (!isWanderingCollectorEventId(eventId) || !isCollectorTradeChoiceId(choiceId)) {
    return null;
  }
  const stored = currentLogEntry?.choices;
  if (!Array.isArray(stored)) return null;
  const choice = stored.find((entry) => entry.id === choiceId);
  if (!choice || typeof choice.effect !== "function") return null;
  return choice;
}

/** True when a collector buy/sell click has a snapshot and that offer is not on it. */
export function isMissingStoredCollectorTrade(
  eventId: string,
  choiceId: string,
  currentLogEntry?: Pick<LogEntry, "choices">,
): boolean {
  if (!isWanderingCollectorEventId(eventId) || !isCollectorTradeChoiceId(choiceId)) {
    return false;
  }
  const stored = currentLogEntry?.choices;
  if (!Array.isArray(stored)) return false;
  return findStoredCollectorTradeChoice(eventId, choiceId, currentLogEntry) == null;
}

function getCollectorVisitCount(state: GameState): number {
  const visitCountValue = state.story?.seen?.collectorVisitCount;
  return typeof visitCountValue === "number" ? visitCountValue : 0;
}

/** Sold the book and has not yet unlocked Chainmaster via buyback. */
export function isAwaitingLeatherboundBookBuyback(state: GameState): boolean {
  return (
    state.story?.seen?.leatherboundBookSoldToCollector === true &&
    !state.books?.book_of_chainmaster
  );
}

/**
 * After selling the leatherbound book to the Chainmaster collector, the wandering
 * collector can offer it back (teaches Chainmaster on purchase).
 * Mid-game: even visit counts. After story ending: every visit until bought.
 */
export function shouldOfferLeatherboundBookResell(state: GameState): boolean {
  if (!isAwaitingLeatherboundBookBuyback(state)) return false;
  if (isGameStoryCompleted(state)) return true;
  return getCollectorVisitCount(state) % 2 === 0;
}

/** Gold the collector pays when buying from the player. */
function getCollectorBuyReward(visitCount: number): number {
  return COLLECTOR_BUY_BASE_REWARD + visitCount * COLLECTOR_BUY_REWARD_STEP;
}

/** Gold the player pays when buying a rejected item from the collector. */
function getCollectorSellCost(visitCount: number): number {
  return COLLECTOR_SELL_BASE_COST + visitCount * COLLECTOR_SELL_COST_STEP;
}

function visitGateMet(state: GameState, visitCount: number): boolean {
  // After the story ending, keep returning past the usual visit cap until the
  // sold leatherbound book is bought back (Chainmaster unlock).
  if (visitCount >= COLLECTOR_MAX_VISITS) {
    return (
      isAwaitingLeatherboundBookBuyback(state) && isGameStoryCompleted(state)
    );
  }
  if (visitCount === 0) return state.buildings.woodenHut >= 6;
  if (visitCount === 1) return state.buildings.woodenHut >= 10;
  if (visitCount === 2) return state.buildings.stoneHut >= 4;
  if (visitCount === 3) return state.buildings.stoneHut >= 8;
  if (visitCount === 4) return state.buildings.stoneHut >= 10;
  if (visitCount === 5) return state.story?.seen?.fourthWaveVictory === true;
  if (visitCount === 6) return state.story?.seen?.eighthWaveVictory === true;
  return false;
}

function incrementCollectorVisit(state: GameState): {
  story: GameState["story"];
  newVisitCount: number;
} {
  const newVisitCount = getCollectorVisitCount(state) + 1;
  return {
    newVisitCount,
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        collectorVisitCount: newVisitCount,
      },
    },
  };
}

function getCollectorTabTradeState(
  state: GameState,
): CollectorTimedTabTradeState {
  return ((state as GameState & { timedEventTab?: CollectorTimedTabTradeState })
    .timedEventTab || {}) as CollectorTimedTabTradeState;
}

/** Visit ends after one buy and one sell (skipping a side that had no offers). */
export function shouldEndCollectorVisitAfterTrade(
  state: GameState,
  justCompleted: "buy" | "sell",
): boolean {
  const tab = getCollectorTabTradeState(state);
  const buyAvailable = tab.collectorBuyAvailable === true;
  const sellAvailable = tab.collectorSellAvailable === true;
  const buyDone = justCompleted === "buy" || tab.collectorBuyDone === true;
  const sellDone = justCompleted === "sell" || tab.collectorSellDone === true;
  return (buyDone || !buyAvailable) && (sellDone || !sellAvailable);
}

function collectorOfferLabel(itemId: string): string {
  if (getCollectorItemCategory(itemId) === "weapons") {
    return getEffectName(
      "weapons",
      itemId,
      weaponEffects[itemId]?.name ?? itemId,
    );
  }
  return getClothingOrRelicEffectName(itemId);
}

function grantCollectorItem(
  state: GameState,
  itemId: string,
): Partial<GameState> {
  const category = getCollectorItemCategory(itemId);
  if (category === "weapons") {
    return {
      weapons: {
        ...state.weapons,
        [itemId]: true,
      } as GameState["weapons"],
    };
  }
  if (category === "clothing") {
    return {
      clothing: {
        ...state.clothing,
        [itemId]: true,
      } as GameState["clothing"],
    };
  }
  return {
    relics: {
      ...state.relics,
      [itemId]: true,
    } as GameState["relics"],
  };
}

function removeCollectorItem(
  state: GameState,
  itemId: string,
): Partial<GameState> {
  if (getCollectorItemCategory(itemId) === "weapons") {
    return {
      weapons: {
        ...state.weapons,
        [itemId]: false,
      } as GameState["weapons"],
    };
  }
  if (state.clothing && (state.clothing as Record<string, boolean>)[itemId]) {
    return {
      clothing: {
        ...state.clothing,
        [itemId]: false,
      } as GameState["clothing"],
    };
  }
  if (state.relics && (state.relics as Record<string, boolean>)[itemId]) {
    return {
      relics: {
        ...state.relics,
        [itemId]: false,
      } as GameState["relics"],
    };
  }
  return {};
}

function getCollectorDepartureLogKey(newVisitCount: number): string {
  // Special lore after the 1st, 3rd, and 5th visits; short generic line otherwise
  if (newVisitCount === 1) return "whisper0";
  if (newVisitCount === 3) return "whisper1";
  if (newVisitCount === 5) return "whisper2";
  return "whisperGeneric";
}

export { getCollectorDepartureLogKey };

function endVisitPatch(state: GameState): Partial<GameState> {
  const { story, newVisitCount } = incrementCollectorVisit(state);
  return {
    story,
    _logMessageKey: getCollectorDepartureLogKey(newVisitCount),
  } as Partial<GameState>;
}

export const wanderingCollectorEvents: Record<string, GameEvent> = {
  wandering_collector: {
    id: "wandering_collector",
    i18nVars: (state: GameState) => {
      const visitCount = getCollectorVisitCount(state);
      return {
        reward: getCollectorBuyReward(visitCount),
        goldCost: getCollectorSellCost(visitCount),
        leatherboundBookCost: LEATHERBOUND_BOOK_RESELL_GOLD,
      };
    },
    condition: (state: GameState) => {
      const ownedItems = getOwnedCollectorItems(state);
      const rejectedItems = getRejectedCollectorItems(state);
      const offerLeatherbound = shouldOfferLeatherboundBookResell(state);
      // Arrive with only buy stock, only sell stock, leatherbound resell, or both
      if (
        ownedItems.length === 0 &&
        rejectedItems.length === 0 &&
        !offerLeatherbound
      ) {
        return false;
      }

      const visitCount = getCollectorVisitCount(state);
      return visitGateMet(state, visitCount);
    },
    message: (state: GameState) => {
      const visitCount = getCollectorVisitCount(state);
      // First visit vs every return visit (no special "final visit" copy)
      const visitKey = visitCount === 0 ? 0 : 1;
      const hasGoods =
        getRejectedCollectorItems(state).length > 0 ||
        shouldOfferLeatherboundBookResell(state);
      const hasOwned = getOwnedCollectorItems(state).length > 0;
      if (hasGoods && hasOwned) return `visit${visitKey}_both`;
      if (hasGoods) return `visit${visitKey}_buy`;
      return `visit${visitKey}`;
    },
    timeProbability: 25,
    cooldownPercent: 0.5,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    choices: (state: GameState): EventChoice[] => {
      const visitCount = getCollectorVisitCount(state);
      const reward = getCollectorBuyReward(visitCount);
      const goldCost = getCollectorSellCost(visitCount);

      const ownedItems = getOwnedCollectorItems(state);
      const rejectedItems = getRejectedCollectorItems(state);

      const selectedToBuyFromPlayer = selectCollectorOfferItems(
        ownedItems,
        visitCount,
        COLLECTOR_MAX_OFFERS,
      );
      const selectedToSellToPlayer = selectCollectorOfferItems(
        rejectedItems,
        visitCount + 1,
        COLLECTOR_MAX_OFFERS,
      );

      const choices: EventChoice[] = [];

      // Player buys rejected items from the collector (visit ends via leave choice, not here)
      for (const itemId of selectedToSellToPlayer) {
        choices.push({
          id: `buy_${itemId}`,
          label: collectorOfferLabel(itemId),
          cost: `${goldCost} gold`,
          effect: (innerState: GameState) => {
            const gold = (innerState.resources.gold || 0) - goldCost;
            const granted = grantCollectorItem(innerState, itemId);
            return {
              ...granted,
              resources: {
                ...innerState.resources,
                gold,
              },
              story: {
                ...innerState.story,
                seen: clearCollectorItemRejectedInSeen(
                  innerState.story?.seen,
                  itemId,
                ),
              },
            } as any;
          },
        });
      }

      if (shouldOfferLeatherboundBookResell(state)) {
        choices.push({
          id: LEATHERBOUND_BOOK_BUY_CHOICE_ID,
          label: collectorOfferLabel(LEATHERBOUND_BOOK_ITEM_ID),
          cost: `${LEATHERBOUND_BOOK_RESELL_GOLD} gold`,
          effect: (innerState: GameState) => {
            return {
              resources: {
                ...innerState.resources,
                gold:
                  (innerState.resources.gold || 0) - LEATHERBOUND_BOOK_RESELL_GOLD,
              },
              books: {
                ...innerState.books,
                book_of_chainmaster: true,
              },
              chainmasterSkills: { level: 0 },
              stats: {
                ...innerState.stats,
                madnessFromEvents:
                  (innerState.stats.madnessFromEvents || 0) +
                  LEATHERBOUND_BOOK_RESELL_MADNESS,
              },
              story: {
                ...innerState.story,
                seen: {
                  ...innerState.story.seen,
                  // Must set false (not delete): mergeStateUpdates spreads seen.
                  leatherboundBookSoldToCollector: false,
                },
              },
              _logMessageKey: "leatherboundLearnOutcome",
            } as any;
          },
        });
      }

      // Player sells owned items to the collector (visit ends via leave choice, not here)
      for (const itemId of selectedToBuyFromPlayer) {
        choices.push({
          id: `sell_${itemId}`,
          label: collectorOfferLabel(itemId),
          effect: (innerState: GameState) => {
            const removed = removeCollectorItem(innerState, itemId);
            return {
              ...removed,
              resources: {
                ...innerState.resources,
                gold: (innerState.resources.gold || 0) + reward,
              },
            } as any;
          },
        });
      }

      choices.push({
        id: "sell_nothing",
        effect: (innerState: GameState) => {
          return {
            ...endVisitPatch(innerState),
          } as any;
        },
      });

      return choices;
    },
    fallbackChoice: {
      id: "sell_nothing",
      effect: (innerState: GameState) => {
        return {
          ...endVisitPatch(innerState),
        } as any;
      },
    },
  },
};
