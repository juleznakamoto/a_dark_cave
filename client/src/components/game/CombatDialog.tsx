import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import { calculateBastionStats } from "@/game/bastionStats";
import {
  getTotalKnowledge,
  getTotalLuck,
  getTotalCriticalChance,
} from "@/game/rules/effectsCalculation";
import { combatItemTooltips } from "@/game/rules/tooltips";
import { calculateCriticalStrikeChance } from "@/game/rules/effectsStats";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  CRUSHING_STRIKE_UPGRADES,
} from "@/game/rules/skillUpgrades";
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
import { Enemy, CombatItem } from "@/game/types";
import { ProceduralGroundBackground } from "@/components/ui/procedural-ground-background";

interface CombatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enemy: Enemy | null;
  eventTitle: string;
  eventMessage: string;
  onVictory: () => void;
  onDefeat: () => void;
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
  const gameState = useGameStore.getState();
  const crushingStrikeLevel = useGameStore(
    (state) => state.combatSkills.crushingStrikeLevel,
  );
  const bloodflameSphereLevel = useGameStore(
    (state) => state.combatSkills.bloodflameSphereLevel,
  );

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
  const [usedCrushingStrike, setUsedCrushingStrike] = useState(false);
  const [usedBloodflameSphere, setUsedBloodflameSphere] = useState(false);
  const [enemyStunnedRounds, setEnemyStunnedRounds] = useState(0);
  const [enemyBurnRounds, setEnemyBurnRounds] = useState(0);
  const [enemyBurnDamage, setEnemyBurnDamage] = useState(0);
  const [wasCriticalStrike, setWasCriticalStrike] = useState(false);

  const HAS_RESTLESS_KNIGHT = gameState.fellowship.restless_knight || false;
  const HAS_ELDER_WIZARD = gameState.fellowship.elder_wizard || false;

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

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && enemy) {
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
      setUsedCrushingStrike(false);
      setUsedBloodflameSphere(false);
      setEnemyStunnedRounds(0);
      setEnemyBurnRounds(0);
      setEnemyBurnDamage(0);
      setWasCriticalStrike(false);
      const maxIntegrity = bastionStats.integrity;
      setMaxIntegrityForCombat(maxIntegrity);
      setCurrentIntegrity(maxIntegrity);
    }
  }, [
    isOpen,
    enemy,
    bastionStats.defense,
    bastionStats.attackFromFortifications,
    bastionStats.integrity, // Added integrity to dependency array
  ]);

  // Available combat items with max limits
  const MAX_EMBER_BOMBS = gameState.clothing.grenadier_bag ? 4 : 3;
  const MAX_CINDERFLAME_BOMBS = gameState.clothing.grenadier_bag ? 3 : 2;
  const MAX_VOID_BOMBS = gameState.clothing.grenadier_bag ? 2 : 1;
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

  const combatItems: CombatItem[] = [
    {
      id: "ember_bomb",
      name: "Ember Bomb",
      damage: 10,
      available:
        gameState.resources.ember_bomb > 0 &&
        emberBombsUsed < MAX_EMBER_BOMBS &&
        !usedItemsInRound.has("ember_bomb"),
    },
    {
      id: "ashfire_bomb",
      name: "Ashfire Bomb",
      damage: 25,
      available:
        gameState.resources.ashfire_bomb > 0 &&
        ashfireBombsUsed < MAX_CINDERFLAME_BOMBS &&
        !usedItemsInRound.has("ashfire_bomb"),
    },
    {
      id: "void_bomb",
      name: "Void Bomb",
      damage: 40,
      available:
        gameState.resources.void_bomb > 0 &&
        voidBombsUsed < MAX_VOID_BOMBS &&
        !usedItemsInRound.has("void_bomb"),
    },
  ];

  // Add Poison Arrows if Nightshade Bow is owned and not used yet in combat
  if (NIGHTSHADE_BOW_OWNED) {
    combatItems.push({
      id: "poison_arrows",
      name: "Poison Arrows",
      damage: 15, // Base damage, will be applied per round
      available:
        poisonArrowsUsedInCombat < 1 && !usedItemsInRound.has("poison_arrows"),
    });
  }

  const handleStartFight = () => {
    setCombatStarted(true);
  };

  const handleUseCrushingStrike = () => {
    if (usedCrushingStrike || isProcessingRound) return;

    const level = crushingStrikeLevel || 0;
    const config = CRUSHING_STRIKE_UPGRADES[level];

    // Deal damage immediately
    const newEnemyHealth = Math.max(
      0,
      (currentEnemy?.currentHealth || 0) - config.damage,
    );

    // Set stun duration based on level
    setEnemyStunnedRounds(config.stunRounds);
    setUsedCrushingStrike(true);

    // Update combat state
    setCurrentEnemy((prev) =>
      prev ? { ...prev, currentHealth: newEnemyHealth } : null,
    );

    // Show damage indicator on enemy health bar
    setEnemyDamageIndicator({ amount: config.damage, visible: true });
    setTimeout(() => {
      setEnemyDamageIndicator({ amount: 0, visible: false });
    }, 3000);

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

    // Show integrity damage indicator
    setIntegrityDamageIndicator({ amount: config.healthCost, visible: true });
    setTimeout(() => {
      setIntegrityDamageIndicator({ amount: 0, visible: false });
    }, 3000);

    // Check if integrity is depleted
    if (newIntegrityValue <= 0) {
      setCombatEnded(true);
      setCombatResult("defeat");
      return;
    }

    // Apply immediate base damage
    const newEnemyHealth = Math.max(
      0,
      (currentEnemy?.currentHealth || 0) - config.damage,
    );

    // Set burn effect for subsequent rounds
    setEnemyBurnRounds(config.burnRounds);
    setEnemyBurnDamage(config.burnDamage);
    setUsedBloodflameSphere(true);

    // Update combat state
    setCurrentEnemy((prev) =>
      prev ? { ...prev, currentHealth: newEnemyHealth } : null,
    );

    // Show damage indicator on enemy health bar
    setEnemyDamageIndicator({ amount: config.damage, visible: true });
    setTimeout(() => {
      setEnemyDamageIndicator({ amount: 0, visible: false });
    }, 3000);

    // Check if enemy is defeated
    if (newEnemyHealth <= 0) {
      setCombatEnded(true);
      setCombatResult("victory");
    }
  };

  const handleUseItem = (item: CombatItem) => {
    if (!currentEnemy || !item.available) return;

    // Calculate final damage with knowledge bonus
    const totalKnowledge = getTotalKnowledge(gameState);
    const knowledgeBonus = Math.floor(totalKnowledge / 5);
    const finalDamage = item.damage + knowledgeBonus;

    // Use the item - track for this round and for entire combat
    setUsedItemsInRound((prev) => new Set([...prev, item.id]));
    setUsedItemsInCombat((prev) => [...prev, item.id]);

    if (item.id === "poison_arrows") {
      // Poison Arrows apply damage over time and have a special effect
      // For now, we just mark it as used and will handle damage application in handleFight
      // The icon indication logic will also be in handleFight or a separate effect
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
      setEnemyDamageIndicator({ amount: finalDamage, visible: true });
      setTimeout(() => {
        setEnemyDamageIndicator({ amount: 0, visible: false });
      }, 3000);

      // Check if enemy is defeated by bombs
      if (newEnemyHealth <= 0) {
        setCombatEnded(true);
        setCombatResult("victory");
      }
    }
  };

  const handleEndFight = () => {
    if (combatResult === "victory") {
      const victoryResult = onVictory();
      // Add victory message to log if present
      if (victoryResult && victoryResult._logMessage) {
        gameState.addLogEntry({
          id: `combat-victory-${Date.now()}`,
          message: victoryResult._logMessage,
          timestamp: Date.now(),
          type: "system",
        });
      }
    } else if (combatResult === "defeat") {
      const defeatResult = onDefeat();
      // Add defeat message to log if present
      if (defeatResult && defeatResult._logMessage) {
        gameState.addLogEntry({
          id: `combat-defeat-${Date.now()}`,
          message: defeatResult._logMessage,
          timestamp: Date.now(),
          type: "system",
        });
      }
    }

    // Update bastion stats after combat to reflect any building damage
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

    // Apply poison damage if active (works for all rounds poison is active)
    const poisonArrowsUsedThisRound = usedItemsInRound.has("poison_arrows");
    if (NIGHTSHADE_BOW_OWNED && poisonArrowsUsedThisRound) {
      const totalKnowledge = getTotalKnowledge(gameState);
      const knowledgeBonus = Math.floor(totalKnowledge / 5);
      poisonDamageDealt = 15 + knowledgeBonus; // Base 15 damage + knowledge bonus
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
      setIntegrityDamageIndicator({ amount: integrityDamage, visible: true });
      setTimeout(() => {
        setIntegrityDamageIndicator({ amount: 0, visible: false });
      }, 3000);

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
    setEnemyDamageIndicator({
      amount: playerDamage + poisonDamageDealt + burnDamageDealt,
      visible: true,
    });
    setTimeout(() => {
      setEnemyDamageIndicator({ amount: 0, visible: false });
      setWasCriticalStrike(false);
    }, 3000);

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className="w-[95vw] sm:max-w-md [&>button]:hidden"
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
                  className="w-full"
                  variant="outline"
                  button_id="combat-start-fight"
                >
                  Start Fight
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
                      Combat - Round {round}
                    </DialogTitle>
                    {calculateCriticalStrikeChance(getTotalLuck(gameState)) +
                      getTotalCriticalChance(gameState) >
                      0 && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs whitespace-nowrap">
                              {/* First line normal */}
                              {calculateCriticalStrikeChance(
                                getTotalLuck(gameState),
                              ) + getTotalCriticalChance(gameState)}
                              % critical strike chance
                              <br />
                              {/* Other lines muted */}
                              <span className="text-gray-400/70">
                                {calculateCriticalStrikeChance(
                                  getTotalLuck(gameState),
                                ) > 0 &&
                                  ` ${calculateCriticalStrikeChance(getTotalLuck(gameState))}% from Luck${getTotalLuck(gameState) >= 50 ? " max" : ""
                                  }`}
                              </span>
                              <br />
                              <span className="text-gray-400/70">
                                {getTotalCriticalChance(gameState) > 0 &&
                                  `${calculateCriticalStrikeChance(getTotalLuck(gameState)) > 0 ? "" : ""}${getTotalCriticalChance(
                                    gameState,
                                  )}% from Items`}
                              </span>
                            </div>
                          }
                          tooltipId="combat-luck"
                        >
                          <span className="text-green-300/80 cursor-pointer hover:text-green-300 transition-colors inline-block text-xl">
                            ☆
                          </span>
                        </TooltipWrapper>
                      )}
                  </div>
                </DialogHeader>

                {/* Enemy Stats */}
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{currentEnemy?.name}</span>
                        {NIGHTSHADE_BOW_OWNED &&
                          usedItemsInCombat.includes("poison_arrows") && (
                            <span
                              className="text-green-600"
                              role="img"
                              aria-label="poison-icon"
                            >
                              ▲
                            </span>
                          )}
                        {enemyStunnedRounds > 0 && (
                          <span
                            className="text-yellow-600"
                            role="img"
                            aria-label="stun-icon"
                          >
                            ◈
                          </span>
                        )}
                        {enemyBurnRounds > 0 && (
                          <span
                            className="text-orange-600"
                            role="img"
                            aria-label="burn-icon"
                          >
                            ✵
                          </span>
                        )}
                      </div>
                      <span>
                        {currentEnemy?.currentHealth}/
                        {currentEnemy?.maxHealth}{" "}
                      </span>
                    </div>
                    <div className="relative">
                      <Progress
                        value={healthPercentage}
                        hideBorder
                        flashOnDecrease
                        className="h-2 mt-2 [&>div]:bg-red-900" // Darker red for enemy health
                      />
                      {enemyDamageIndicator.visible && (
                        <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-red-900 font-bold text-sm pointer-events-none">
                          -{enemyDamageIndicator.amount}
                          {wasCriticalStrike && " (critical)"}
                        </div>
                      )}
                    </div>
                    <div className="text-xs mt-2">
                      Attack: {currentEnemy?.attack}
                    </div>
                  </div>

                  {/* Player Stats */}
                  <div className="pt-3">
                    {/* Bastion Integrity */}
                    <div className="relative">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Bastion Integrity</span>
                        <span>
                          {currentIntegrity}/{maxIntegrityForCombat}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={integrityPercentage}
                          hideBorder
                          flashOnDecrease
                          className="h-2 mt-2 [&>div]:bg-green-900" // Darker green for bastion integrity
                        />
                        {integrityDamageIndicator.visible && (
                          <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-green-900 font-bold text-sm pointer-events-none">
                            -{integrityDamageIndicator.amount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs mt-2">
                      <div>
                        Attack: {bastionStats.attack}, Defense:{" "}
                        {bastionStats.defense}
                      </div>
                    </div>
                  </div>

                  {/* Combat Items */}
                  {combatItems.some((item) =>
                    item.id === "ember_bomb" || item.id === "ashfire_bomb"
                      ? gameState.resources[
                      item.id as keyof typeof gameState.resources
                      ] > 0
                      : item.id === "poison_arrows" && NIGHTSHADE_BOW_OWNED,
                  ) && (
                      <div className="pt-3">
                        <div className="text-sm font-medium mb-2">Items</div>
                        <div className="grid grid-cols-2 gap-2">
                          {combatItems
                            .filter((item) => {
                              if (item.id === "poison_arrows") {
                                return NIGHTSHADE_BOW_OWNED;
                              }
                              return (
                                gameState.resources[
                                item.id as keyof typeof gameState.resources
                                ] > 0
                              );
                            })
                            .map((item) => {
                              const tooltipConfig = combatItemTooltips[item.id];
                              const tooltipContent = tooltipConfig
                                ? tooltipConfig.getContent(gameState)
                                : "";
                              const availabilityText =
                                item.id === "poison_arrows"
                                  ? `Available: ${poisonArrowsUsedInCombat < 1 ? "1/1" : "0/1"}`
                                  : item.id === "ember_bomb"
                                    ? `Available: ${MAX_EMBER_BOMBS - emberBombsUsed}/${MAX_EMBER_BOMBS}`
                                    : item.id === "ashfire_bomb"
                                      ? `Available: ${MAX_CINDERFLAME_BOMBS - ashfireBombsUsed}/${MAX_CINDERFLAME_BOMBS}`
                                      : item.id === "void_bomb"
                                        ? `Available: ${MAX_VOID_BOMBS - voidBombsUsed}/${MAX_VOID_BOMBS}`
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
                                >
                                  <div className="w-full">
                                    <Button
                                      onClick={() => handleUseItem(item)}
                                      disabled={
                                        !item.available || isProcessingRound
                                      }
                                      variant="outline"
                                      size="sm"
                                      className="text-xs w-full"
                                      button_id={`combat-use-${item.id}`}
                                    >
                                      {item.id === "poison_arrows" && (
                                        <span
                                          className="text-green-600"
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
                        Combat Skills
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {HAS_RESTLESS_KNIGHT && (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs whitespace-pre-line">
                                {gameState.story?.seen?.restlessKnightWounded
                                  ? "Restless Knight is wounded and cannot fight"
                                  : `${combatItemTooltips.crushing_strike.getContent(gameState)}\nAvailable: ${usedCrushingStrike ? "0/1" : "1/1"}`}
                              </div>
                            }
                            tooltipId="combat-crushing-strike"
                            disabled={
                              usedCrushingStrike ||
                              isProcessingRound ||
                              gameState.story?.seen?.restlessKnightWounded
                            }
                            onClick={handleUseCrushingStrike}
                          >
                            <div className="w-full">
                              <Button
                                onClick={handleUseCrushingStrike}
                                disabled={
                                  usedCrushingStrike ||
                                  isProcessingRound ||
                                  gameState.story?.seen?.restlessKnightWounded
                                }
                                variant="outline"
                                size="sm"
                                className="text-xs w-full"
                                button_id="combat-use-crushing-strike"
                              >
                                <span
                                  className="text-yellow-600"
                                  role="img"
                                  aria-label="stun-icon"
                                >
                                  ◈
                                </span>
                                Crushing Strike
                              </Button>
                            </div>
                          </TooltipWrapper>
                        )}
                        {HAS_ELDER_WIZARD && (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs whitespace-pre-line">
                                {gameState.story?.seen?.elderWizardWounded
                                  ? "Elder Wizard is wounded and cannot cast spells"
                                  : `${combatItemTooltips.bloodflame_sphere.getContent(gameState)}\nAvailable: ${usedBloodflameSphere ? "0/1" : "1/1"}`}
                              </div>
                            }
                            tooltipId="combat-bloodflame-sphere"
                            disabled={
                              usedBloodflameSphere ||
                              isProcessingRound ||
                              currentIntegrity <=
                              BLOODFLAME_SPHERE_UPGRADES[bloodflameSphereLevel]
                                .healthCost ||
                              gameState.story?.seen?.elderWizardWounded
                            }
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
                                  gameState.story?.seen?.elderWizardWounded
                                }
                                variant="outline"
                                size="sm"
                                className="text-xs w-full"
                                button_id="combat-use-bloodflame-sphere"
                              >
                                <span
                                  className="text-orange-600"
                                  role="img"
                                  aria-label="burn-icon"
                                >
                                  ✵
                                </span>
                                Bloodflame Sphere
                              </Button>
                            </div>
                          </TooltipWrapper>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fight / End Fight (victory only) Button */}
                  <div className="pt-3">
                    {combatEnded && combatResult === "victory" ? (
                      <Button
                        onClick={handleEndFight}
                        className="w-full"
                        variant="outline"
                        button_id="combat-end-fight"
                      >
                        End Fight
                      </Button>
                    ) : !combatEnded ? (
                      <Button
                        onClick={handleFight}
                        disabled={
                          isProcessingRound ||
                          (currentEnemy?.currentHealth || 0) <= 0
                        }
                        className="w-full"
                        variant="outline"
                        button_id="combat-fight"
                      >
                        {isProcessingRound ? "Fighting..." : "Fight"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Defeat overlay - Dark Souls style, fills entire dialog */}
                <AnimatePresence>
                  {combatResult === "defeat" && (
                    <motion.div
                      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black"
                      initial={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
                      animate={{ backgroundColor: "rgba(0, 0, 0, 1)" }}
                      transition={{ duration: 1.5, ease: "easeIn" }}
                    >
                      <motion.span
                        className="font-sans text-red-700 text-xl tracking-[0.25em] uppercase select-none defeat-text-pulse"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0.8] }}
                        transition={{ duration: 2, delay: 1.5, ease: "easeInOut" }}
                      >
                        You lost
                      </motion.span>
                      <motion.div
                        className="absolute bottom-6 left-6 right-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 3.5 }}
                      >
                        <Button
                          onClick={handleEndFight}
                          className="w-full"
                          variant="outline"
                          button_id="combat-end-fight"
                        >
                          End Fight
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
