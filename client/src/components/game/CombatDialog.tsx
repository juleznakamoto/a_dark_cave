import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import { calculateBastionStats } from "@/game/bastionStats";
import {
  getTotalKnowledge,
  getTotalLuck,
  getTotalCriticalChance,
  getTotalMadness,
} from "@/game/rules/effectsCalculation";
import { combatItemTooltips } from "@/game/rules/tooltips";
import {
  calculateCriticalStrikeChance,
  getCombatAttackFailChancePercent,
} from "@/game/rules/effectsStats";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  BOMB_BASE_DAMAGE_BY_ID,
  bombKnowledgeDamageBonus,
  CRUSHING_STRIKE_UPGRADES,
  bloodflameSphereFightBurnTicksAfterCast,
} from "@/game/rules/skillUpgrades";
import {
  getPoisonArrowsBaseDamage,
  getPoisonArrowsDamagePerTick,
  getPoisonArrowsDotFightRounds,
} from "@/game/weaponEnchantments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { Enemy, CombatItem, CombatResultSummary } from "@/game/types";
import { extractCombatResultSummary } from "@/game/stateHelpers";
import { ProceduralGroundBackground } from "@/components/ui/procedural-ground-background";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { cn, formatNumber } from "@/lib/utils";
import { getResourceName, getStatName } from "@/i18n/resolveGameText";
import {
  getCombatEnemyDisplayName,
  getDamagedBuildingDisplayName,
  getFellowshipDisplayName,
} from "@/i18n/combatLabels";
import { useTranslation } from "react-i18next";

const COMBAT_BAR_CHANGE_MS = 500;

interface CombatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enemy: Enemy | null;
  eventTitle: string;
  eventMessage: string;
  onVictory: () => CombatResultSummary;
  onDefeat: () => CombatResultSummary;
}

