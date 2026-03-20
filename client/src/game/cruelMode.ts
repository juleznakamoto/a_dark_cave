/**
 * Single source of truth for Cruel Mode tuning (gameplay numbers that scale when `cruelMode` is true).
 * Prefer importing from here instead of scattering literals across rules and UI.
 *
 * Exception: attack-wave **enemy** scaling (`cruelBonus` per wave) lives in
 * `eventsAttackWaves.ts` as `WAVE_PARAMS`, since those values are tied to each wave definition.
 */

/** 0 in normal mode, 1 when cruel mode — multiplies `whenCruel` / cruel-only terms in formulas. */
export function cruelModeScale(state: { cruelMode: boolean }): 0 | 1 {
  return state.cruelMode ? 1 : 0;
}
export const CRUEL_MODE = {
  successChance: {
    /** Default subtracted in calculateSuccessChance when cruel mode is on */
    defaultCruelPenalty: -0.05,
    /** Used when refusing the forest gods sacrifice (narrower cruel effect) */
    refuseForestGodsCruelMultiplier: -0.025,
  },

  madnessFromEvents: {
    /** Flat +madness from event lines when cruel mode is on */
    flatBonusWhenCruel: 1,
  },

  strangerApproach: {
    lowPopBonusWhenPopLte4: { normal: 0.5, cruel: 0.25 },
  },

  itemMadness: {
    /** Items at or above this madness get +1 in cruel mode */
    highMadnessThreshold: 4,
    highMadnessExtra: 1,
  },

  durations: {
    /** Curse / frostfall: baseMin + extraMinutesWhenCruel * cruelModeScale */
    curseLikeBaseMin: 10,
    curseLikeExtraMinutesWhenCruel: 5,
    disgustNormalMin: 10,
    disgustCruelMin: 20,
    /** Riddle fog: base duration; total = base * (1 + cruelModeScale) */
    riddleFogBaseMin: 10,
  },

  bloodMoon: {
    baseSacrificeNormal: 5,
    baseSacrificeCruel: 10,
    perOccurrence: 5,
    cap: 30,
  },

  fireStorm: {
    maxOccurrencesCruel: 3,
  },

  loop: {
    /** Subtracted from multi-stranger multiplier when cruel mode is on */
    multiStrangerCruelPenalty: 0.25,
    starvationDeathPerVillager: { base: 0.05, whenCruel: 0.025 },
    freezingDeathPerVillager: { base: 0.05, whenCruel: 0.025 },
    madnessDeath: {
      tier2: { base: 0, whenCruel: 0.005 },
      tier3: { base: 0.005, whenCruel: 0.01 },
      tier4: { base: 0.01, whenCruel: 0.01 },
      tier5: { base: 0.015, whenCruel: 0.01 },
      tier6: { base: 0.02, whenCruel: 0.01 },
      deathRollBiasWhenCruel: 0.1,
    },
  },

  /** Attack wave combat defeat (eventsAttackWaves) */
  attackWaveDefeat: {
    extraCasualtiesWhenCruel: 5,
    buildingDamageChanceCruelAdd: 0.1,
    fellowshipWoundChanceCruelAdd: 0.1,
  },

  bastion: {
    /** Fraction of build cost to repair damaged bastion buildings (same in normal and cruel mode) */
    repairCostFactor: 0.25,
  },

  forestTotems: {
    discovery: {
      baseProbability: 0.02,
      probabilitySubtractWhenCruel: 0.01,
      bonusPerUse: 0.01,
      bonusPerUseSubtractWhenCruel: 0.005,
    },
  },

  madnessEvents: {
    hollowStaresConfront: { baseChance: 0.3, whenCruel: 0.05 },
    skinCrawlingCalm: { luckBase: 0.5, luckPer: 0.005, whenCruel: 0.1 },
    skinCrawlingScratchDeaths: { randMax: 4, base: 3, whenCruel: 2 },
    wrongReflectionsThirst: { randMax: 5, base: 6, whenCruel: 2 },
    villagersStareWake: { baseChance: 0.6, whenCruel: 0.15 },
  },

  villageAttacks: {
    boneArmy: {
      defendCasualtyWhenCruel: 0.05,
      defeatSteelLoss: { randMax: 10, step: 25, base: 50, whenCruel: 100 },
      maxDeathsDefend: { randMax: 20, base: 10, whenCruel: 8 },
      hutDestroyChance: { whenCruel: 0.45, trapPenalty: 0.05 },
    },
    boneArmyHide: {
      casualtyWhenCruel: 0.05,
      steelLoss: { randMax: 20, step: 25, base: 100, whenCruel: 100 },
      ironLoss: { randMax: 20, step: 25, base: 200, whenCruel: 200 },
      maxDeaths: { randMax: 15, base: 5, whenCruel: 8 },
    },
    wolf: {
      defendCasualtyWhenCruel: 0.05,
      foodLossTail: { whenCruel: 100 },
      maxDeathsDefend: { base: 4, perHut: 1, whenCruel: 2, trapMult: 3 },
      hutDestroyChance: { whenCruel: 0.25, trapPenalty: 0.05 },
    },
    wolfHide: {
      casualtyWhenCruel: 0.05,
      foodLossTail: { whenCruel: 2 },
      maxDeaths: { base: 2, perHutHalf: 0.5, whenCruel: 2, trapMult: 1 },
    },
    cannibal: {
      victoryMinimalDeaths: { randMax: 2, whenCruel: 1 },
      defeatCasualtyWhenCruel: 0.1,
      maxCasualtiesDefeat: { base: 4, perHut: 1, whenCruel: 2, trapMult: 3 },
      silverLoss: { randMax: 4, step: 25, base: 25, whenCruel: 100 },
      foodLoss: { randMax: 6, step: 50, base: 50, whenCruel: 250 },
    },
    cannibalHide: {
      casualtyWhenCruel: 0.05,
      maxCasualties: { base: 4, perHutHalf: 0.5, whenCruel: 2, trapMult: 2 },
      silverLoss: { randMax: 4, step: 50, base: 50, whenCruel: 200 },
      foodLoss: { randMax: 6, step: 100, base: 100, whenCruel: 500 },
    },
  },

  forestScout: {
    huntBlacksmithHammerProb: {
      base: 0.0075,
      perStoneHut: 0.01,
      whenCruel: 0.005,
    },
    huntRedMaskProb: {
      base: 0.005,
      perStoneHut: 0.01,
      whenCruel: 0.0025,
    },
    giantBearTrap: {
      fightChance: { base: 0.1, perStrength: 0.02, whenCruel: 0.05 },
      victoryDeaths: { randMax: 4, whenCruel: 1 },
      defeatDeaths: { randMax: 5, base: 3, whenCruel: 2 },
    },
    castleRuins: {
      minorUndeadChance: { base: 0.5, whenCruel: 0.1 },
      minorDeaths: { randMax: 5, base: 1, whenCruel: 2 },
      majorDeaths: { randMax: 9, base: 2, whenCruel: 4 },
    },
    hillGrave: { failureDeaths: { randMax: 11, base: 3, whenCruel: 4 } },
    sunkenTemple: { failureDeaths: { randMax: 13, base: 4, whenCruel: 4 } },
    collapsedTower: { failureDeaths: { randMax: 9, base: 2, whenCruel: 4 } },
    forestCave: { failureDeaths: { randMax: 8, base: 2, whenCruel: 3 } },
  },

  particles: {
    initialSpawn: { normal: 2, cruel: 20 },
    hoverSpawn: { normal: 2, cruel: 10 },
    rampMax: { normal: 10, cruel: 100 },
    rampFloor: { normal: 1, cruel: 10 },
    rampRandomRange: { normal: 7, cruel: 70 },
    rampPostPlateau: { normal: 6, cruel: 60 },
    clickBurst: { normal: 100, cruel: 200 },
  },

  forestExpedition: {
    castleRuins: { base: 10, whenCruel: 4 },
    hillGrave: { base: 13, whenCruel: 4 },
    sunkenTemple: { base: 16, whenCruel: 4 },
    collapsedTower: { base: 10, whenCruel: 4 },
    forestCave: { base: 9, whenCruel: 3 },
  },

  paleFigure: {
    failureDeathScaleWhenCruel: 2,
  },

  offerForestGods: {
    sacrificeLabel: { normal: 4, cruel: 8 },
    initialKill: { base: 4, whenCruel: 4 },
    failAdditionalDeaths: { randMax: 5, base: 2, whenCruel: 2 },
    refuseNothingChance: { base: 0.4, whenCruel: 0.05 },
    refuseDisappearances: { randMax: 3, base: 1, whenCruel: 2 },
    fallbackDepartures: { randMax: 4, base: 2, whenCruel: 2 },
  },

  madBeduine: {
    turnAwayDeathsExtraWhenCruel: 2,
  },

  hiddenLake: {
    fleeChance: { base: 0.2, whenCruel: 0.05 },
    drownedCount: { randMax: 4, base: 1, whenCruel: 2 },
  },

  vikingBuilder: {
    failureCasualties: { randMax: 5, base: 1, whenCruel: 3 },
  },

  slaveTrader: {
    freeSlavesSuccess: { base: 0.5, perStrength: 0.01, whenCruel: 0.1 },
    failDeaths: { randMax: 2, base: 1, whenCruel: 1 },
  },

  mysteriousWoman: {
    silverMin: { base: 200, whenCruel: 100 },
  },

  youngWomanProtest: {
    banishLeavers: { base: 10, whenCruel: 5 },
    sacrificeLeavers: { base: 21, whenCruel: 10 },
  },
} as const;

const MS_PER_MIN = 60 * 1000;

export function curseLikeDurationMs(cruelTier: number): number {
  const { curseLikeBaseMin, curseLikeExtraMinutesWhenCruel } =
    CRUEL_MODE.durations;
  return (
    (curseLikeBaseMin + curseLikeExtraMinutesWhenCruel * cruelTier) * MS_PER_MIN
  );
}

export function disgustDurationMs(cruelMode: boolean): number {
  const { disgustNormalMin, disgustCruelMin } = CRUEL_MODE.durations;
  return (cruelMode ? disgustCruelMin : disgustNormalMin) * MS_PER_MIN;
}

export function riddleFogDurationMs(cruelTier: number): number {
  const base = CRUEL_MODE.durations.riddleFogBaseMin * MS_PER_MIN;
  return base + base * cruelTier;
}

export function bloodMoonSacrificeAmount(
  cruelMode: boolean,
  occurrenceCount: number,
): number {
  const { baseSacrificeNormal, baseSacrificeCruel, perOccurrence, cap } =
    CRUEL_MODE.bloodMoon;
  const base = cruelMode ? baseSacrificeCruel : baseSacrificeNormal;
  return Math.min(base + occurrenceCount * perOccurrence, cap);
}
