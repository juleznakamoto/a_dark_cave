import { GameState } from "@shared/schema";
import { constrainResourceAmount } from "@/game/resourceLimits";
import { markSeenResources } from "@/game/stateHelpers";
import {
  calculateTotalEffects,
  getMadnessComponents,
} from "@/game/rules/effectsCalculation";

export const mergeStateUpdates = (
  prevState: GameState,
  stateUpdates: Partial<GameState>,
  options?: { allowResourceOvercap?: boolean },
): Partial<GameState> => {
  // Ensure resources never go negative when merging, and apply resource limits
  const mergedResources = { ...prevState.resources, ...stateUpdates.resources };
  Object.keys(mergedResources).forEach((key) => {
    if (
      typeof mergedResources[key as keyof typeof mergedResources] === "number"
    ) {
      let value = mergedResources[key as keyof typeof mergedResources];
      // First ensure non-negative
      if (value < 0) {
        value = 0;
      }
      const previousAmount =
        prevState.resources[key as keyof GameState["resources"]] ?? 0;
      // Event rewards may overcap; production/actions preserve existing overcap
      value = constrainResourceAmount(
        key,
        value,
        { ...prevState, ...stateUpdates },
        {
          previousAmount,
          allowOvercap: options?.allowResourceOvercap,
        },
      );
      mergedResources[key as keyof typeof mergedResources] = value;
    }
  });

  const seenResources = markSeenResources(
    stateUpdates.seenResources ?? prevState.seenResources,
    mergedResources,
  );

  const merged = {
    resources: mergedResources,
    seenResources,
    weapons: { ...prevState.weapons, ...stateUpdates.weapons },
    tools: { ...prevState.tools, ...stateUpdates.tools },
    buildings: { ...prevState.buildings, ...stateUpdates.buildings },
    flags: { ...prevState.flags, ...stateUpdates.flags },
    villagers: { ...prevState.villagers, ...stateUpdates.villagers },
    current_population:
      stateUpdates.current_population !== undefined
        ? stateUpdates.current_population
        : prevState.current_population,
    total_population:
      stateUpdates.total_population !== undefined
        ? stateUpdates.total_population
        : prevState.total_population,
    expeditionVillagers: {
      ...prevState.expeditionVillagers,
      ...stateUpdates.expeditionVillagers,
    },
    clothing: { ...prevState.clothing, ...stateUpdates.clothing },
    relics: { ...prevState.relics, ...stateUpdates.relics },
    books: { ...prevState.books, ...stateUpdates.books },
    fellowship: { ...prevState.fellowship, ...stateUpdates.fellowship },
    blessings: { ...prevState.blessings, ...stateUpdates.blessings },
    events: { ...prevState.events, ...stateUpdates.events },
    stats: { ...prevState.stats, ...stateUpdates.stats },
    cooldowns: { ...prevState.cooldowns, ...stateUpdates.cooldowns },
    initialCooldowns: { ...prevState.initialCooldowns, ...(stateUpdates as any).initialCooldowns },
    schematics: { ...prevState.schematics, ...stateUpdates.schematics },
    attackWaveTimers: {
      ...prevState.attackWaveTimers,
      ...stateUpdates.attackWaveTimers,
    },
    postCompletionAttackWaveCount:
      stateUpdates.postCompletionAttackWaveCount !== undefined
        ? stateUpdates.postCompletionAttackWaveCount
        : prevState.postCompletionAttackWaveCount,
    triggeredEvents: {
      ...prevState.triggeredEvents,
      ...stateUpdates.triggeredEvents,
    },
    feastState: stateUpdates.feastState || prevState.feastState,
    insightBlessingOfferState:
      stateUpdates.insightBlessingOfferState ||
      prevState.insightBlessingOfferState,
    boneDevourerState:
      stateUpdates.boneDevourerState || prevState.boneDevourerState,
    greatFeastState: stateUpdates.greatFeastState || prevState.greatFeastState,
    solsticeState: stateUpdates.solsticeState || prevState.solsticeState,
    bloodMoonState: stateUpdates.bloodMoonState || prevState.bloodMoonState,
    curseState: stateUpdates.curseState || prevState.curseState,
    frostfallState: stateUpdates.frostfallState || prevState.frostfallState,
    woodcutterState: stateUpdates.woodcutterState || prevState.woodcutterState,
    tradersGratitudeState: stateUpdates.tradersGratitudeState || prevState.tradersGratitudeState,
    tradersSonGratitudeState:
      stateUpdates.tradersSonGratitudeState || prevState.tradersSonGratitudeState,
    fogState: stateUpdates.fogState || prevState.fogState,
    disgustState: stateUpdates.disgustState || prevState.disgustState,
    obsidianOrbState:
      stateUpdates.obsidianOrbState || prevState.obsidianOrbState,
    sleepUpgrades: stateUpdates.sleepUpgrades || prevState.sleepUpgrades,
    combatSkills: stateUpdates.combatSkills || prevState.combatSkills,
    clickAnalytics: {
      ...prevState.clickAnalytics,
      ...stateUpdates.clickAnalytics,
    },
    madness:
      stateUpdates.madness !== undefined
        ? stateUpdates.madness
        : prevState.madness,
    heartfireState: stateUpdates.heartfireState || prevState.heartfireState,
    miningBoostState:
      stateUpdates.miningBoostState || prevState.miningBoostState,
    brimstoneFluxState:
      stateUpdates.brimstoneFluxState || prevState.brimstoneFluxState,
    staringDeerState:
      stateUpdates.staringDeerState || prevState.staringDeerState,
    forestFearState:
      stateUpdates.forestFearState || prevState.forestFearState,
    greatFeastActivations:
      stateUpdates.greatFeastActivations !== undefined
        ? stateUpdates.greatFeastActivations
        : prevState.greatFeastActivations,
    buttonUpgrades: stateUpdates.buttonUpgrades
      ? {
        ...prevState.buttonUpgrades,
        ...Object.fromEntries(
          Object.entries(stateUpdates.buttonUpgrades).map(([key, value]) => [
            key,
            {
              ...prevState.buttonUpgrades[
              key as keyof typeof prevState.buttonUpgrades
              ],
              ...value,
            },
          ]),
        ),
      }
      : prevState.buttonUpgrades,
    story: stateUpdates.story
      ? {
        ...prevState.story,
        seen: { ...prevState.story.seen, ...stateUpdates.story.seen },
        merchantPurchases:
          stateUpdates.story.merchantPurchases !== undefined
            ? stateUpdates.story.merchantPurchases
            : prevState.story.merchantPurchases,
      }
      : prevState.story,
    effects: stateUpdates.effects || prevState.effects,
    // Merge loop-related states if they are part of stateUpdates
    loopProgress:
      stateUpdates.loopProgress !== undefined
        ? stateUpdates.loopProgress
        : prevState.loopProgress,
    isGameLoopActive:
      stateUpdates.isGameLoopActive !== undefined
        ? stateUpdates.isGameLoopActive
        : prevState.isGameLoopActive,
    isPaused:
      stateUpdates.isPaused !== undefined
        ? stateUpdates.isPaused
        : prevState.isPaused, // Merge isPaused
    playTime:
      stateUpdates.playTime !== undefined
        ? stateUpdates.playTime
        : prevState.playTime, // Merge playTime
    referralCount:
      stateUpdates.referralCount !== undefined
        ? stateUpdates.referralCount
        : prevState.referralCount, // Merge referralCount
    referredUsers:
      stateUpdates.referredUsers !== undefined
        ? stateUpdates.referredUsers
        : prevState.referredUsers, // Merge referredUsers (was `||`, which wrongly kept [] over prev)
    referrals:
      stateUpdates.referrals !== undefined
        ? stateUpdates.referrals
        : prevState.referrals, // Merge referrals (was `||`, which wrongly kept [] over prev)
    social_media_rewards:
      stateUpdates.social_media_rewards != null
        ? stateUpdates.social_media_rewards
        : prevState.social_media_rewards, // Merge social rewards (was `||`, {} overwrote unintentionally)
    lastResourceSnapshotTime:
      stateUpdates.lastResourceSnapshotTime !== undefined
        ? stateUpdates.lastResourceSnapshotTime
        : prevState.lastResourceSnapshotTime, // Merge lastResourceSnapshotTime
    isPausedPreviously:
      stateUpdates.isPausedPreviously !== undefined
        ? stateUpdates.isPausedPreviously
        : prevState.isPausedPreviously, // Merge isPausedPreviously
    // Achievements state
    unlockedAchievements:
      stateUpdates.unlockedAchievements || prevState.unlockedAchievements,
    claimedAchievements:
      stateUpdates.claimedAchievements || prevState.claimedAchievements,
    revealedAchievementTitles:
      stateUpdates.revealedAchievementTitles || prevState.revealedAchievementTitles,
    // Game ID
    gameId:
      stateUpdates.gameId !== undefined
        ? stateUpdates.gameId
        : prevState.gameId,
    // Game completion tracking
    game_stats: stateUpdates.game_stats || prevState.game_stats,
    hasWonAnyGame:
      stateUpdates.hasWonAnyGame !== undefined
        ? stateUpdates.hasWonAnyGame
        : prevState.hasWonAnyGame,
    // Once true, meta win flags stay true (OR merge so partial updates cannot clear them)
    hasWonNormalGame: Boolean(
      stateUpdates.hasWonNormalGame || prevState.hasWonNormalGame,
    ),
    hasWonCruelGame: Boolean(
      stateUpdates.hasWonCruelGame || prevState.hasWonCruelGame,
    ),
    hasSpeedrunWin: Boolean(
      stateUpdates.hasSpeedrunWin || prevState.hasSpeedrunWin,
    ),
    lifetimeGamesWon:
      stateUpdates.lifetimeGamesWon !== undefined
        ? Math.max(
          stateUpdates.lifetimeGamesWon,
          prevState.lifetimeGamesWon ?? 0,
        )
        : (prevState.lifetimeGamesWon ?? 0),
    lifetimePlayTimeMs:
      stateUpdates.lifetimePlayTimeMs !== undefined
        ? Math.max(
          stateUpdates.lifetimePlayTimeMs,
          prevState.lifetimePlayTimeMs ?? 0,
        )
        : (prevState.lifetimePlayTimeMs ?? 0),
    // Union lifetime Resource Maxer hits (partial updates must not wipe prior keys)
    lifetimeStorageMaxHits: (() => {
      const merged = new Set<string>([
        ...(prevState.lifetimeStorageMaxHits ?? []),
        ...(stateUpdates.lifetimeStorageMaxHits ?? []),
      ]);
      return Array.from(merged);
    })(),
    // Union lifetime Upgrade Maxer hits (partial updates must not wipe prior keys)
    lifetimeEstateUpgradeMaxHits: (() => {
      const merged = new Set<string>([
        ...(prevState.lifetimeEstateUpgradeMaxHits ?? []),
        ...(stateUpdates.lifetimeEstateUpgradeMaxHits ?? []),
      ]);
      return Array.from(merged);
    })(),
    hasAchievementMaxer: Boolean(
      stateUpdates.hasAchievementMaxer || prevState.hasAchievementMaxer,
    ),
    // Merchant trades state
    merchantTrades: stateUpdates.merchantTrades || prevState.merchantTrades,
  };

  if (
    stateUpdates.tools ||
    stateUpdates.weapons ||
    stateUpdates.clothing ||
    stateUpdates.relics ||
    stateUpdates.books ||
    stateUpdates.buildings ||
    stateUpdates.blessings ||
    stateUpdates.fellowship ||
    stateUpdates.stats
  ) {
    const tempState = { ...prevState, ...merged };
    merged.effects = calculateTotalEffects(tempState);
    // Side panel reads cached stats, not live getTotal* totals.
    merged.stats = {
      ...merged.stats,
      luck: merged.effects.statBonuses.luck,
      strength: merged.effects.statBonuses.strength,
      knowledge: merged.effects.statBonuses.knowledge,
      madness: getMadnessComponents(tempState, merged.effects).total,
    };
  }

  return merged;
};