export default function CombatDialog({
  isOpen,
  onClose,
  enemy,
  eventTitle,
  eventMessage,
  onVictory,
  onDefeat,
}: CombatDialogProps) {
  const { t } = useTranslation(["ui", "common"]);
  const gameState = useGameStore.getState();
  const crushingStrikeLevel = useGameStore(
    (state) => state.combatSkills.crushingStrikeLevel,
  );
  const bloodflameSphereLevel = useGameStore(
    (state) => state.combatSkills.bloodflameSphereLevel,
  );
  const hasFortress = useGameStore((state) => state.flags.hasFortress);
  const combatResources = useGameStore((state) => state.resources);

  const [combatStarted, setCombatStarted] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [round, setRound] = useState(1);
  const [usedItemsInRound, setUsedItemsInRound] = useState<Set<string>>(
    new Set(),
  );
  const [usedItemsInCombat, setUsedItemsInCombat] = useState<string[]>([]);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [combatEnded, setCombatEnded] = useState(false);
  const [combatResult, setCombatResult] = useState<"victory" | "defeat" | null>(
    null,
  );
  const [currentIntegrity, setCurrentIntegrity] = useState(0);
  const [maxIntegrityForCombat, setMaxIntegrityForCombat] = useState(0);
  const [enemyDamageIndicator, setEnemyDamageIndicator] = useState<{
    amount: number;
    visible: boolean;
  }>({ amount: 0, visible: false });
  const [playerDamageIndicator, setPlayerDamageIndicator] = useState<{
    amount: number;
    visible: boolean;
  }>({ amount: 0, visible: false });
  const [integrityDamageIndicator, setIntegrityDamageIndicator] = useState<{
    amount: number;
    visible: boolean;
  }>({ amount: 0, visible: false });
  const [integrityHealIndicator, setIntegrityHealIndicator] = useState<{
    amount: number;
    visible: boolean;
  }>({ amount: 0, visible: false });
  const [usedCrushingStrike, setUsedCrushingStrike] = useState(false);
  const [usedBloodflameSphere, setUsedBloodflameSphere] = useState(false);
  const [enemyStunnedRounds, setEnemyStunnedRounds] = useState(0);
  const [enemyBurnRounds, setEnemyBurnRounds] = useState(0);
  const [enemyBurnDamage, setEnemyBurnDamage] = useState(0);
  const [enemyPoisonRounds, setEnemyPoisonRounds] = useState(0);
  const [enemyPoisonDamage, setEnemyPoisonDamage] = useState(0);
  const [wasCriticalStrike, setWasCriticalStrike] = useState(false);
  const [playerStrikeFailed, setPlayerStrikeFailed] = useState(false);
  const [crushingStrikeFailed, setCrushingStrikeFailed] = useState(false);
  const [combatSummary, setCombatSummary] =
    useState<CombatResultSummary | null>(null);
  const consequencesAppliedRef = useRef(false);
  const integrityDamageIndicatorTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const enemyDamageIndicatorTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const integrityHealIndicatorTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const showIntegrityDamage = (amount: number) => {
    if (integrityHealIndicatorTimeoutRef.current) {
      clearTimeout(integrityHealIndicatorTimeoutRef.current);
      integrityHealIndicatorTimeoutRef.current = null;
    }
    setIntegrityHealIndicator({ amount: 0, visible: false });
    if (integrityDamageIndicatorTimeoutRef.current) {
      clearTimeout(integrityDamageIndicatorTimeoutRef.current);
      integrityDamageIndicatorTimeoutRef.current = null;
    }
    setIntegrityDamageIndicator({ amount, visible: true });
    integrityDamageIndicatorTimeoutRef.current = setTimeout(() => {
      setIntegrityDamageIndicator({ amount: 0, visible: false });
      integrityDamageIndicatorTimeoutRef.current = null;
    }, 3000);
  };

  const showIntegrityHeal = (amount: number) => {
    if (integrityDamageIndicatorTimeoutRef.current) {
      clearTimeout(integrityDamageIndicatorTimeoutRef.current);
      integrityDamageIndicatorTimeoutRef.current = null;
    }
    setIntegrityDamageIndicator({ amount: 0, visible: false });
    if (integrityHealIndicatorTimeoutRef.current) {
      clearTimeout(integrityHealIndicatorTimeoutRef.current);
      integrityHealIndicatorTimeoutRef.current = null;
    }
    setIntegrityHealIndicator({ amount, visible: true });
    integrityHealIndicatorTimeoutRef.current = setTimeout(() => {
      setIntegrityHealIndicator({ amount: 0, visible: false });
      integrityHealIndicatorTimeoutRef.current = null;
    }, 3000);
  };

  const showEnemyDamage = (amount: number) => {
    if (enemyDamageIndicatorTimeoutRef.current) {
      clearTimeout(enemyDamageIndicatorTimeoutRef.current);
      enemyDamageIndicatorTimeoutRef.current = null;
    }
    setEnemyDamageIndicator({ amount, visible: true });
    enemyDamageIndicatorTimeoutRef.current = setTimeout(() => {
      setEnemyDamageIndicator({ amount: 0, visible: false });
      setWasCriticalStrike(false);
      setPlayerStrikeFailed(false);
      setCrushingStrikeFailed(false);
      enemyDamageIndicatorTimeoutRef.current = null;
    }, 3000);
  };

  const HAS_RESTLESS_KNIGHT = gameState.fellowship.restless_knight || false;
  const HAS_ELDER_WIZARD = gameState.fellowship.elder_wizard || false;
  const isRestlessKnightWounded = Boolean(
    gameState.story?.seen?.restlessKnightWounded,
  );
  const isElderWizardWounded = Boolean(
    gameState.story?.seen?.elderWizardWounded,
  );

  const bastionStats = calculateBastionStats(gameState);

  // Combat audio loop - play looping combat sound when combat starts (user clicks "Start Fight")
  // Starting on user click satisfies browser autoplay policy
  useEffect(() => {
    if (isOpen && combatStarted) {
      audioManager.playLoopingSound("combat", 0.3);
    } else {
      audioManager.stopLoopingSound("combat");
    }

    // Cleanup on unmount
    return () => {
      audioManager.stopLoopingSound("combat");
    };
  }, [isOpen, combatStarted]);

  useEffect(() => {
    return () => {
      if (integrityDamageIndicatorTimeoutRef.current) {
        clearTimeout(integrityDamageIndicatorTimeoutRef.current);
        integrityDamageIndicatorTimeoutRef.current = null;
      }
      if (integrityHealIndicatorTimeoutRef.current) {
        clearTimeout(integrityHealIndicatorTimeoutRef.current);
        integrityHealIndicatorTimeoutRef.current = null;
      }
      if (enemyDamageIndicatorTimeoutRef.current) {
        clearTimeout(enemyDamageIndicatorTimeoutRef.current);
        enemyDamageIndicatorTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && enemy) {
      if (integrityDamageIndicatorTimeoutRef.current) {
        clearTimeout(integrityDamageIndicatorTimeoutRef.current);
        integrityDamageIndicatorTimeoutRef.current = null;
      }
      if (integrityHealIndicatorTimeoutRef.current) {
        clearTimeout(integrityHealIndicatorTimeoutRef.current);
        integrityHealIndicatorTimeoutRef.current = null;
      }
      if (enemyDamageIndicatorTimeoutRef.current) {
        clearTimeout(enemyDamageIndicatorTimeoutRef.current);
        enemyDamageIndicatorTimeoutRef.current = null;
      }
      setCombatStarted(false);
      setCurrentEnemy({ ...enemy });
      setRound(1);
      setUsedItemsInRound(new Set());
      setUsedItemsInCombat([]);
      setIsProcessingRound(false);
      setCombatEnded(false);
      setCombatResult(null);
      setEnemyDamageIndicator({ amount: 0, visible: false });
      setPlayerDamageIndicator({ amount: 0, visible: false });
      setIntegrityDamageIndicator({ amount: 0, visible: false });
      setIntegrityHealIndicator({ amount: 0, visible: false });
      setUsedCrushingStrike(false);
      setUsedBloodflameSphere(false);
      setEnemyStunnedRounds(0);
      setEnemyBurnRounds(0);
      setEnemyBurnDamage(0);
      setEnemyPoisonRounds(0);
      setEnemyPoisonDamage(0);
      setWasCriticalStrike(false);
      setPlayerStrikeFailed(false);
      setCrushingStrikeFailed(false);
      setCombatSummary(null);
      consequencesAppliedRef.current = false;
      const maxIntegrity = bastionStats.integrity;
      setMaxIntegrityForCombat(maxIntegrity);
      setCurrentIntegrity(maxIntegrity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset when the dialog opens, not when bastion stats recalculate mid-combat
  }, [isOpen, enemy]);

  // Apply combat outcome as soon as the fight ends so the result overlay can show summaries.
  useLayoutEffect(() => {
    if (
      (combatResult !== "victory" && combatResult !== "defeat") ||
      consequencesAppliedRef.current
    ) {
      return;
    }
    consequencesAppliedRef.current = true;
    if (combatResult === "victory") {
      setCombatSummary(extractCombatResultSummary(onVictory()));
    } else {
      setCombatSummary(extractCombatResultSummary(onDefeat()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per combat outcome; callbacks are stable from store
  }, [combatResult]);

  // Available combat items with max limits
  const MAX_EMBER_BOMBS = gameState.clothing.grenadier_bag ? 4 : 3;
  const MAX_CINDERFLAME_BOMBS = gameState.clothing.grenadier_bag ? 3 : 2;
  const MAX_VOID_BOMBS = gameState.clothing.grenadier_bag ? 2 : 1;
  const MAX_VEINFIRE_ELIXIRS = gameState.clothing.flask_harness ? 2 : 1;
  const NIGHTSHADE_BOW_OWNED = gameState.weapons.nightshade_bow;

  const emberBombsUsed = usedItemsInCombat.filter(
    (id) => id === "ember_bomb",
  ).length;
  const ashfireBombsUsed = usedItemsInCombat.filter(
    (id) => id === "ashfire_bomb",
  ).length;
  const voidBombsUsed = usedItemsInCombat.filter(
    (id) => id === "void_bomb",
  ).length;
  const poisonArrowsUsedInCombat = usedItemsInCombat.filter(
    (id) => id === "poison_arrows",
  ).length;

  const veinfireUsedInCombat = usedItemsInCombat.filter(
    (id) => id === "veinfire_elixir",
  ).length;

  const combatItemName = (id: string, fallback: string) =>
    getResourceName(id, fallback);

  const combatItems: CombatItem[] = [
    {
      id: "ember_bomb",
      name: combatItemName("ember_bomb", "Ember Bomb"),
      damage: BOMB_BASE_DAMAGE_BY_ID.ember_bomb,
      available:
        combatResources.ember_bomb > 0 &&
        emberBombsUsed < MAX_EMBER_BOMBS &&
        !usedItemsInRound.has("ember_bomb"),
    },
    {
      id: "ashfire_bomb",
      name: combatItemName("ashfire_bomb", "Ashfire Bomb"),
      damage: BOMB_BASE_DAMAGE_BY_ID.ashfire_bomb,
      available:
        combatResources.ashfire_bomb > 0 &&
        ashfireBombsUsed < MAX_CINDERFLAME_BOMBS &&
        !usedItemsInRound.has("ashfire_bomb"),
    },
    {
      id: "void_bomb",
      name: combatItemName("void_bomb", "Void Bomb"),
      damage: BOMB_BASE_DAMAGE_BY_ID.void_bomb,
      available:
        combatResources.void_bomb > 0 &&
        voidBombsUsed < MAX_VOID_BOMBS &&
        !usedItemsInRound.has("void_bomb"),
    },
  ];

  // Add Poison Arrows if Nightshade Bow is owned and not used yet in combat
  if (NIGHTSHADE_BOW_OWNED) {
    combatItems.push({
      id: "poison_arrows",
      name: combatItemName("poison_arrows", "Poison Arrows"),
      damage: getPoisonArrowsBaseDamage(gameState),
      available:
        poisonArrowsUsedInCombat < 1 && !usedItemsInRound.has("poison_arrows"),
    });
  }

  combatItems.push({
    id: "veinfire_elixir",
    name: combatItemName("veinfire_elixir", "Veinfire Elixir"),
    damage: 0,
    available:
      combatResources.veinfire_elixir > 0 &&
      veinfireUsedInCombat < MAX_VEINFIRE_ELIXIRS &&
      currentIntegrity < maxIntegrityForCombat &&
      !usedItemsInRound.has("veinfire_elixir"),
  });

  const handleStartFight = () => {
    setCombatStarted(true);
  };

  const handleUseCrushingStrike = () => {
    if (usedCrushingStrike || isProcessingRound) return;

    const level = crushingStrikeLevel || 0;
    const config = CRUSHING_STRIKE_UPGRADES[level];
    setUsedCrushingStrike(true);

    const hit = Math.random() < config.successChance / 100;
    if (!hit) {
      setPlayerStrikeFailed(false);
      setWasCriticalStrike(false);
      setCrushingStrikeFailed(true);
      showEnemyDamage(0);
      return;
    }

    setCrushingStrikeFailed(false);

    // Deal damage immediately
    const newEnemyHealth = Math.max(
      0,
      (currentEnemy?.currentHealth || 0) - config.damage,
    );

    // Set stun duration based on level
    setEnemyStunnedRounds(config.stunRounds);

    // Update combat state
    setCurrentEnemy((prev) =>
      prev ? { ...prev, currentHealth: newEnemyHealth } : null,
    );

    // Show damage indicator on enemy health bar
    setPlayerStrikeFailed(false);
    setWasCriticalStrike(false);
    showEnemyDamage(config.damage);

    // Check if enemy is defeated
    if (newEnemyHealth <= 0) {
      setCombatEnded(true);
      setCombatResult("victory");
    }
  };

  const handleUseBloodflameSphere = () => {
    if (usedBloodflameSphere || isProcessingRound) return;

    const level = bloodflameSphereLevel || 0;
    const config = BLOODFLAME_SPHERE_UPGRADES[level];

    // Consume health cost from integrity
    const newIntegrityValue = Math.max(0, currentIntegrity - config.healthCost);
    setCurrentIntegrity(newIntegrityValue);

    // Show integrity damage indicator (cancel prior hide so Fight damage isn't cleared early)
    showIntegrityDamage(config.healthCost);

    // Check if integrity is depleted
    if (newIntegrityValue <= 0) {
      setCombatEnded(true);
      setCombatResult("defeat");
      return;
    }

    const newEnemyHealth = Math.max(
      0,
      (currentEnemy?.currentHealth || 0) - config.burnDamage,
    );

    // Remaining burn ticks on Fight (cast consumed first of `config.burnRounds` total hits)
    setEnemyBurnRounds(bloodflameSphereFightBurnTicksAfterCast(config.burnRounds));
    setEnemyBurnDamage(config.burnDamage);
    setUsedBloodflameSphere(true);

    // Update combat state
    setCurrentEnemy((prev) =>
      prev ? { ...prev, currentHealth: newEnemyHealth } : null,
    );

    // Show damage indicator on enemy health bar
    setPlayerStrikeFailed(false);
    setCrushingStrikeFailed(false);
    setWasCriticalStrike(false);
    showEnemyDamage(config.burnDamage);

    // Check if enemy is defeated
    if (newEnemyHealth <= 0) {
      setCombatEnded(true);
      setCombatResult("victory");
    }
  };

  const handleUseItem = (item: CombatItem) => {
    if (!currentEnemy || !item.available) return;

    if (item.id === "veinfire_elixir") {
      const healAmount = Math.min(
        50,
        maxIntegrityForCombat - currentIntegrity,
      );
      // Only consume when healing applies (matches available: must be below max)
      if (healAmount <= 0) return;

      setUsedItemsInRound((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      setUsedItemsInCombat((prev) => [...prev, item.id]);

      setCurrentIntegrity((prev) => prev + healAmount);
      showIntegrityHeal(healAmount);
      gameState.updateResource("veinfire_elixir", -1);
      return;
    }

    // Use the item - track for this round and for entire combat
    setUsedItemsInRound((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    setUsedItemsInCombat((prev) => [...prev, item.id]);

    // Calculate final damage with knowledge bonus (bombs only)
    const knowledgeBonus = bombKnowledgeDamageBonus(getTotalKnowledge(gameState));
    const finalDamage = item.damage + knowledgeBonus;

    if (item.id === "poison_arrows") {
      const dmg = getPoisonArrowsDamagePerTick(gameState);
      const newEnemyHealth = Math.max(
        0,
        (currentEnemy?.currentHealth || 0) - dmg,
      );

      setEnemyPoisonDamage(dmg);
      setEnemyPoisonRounds(getPoisonArrowsDotFightRounds(gameState));

      setCurrentEnemy((prev) =>
        prev ? { ...prev, currentHealth: newEnemyHealth } : null,
      );

      setPlayerStrikeFailed(false);
      setCrushingStrikeFailed(false);
      setWasCriticalStrike(false);
      showEnemyDamage(dmg);

      if (newEnemyHealth <= 0) {
        setCombatEnded(true);
        setCombatResult("victory");
      }
    } else {
      // For bombs, apply damage directly
      const newEnemyHealth = Math.max(
        0,
        (currentEnemy?.currentHealth || 0) - finalDamage,
      );
      setCurrentEnemy((prev) =>
        prev ? { ...prev, currentHealth: newEnemyHealth } : null,
      );
      // Update game state to consume the item
      gameState.updateResource(item.id as keyof typeof gameState.resources, -1);

      // Show damage indicator on enemy health bar
      setPlayerStrikeFailed(false);
      setCrushingStrikeFailed(false);
      setWasCriticalStrike(false);
      showEnemyDamage(finalDamage);

      // 5% chance for bomb to backfire: hurt player with 100% of its damage
      const backfire = Math.random() < 0.05;
      if (backfire) {
        const newIntegrityValue = Math.max(0, currentIntegrity - finalDamage);
        setCurrentIntegrity(newIntegrityValue);
        showIntegrityDamage(finalDamage);
        if (newIntegrityValue <= 0) {
          setCombatEnded(true);
          setCombatResult("defeat");
          return;
        }
      }

      // Check if enemy is defeated by bombs
      if (newEnemyHealth <= 0) {
        setCombatEnded(true);
        setCombatResult("victory");
      }
    }
  };

  const handleEndFight = () => {
    gameState.updateBastionStats();
    onClose();
  };

  const handleFight = () => {
    if (!currentEnemy || isProcessingRound) return;

    setIsProcessingRound(true);

    let currentEnemyHealth = currentEnemy.currentHealth;
    let integrityDamage = 0;
    let playerDamage = bastionStats.attack;
    let poisonDamageDealt = 0;
    let burnDamageDealt = 0;

    // Calculate critical strike
    const totalLuck = getTotalLuck(gameState);
    const criticalChanceBonus = getTotalCriticalChance(gameState);
    const critChance =
      (calculateCriticalStrikeChance(totalLuck) + criticalChanceBonus) / 100;
    const isCritical = Math.random() < critChance;

    if (isCritical) {
      playerDamage = Math.floor(playerDamage * 1.5); // 50% extra damage
      setWasCriticalStrike(true);
    } else {
      setWasCriticalStrike(false);
    }

    const madnessFailChancePct = getCombatAttackFailChancePercent(
      getTotalMadness(gameState),
    );
    const attackFailed =
      madnessFailChancePct > 0 && Math.random() < madnessFailChancePct / 100;
    if (attackFailed) {
      playerDamage = 0;
      setWasCriticalStrike(false);
      setCrushingStrikeFailed(false);
      setPlayerStrikeFailed(true);
    } else {
      setPlayerStrikeFailed(false);
      setCrushingStrikeFailed(false);
    }

    // Apply poison damage if active (same tick pattern as burn)
    if (enemyPoisonRounds > 0) {
      poisonDamageDealt = enemyPoisonDamage;
      setEnemyPoisonRounds((prev) => Math.max(0, prev - 1));
    }

    // Apply burn damage if active (works for all rounds burn is active)
    if (enemyBurnRounds > 0) {
      burnDamageDealt = enemyBurnDamage;
      setEnemyBurnRounds((prev) => Math.max(0, prev - 1));
    }

    // Enemy attacks first (only if not stunned)
    if (enemyStunnedRounds > 0) {
      // Enemy is stunned, skip attack and decrement stun counter
      setEnemyStunnedRounds((prev) => Math.max(0, prev - 1));
    } else if (currentEnemy.attack > bastionStats.defense) {
      integrityDamage = currentEnemy.attack - bastionStats.defense;
      const newIntegrityValue = Math.max(0, currentIntegrity - integrityDamage);
      setCurrentIntegrity(newIntegrityValue);

      // Show damage indicator on integrity bar
      showIntegrityDamage(integrityDamage);

      // Check if integrity is depleted
      if (newIntegrityValue <= 0) {
        setCombatEnded(true);
        setCombatResult("defeat");
        setIsProcessingRound(false);
        return;
      }
    }

    // Player attacks
    const newHealth = Math.max(
      0,
      currentEnemyHealth - playerDamage - poisonDamageDealt - burnDamageDealt,
    );
    currentEnemyHealth = newHealth;

    // Show damage indicator on enemy health bar
    showEnemyDamage(playerDamage + poisonDamageDealt + burnDamageDealt);

    setCurrentEnemy((prev) =>
      prev ? { ...prev, currentHealth: newHealth } : null,
    );

    // Check battle outcome
    if (newHealth <= 0) {
      setCombatEnded(true);
      setCombatResult("victory");
      setIsProcessingRound(false);
    } else {
      // Next round - reset items for this round but keep total combat tracking
      setRound((prev) => prev + 1);
      setUsedItemsInRound(new Set());
      setIsProcessingRound(false);
    }
  };

  if (!enemy) return null;

  const healthPercentage = currentEnemy
    ? (currentEnemy.currentHealth / currentEnemy.maxHealth) * 100
    : 0;

  const integrityPercentage = currentIntegrity
    ? (currentIntegrity / maxIntegrityForCombat) * 100
    : 0;

  const DEFEAT_LINES_START = 3.4;
  const DEFEAT_LINE_STAGGER = 1.0;
  const defeatResultLines: { key: string; text: string; className: string }[] =
    combatSummary
      ? [
        {
          key: "casualties",
          text:
            (combatSummary.casualties ?? 0) === 0
              ? t("ui:combat.noCasualties")
              : combatSummary.casualties === 1
                ? t("ui:combat.oneCasualty")
                : t("ui:combat.manyCasualties", {
                  count: formatNumber(combatSummary.casualties!),
                }),
          className: "text-gray-400 text-sm",
        },
        ...(combatSummary.woundedFellows ?? []).map((f) => ({
          key: `fellow-${f}`,
          text: t("ui:combat.fellowInjured", {
            name: getFellowshipDisplayName(f),
          }),
          className: "text-gray-400 text-sm",
        })),
        ...(combatSummary.damagedBuildings ?? []).map((b) => ({
          key: `building-${b}`,
          text: t("ui:combat.buildingDamaged", {
            name: getDamagedBuildingDisplayName(b),
          }),
          className: "text-gray-400 text-sm",
        })),
        ...(combatSummary.madnessGain !== undefined &&
          combatSummary.madnessGain > 0
          ? [
            {
              key: "madness",
              text: t("ui:madness.change", {
                sign: "+",
                amount: formatNumber(combatSummary.madnessGain),
              }),
              className: "text-violet-300 text-sm",
            },
          ]
          : []),
      ]
      : [];
  const defeatButtonDelay =
    DEFEAT_LINES_START +
    Math.max(0, defeatResultLines.length - 1) * DEFEAT_LINE_STAGGER +
    0.4 +
    0.5;

  const VICTORY_LINES_START = 1.8;
  const VICTORY_LINE_STAGGER = 0.3;
  const victoryResultLines: { key: string; text: string; className: string }[] =
    combatSummary
      ? [
        ...(combatSummary.silverReward !== undefined &&
          combatSummary.silverReward > 0
          ? [
            {
              key: "silver",
              text: t("ui:combat.silverClaimed", {
                amount: formatNumber(combatSummary.silverReward),
              }),
              className: "text-slate-300 text-sm",
            },
          ]
          : []),
        ...(combatSummary.goldReward !== undefined &&
          combatSummary.goldReward > 0
          ? [
            {
              key: "gold",
              text: t("ui:combat.goldClaimed", {
                amount: formatNumber(combatSummary.goldReward),
              }),
              className: "text-slate-300 text-sm",
            },
          ]
          : []),
      ]
      : [];
  const victoryButtonDelay =
    VICTORY_LINES_START +
    Math.max(0, victoryResultLines.length - 1) * VICTORY_LINE_STAGGER +
    0.4 +
    0.5;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className="z-[60] [--adc-dialog-max-w:28rem] [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          hideOverlay={true}
          customBackground={isOpen ? <ProceduralGroundBackground /> : null}
        >
          {!combatStarted ? (
            // Initial event screen
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  {eventTitle}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-400 mt-2">
                  {eventMessage}
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleStartFight}
                  className={cn(
                    "w-full",
                    gameActionOutlineButtonClassName(false),
                  )}
                  variant="outline"
                  button_id="combat-start-fight"
                >
                  {t("ui:combat.startFight")}
                </Button>
              </div>
            </>
          ) : (
            // Combat interface
            <>
              <div className="relative -m-6 p-6 min-h-full">
                <DialogHeader>
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-lg font-semibold">
                      {t("ui:combat.roundTitle", { round })}
                    </DialogTitle>
                    {(() => {
                      const luckCrit = calculateCriticalStrikeChance(
                        getTotalLuck(gameState),
                      );
                      const itemCrit = getTotalCriticalChance(gameState);
                      const totalCrit = luckCrit + itemCrit;
                      const failPct = getCombatAttackFailChancePercent(
                        getTotalMadness(gameState),
                      );
                      if (totalCrit <= 0 && failPct <= 0) return null;
                      return (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs space-y-2 max-w-[220px]">
                              {totalCrit > 0 && (
                                <div className="space-y-1">
                                  <div>
                                    {t("ui:combat.critChance", {
                                      percent: totalCrit,
                                    })}
                                  </div>
                                  {luckCrit > 0 && (
                                    <div className="text-gray-400/70">
                                      {t("ui:combat.critFromLuck", {
                                        percent: luckCrit,
                                        stat: getStatName("luck", "Luck"),
                                        maxSuffix:
                                          getTotalLuck(gameState) >= 50
                                            ? t("ui:combat.critFromLuckMaxSuffix")
                                            : "",
                                      })}
                                    </div>
                                  )}
                                  {itemCrit > 0 && (
                                    <div className="text-gray-400/70">
                                      {t("ui:combat.critFromItems", {
                                        percent: itemCrit,
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                              {failPct > 0 && (
                                <div
                                  className={
                                    totalCrit > 0
                                      ? "pt-1 border-t border-gray-600/50"
                                      : ""
                                  }
                                >
                                  <div className="text-gray-300">
                                    {t("ui:combat.missChance", {
                                      percent: failPct,
                                      stat: getStatName("madness", "Madness"),
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          }
                          tooltipId="combat-luck-madness"
                          tooltipContentClassName="max-w-xs"
                          disabled
                          className="inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <span
                            className="font-noto-symbols-2 inline-flex shrink-0 items-center justify-center text-sm font-normal leading-none"
                            aria-label={t("ui:combat.attackDetailsAria")}
                          >
                            🛈
                          </span>
                        </TooltipWrapper>
                      );
                    })()}
                  </div>
                </DialogHeader>

                {/* Enemy Stats */}
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">
                          {currentEnemy?.name
                            ? getCombatEnemyDisplayName(currentEnemy.name)
                            : null}
                        </span>
                        {NIGHTSHADE_BOW_OWNED &&
                          usedItemsInCombat.includes("poison_arrows") && (
                            <span
                              className="font-noto-symbols-2 inline-flex translate-y-0.5 leading-none text-green-600"
                              role="img"
                              aria-label="poison-icon"
                            >
                              ▲
                            </span>
                          )}
                        {enemyStunnedRounds > 0 && (
                          <span
                            className="font-noto-symbols-2 inline-flex translate-y-0.5 leading-none text-yellow-600"
                            role="img"
                            aria-label="stun-icon"
                          >
                            ◈
                          </span>
                        )}
                        {enemyBurnRounds > 0 && (
                          <span
                            className="font-noto-symbols-2 inline-flex translate-y-0.5 leading-none text-orange-600"
                            role="img"
                            aria-label="burn-icon"
                          >
                            ✵
                          </span>
                        )}
                      </div>
                      <TooltipWrapper
                        tooltip={
                          <span className="text-gray-400">
                            {t("ui:combat.integrity")}
                          </span>
                        }
                        tooltipId="combat-enemy-integrity-symbol"
                        disabled
                        className="inline-block"
                      >
                        <span className="flex items-center gap-1">
                          <span className="font-noto-symbols-2 inline-flex w-4 translate-y-0.5 justify-center text-green-400/60 leading-none">
                            ✚
                          </span>
                          <span>
                            {formatNumber(currentEnemy?.currentHealth ?? 0)}/
                            {formatNumber(currentEnemy?.maxHealth ?? 0)}
                          </span>
                        </span>
                      </TooltipWrapper>
                    </div>
                    <div className="relative">
                      <Progress
                        value={healthPercentage}
                        hideBorder
                        flashOnDecrease
                        growAnimationMs={COMBAT_BAR_CHANGE_MS}
                        emitCirclesOnDecrease
                        indicatorClassName="bg-red-900"
                        className="h-2 mt-2"
                      />
                      {enemyDamageIndicator.visible && (
                        <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-red-900 font-bold text-sm pointer-events-none">
                          {playerStrikeFailed || crushingStrikeFailed ? (
                            enemyDamageIndicator.amount > 0 ? (
                              <>
                                -{formatNumber(enemyDamageIndicator.amount)} (
                                {playerStrikeFailed
                                  ? t("ui:combat.attackFailed")
                                  : t("ui:combat.crushingStrikeFailed")}
                                )
                              </>
                            ) : playerStrikeFailed ? (
                              t("ui:combat.attackFailed")
                            ) : (
                              t("ui:combat.crushingStrikeFailed")
                            )
                          ) : (
                            <>
                              -{formatNumber(enemyDamageIndicator.amount)}
                              {wasCriticalStrike &&
                                ` (${t("ui:combat.critical")})`}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <TooltipWrapper
                      tooltip={
                        <span className="text-gray-400">
                          {t("ui:combat.attack")}
                        </span>
                      }
                      tooltipId="combat-enemy-attack-symbol"
                      disabled
                      className="inline-block"
                    >
                      <div className="text-xs mt-2 flex items-center gap-1">
                        <span className="font-noto-symbols-2 inline-flex w-4 justify-center text-red-400/60">
                          ⟐
                        </span>
                        <span>{formatNumber(currentEnemy?.attack ?? 0)}</span>
                      </div>
                    </TooltipWrapper>
                  </div>

                  {/* Player Stats */}
                  <div className="pt-3">
                    {/* Bastion Integrity */}
                    <div className="relative">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          {hasFortress
                            ? t("ui:combat.fortress")
                            : t("ui:combat.bastion")}
                        </span>
                        <TooltipWrapper
                          tooltip={
                            <span className="text-gray-400">
                              {t("ui:combat.integrity")}
                            </span>
                          }
                          tooltipId="combat-player-integrity-symbol"
                          disabled
                          className="inline-block"
                        >
                          <span className="flex items-center gap-1">
                            <span className="font-noto-symbols-2 inline-flex w-4 translate-y-0.5 justify-center text-green-400/60 leading-none">
                              ✚
                            </span>
                            <span>
                              {formatNumber(currentIntegrity)}/
                              {formatNumber(maxIntegrityForCombat)}
                            </span>
                          </span>
                        </TooltipWrapper>
                      </div>
                      <div className="relative">
                        <Progress
                          value={integrityPercentage}
                          hideBorder
                          flashOnDecrease
                          growAnimationMs={COMBAT_BAR_CHANGE_MS}
                          emitSparksOnGrow
                          growSparkIntensity="subtle"
                          growSparkTipGlow={false}
                          emitCirclesOnDecrease
                          indicatorClassName="bg-green-900"
                          className="h-2 mt-2"
                        />
                        {integrityDamageIndicator.visible && (
                          <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-green-900 font-bold text-sm pointer-events-none">
                            -{formatNumber(integrityDamageIndicator.amount)}
                          </div>
                        )}
                        {integrityHealIndicator.visible && (
                          <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-green-400 font-bold text-sm pointer-events-none">
                            +{formatNumber(integrityHealIndicator.amount)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs mt-2 flex items-center gap-3">
                      <TooltipWrapper
                        tooltip={
                          <span className="text-gray-400">
                            {t("ui:combat.attack")}
                          </span>
                        }
                        tooltipId="combat-player-attack-symbol"
                        disabled
                        className="inline-block"
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-noto-symbols-2 inline-flex w-4 justify-center text-red-400/60">
                            ⟐
                          </span>
                          <span>{formatNumber(bastionStats.attack)}</span>
                        </div>
                      </TooltipWrapper>
                      <TooltipWrapper
                        tooltip={
                          <span className="text-gray-400">
                            {t("ui:combat.defense")}
                          </span>
                        }
                        tooltipId="combat-player-defense-symbol"
                        disabled
                        className="inline-block"
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-noto-symbols-2 inline-flex w-4 justify-center text-blue-400/60">
                            ⧈
                          </span>
                          <span>{formatNumber(bastionStats.defense)}</span>
                        </div>
                      </TooltipWrapper>
                    </div>
                  </div>

                  {/* Combat Items */}
                  {combatItems.some((item) =>
                    item.id === "poison_arrows"
                      ? NIGHTSHADE_BOW_OWNED
                      : (combatResources[
                        item.id as keyof typeof combatResources
                      ] ?? 0) > 0,
                  ) && (
                      <div className="pt-3">
                        <div className="text-sm font-medium mb-2">
                          {t("ui:combat.items")}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {combatItems
                            .filter((item) =>
                              item.id === "poison_arrows"
                                ? NIGHTSHADE_BOW_OWNED
                                : (combatResources[
                                  item.id as keyof typeof combatResources
                                ] ?? 0) > 0,
                            )
                            .map((item) => {
                              const tooltipConfig = combatItemTooltips[item.id];
                              const tooltipContent = tooltipConfig
                                ? tooltipConfig.getContent(gameState)
                                : "";
                              const formatAvailable = (current: number, max: number) =>
                                t("ui:combat.available", { current, max });
                              const availabilityText =
                                item.id === "poison_arrows"
                                  ? formatAvailable(
                                    poisonArrowsUsedInCombat < 1 ? 1 : 0,
                                    1,
                                  )
                                  : item.id === "veinfire_elixir"
                                    ? formatAvailable(
                                      MAX_VEINFIRE_ELIXIRS - veinfireUsedInCombat,
                                      MAX_VEINFIRE_ELIXIRS,
                                    )
                                    : item.id === "ember_bomb"
                                      ? formatAvailable(
                                        MAX_EMBER_BOMBS - emberBombsUsed,
                                        MAX_EMBER_BOMBS,
                                      )
                                      : item.id === "ashfire_bomb"
                                        ? formatAvailable(
                                          MAX_CINDERFLAME_BOMBS -
                                          ashfireBombsUsed,
                                          MAX_CINDERFLAME_BOMBS,
                                        )
                                        : item.id === "void_bomb"
                                          ? formatAvailable(
                                            MAX_VOID_BOMBS - voidBombsUsed,
                                            MAX_VOID_BOMBS,
                                          )
                                          : "";

                              return (
                                <TooltipWrapper
                                  key={item.id}
                                  tooltip={
                                    <div className="text-xs whitespace-pre-line">
                                      {tooltipContent}
                                      {"\n"}
                                      {availabilityText}
                                    </div>
                                  }
                                  tooltipId={`combat-item-${item.id}`}
                                  disabled={!item.available || isProcessingRound}
                                  onClick={() => handleUseItem(item)}
                                >
                                  <div className="w-full">
                                    <Button
                                      onClick={() => handleUseItem(item)}
                                      disabled={
                                        !item.available || isProcessingRound
                                      }
                                      variant="outline"
                                      size="sm"
                                      className={cn(
                                        "text-xs w-full inline-flex items-center justify-center gap-1",
                                        gameActionOutlineButtonClassName(
                                          !item.available || isProcessingRound,
                                        ),
                                      )}
                                      button_id={`combat-use-${item.id}`}
                                    >
                                      {item.id === "poison_arrows" && (
                                        <span
                                          className="font-noto-symbols-2 inline-flex translate-y-0.5 leading-none text-green-600"
                                          role="img"
                                          aria-label="poison-icon"
                                        >
                                          ▲
                                        </span>
                                      )}
                                      {item.name}
                                    </Button>
                                  </div>
                                </TooltipWrapper>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  {/* Combat Skills Section - only show if any fellowship member is unlocked */}
                  {(HAS_RESTLESS_KNIGHT || HAS_ELDER_WIZARD) && (
                    <div className="pt-3">
                      <div className="text-sm font-medium mb-2">
                        {t("ui:combat.skillsTitle")}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {HAS_RESTLESS_KNIGHT && (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs whitespace-pre-line">
                                {gameState.story?.seen?.restlessKnightWounded
                                  ? t("ui:combat.restlessKnightWounded")
                                  : `${combatItemTooltips.crushing_strike.getContent(gameState)}\n${t("ui:combat.available", {
                                    current: usedCrushingStrike ? 0 : 1,
                                    max: 1,
                                  })}`}
                              </div>
                            }
                            tooltipId="combat-crushing-strike"
                            disabled={
                              usedCrushingStrike ||
                              isProcessingRound ||
                              isRestlessKnightWounded
                            }
                            onClick={handleUseCrushingStrike}
                          >
                            <div className="w-full">
                              <Button
                                onClick={handleUseCrushingStrike}
                                disabled={
                                  usedCrushingStrike ||
                                  isProcessingRound ||
                                  isRestlessKnightWounded
                                }
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "text-xs w-full inline-flex items-center justify-center gap-1",
                                  gameActionOutlineButtonClassName(
                                    usedCrushingStrike ||
                                    isProcessingRound ||
                                    isRestlessKnightWounded,
                                  ),
                                )}
                                button_id="combat-use-crushing-strike"
                              >
                                <span
                                  className="font-noto-symbols-2 inline-flex translate-y-0.5 leading-none text-yellow-600"
                                  role="img"
                                  aria-label="stun-icon"
                                >
                                  ◈
                                </span>
                                {t("ui:combat.crushingStrike")}
                              </Button>
                            </div>
                          </TooltipWrapper>
                        )}
                        {HAS_ELDER_WIZARD && (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs whitespace-pre-line">
                                {gameState.story?.seen?.elderWizardWounded
                                  ? t("ui:combat.elderWizardWounded")
                                  : `${combatItemTooltips.bloodflame_sphere.getContent(gameState)}\n${t("ui:combat.available", {
                                    current: usedBloodflameSphere ? 0 : 1,
                                    max: 1,
                                  })}`}
                              </div>
                            }
                            tooltipId="combat-bloodflame-sphere"
                            disabled={
                              usedBloodflameSphere ||
                              isProcessingRound ||
                              currentIntegrity <=
                              BLOODFLAME_SPHERE_UPGRADES[
                                bloodflameSphereLevel
                              ].healthCost ||
                              isElderWizardWounded
                            }
                            onClick={handleUseBloodflameSphere}
                          >
                            <div className="w-full">
                              <Button
                                onClick={handleUseBloodflameSphere}
                                disabled={
                                  usedBloodflameSphere ||
                                  isProcessingRound ||
                                  currentIntegrity <=
                                  BLOODFLAME_SPHERE_UPGRADES[
                                    bloodflameSphereLevel
                                  ].healthCost ||
                                  isElderWizardWounded
                                }
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "text-xs w-full inline-flex items-center justify-center gap-1",
                                  gameActionOutlineButtonClassName(
                                    usedBloodflameSphere ||
                                    isProcessingRound ||
                                    currentIntegrity <=
                                    BLOODFLAME_SPHERE_UPGRADES[
                                      bloodflameSphereLevel
                                    ].healthCost ||
                                    isElderWizardWounded,
                                  ),
                                )}
                                button_id="combat-use-bloodflame-sphere"
                              >
                                <span
                                  className="font-noto-symbols-2 inline-flex translate-y-0.5 leading-none text-orange-600"
                                  role="img"
                                  aria-label="burn-icon"
                                >
                                  ✵
                                </span>
                                {t("ui:combat.bloodflameSphere")}
                              </Button>
                            </div>
                          </TooltipWrapper>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fight Button — overlays replace this once combat ends */}
                <div className="pt-3">
                  {!combatEnded ? (
                    <Button
                      onClick={handleFight}
                      disabled={
                        isProcessingRound ||
                        (currentEnemy?.currentHealth || 0) <= 0
                      }
                      className={cn(
                        "w-full",
                        gameActionOutlineButtonClassName(
                          isProcessingRound ||
                          (currentEnemy?.currentHealth || 0) <= 0,
                        ),
                      )}
                      variant="outline"
                      button_id="combat-fight"
                    >
                      {isProcessingRound
                        ? t("ui:combat.fighting")
                        : t("ui:combat.fight")}
                    </Button>
                  ) : null}
                </div>

                <AnimatePresence>
                  {combatResult === "defeat" && combatSummary !== null && (
                    <motion.div
                      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-6"
                      initial={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
                      animate={{ backgroundColor: "rgba(0, 0, 0, 1)" }}
                      transition={{ duration: 1.5, ease: "easeIn" }}
                    >
                      <div className="-mt-16 flex flex-col items-center">
                        <motion.span
                          className="font-sans text-red-700 text-xl tracking-[0.25em] uppercase select-none defeat-text-pulse"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 1, 0.8] }}
                          transition={{
                            duration: 2,
                            delay: 1.5,
                            ease: "easeInOut",
                          }}
                        >
                          {t("ui:combat.youLost")}
                        </motion.span>

                        <div className="mt-5 flex flex-col items-center gap-1 text-center">
                          {defeatResultLines.map((line, i) => (
                            <motion.p
                              key={line.key}
                              className={line.className}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                duration: 0.4,
                                delay:
                                  DEFEAT_LINES_START + i * DEFEAT_LINE_STAGGER,
                              }}
                            >
                              {line.text}
                            </motion.p>
                          ))}
                        </div>
                      </div>

                      <motion.div
                        className="absolute bottom-6 left-6 right-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: defeatButtonDelay,
                        }}
                      >
                        <Button
                          onClick={handleEndFight}
                          className="w-full"
                          variant="outline"
                          button_id="combat-end-fight"
                        >
                          {t("common:buttons.continue")}
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {combatResult === "victory" && combatSummary !== null && (
                    <motion.div
                      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.8, ease: "easeIn" }}
                    >
                      <div className="-mt-16 flex flex-col items-center">
                        <motion.span
                          className="font-sans text-white text-xl tracking-[0.25em] uppercase select-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 1.2,
                            delay: 0.3,
                            ease: "easeInOut",
                          }}
                        >
                          {t("ui:combat.youWin")}
                        </motion.span>

                        <div className="mt-5 flex flex-col items-center gap-1 text-center">
                          {victoryResultLines.map((line, i) => (
                            <motion.p
                              key={line.key}
                              className={line.className}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{
                                duration: 0.4,
                                delay:
                                  VICTORY_LINES_START +
                                  i * VICTORY_LINE_STAGGER,
                              }}
                            >
                              {line.text}
                            </motion.p>
                          ))}
                        </div>
                      </div>

                      <motion.div
                        className="absolute bottom-6 left-6 right-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: victoryButtonDelay,
                        }}
                      >
                        <Button
                          onClick={handleEndFight}
                          className="w-full"
                          variant="outline"
                          button_id="combat-end-fight"
                        >
                          {t("common:buttons.continue")}
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
