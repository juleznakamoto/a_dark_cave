import React, { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { calculateBastionStats } from "@/game/bastionStats";
import { getTotalKnowledge } from "@/game/rules/effectsCalculation";
import { combatItemTooltips } from "@/game/rules/tooltips";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Enemy {
  name: string;
  attack: number;
  maxHealth: number;
  currentHealth: number;
}

interface CombatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enemy: Enemy | null;
  eventTitle: string;
  eventMessage: string;
  onVictory: () => void;
  onDefeat: () => void;
}

interface CombatItem {
  id: string;
  name: string;
  damage: number;
  available: boolean;
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
  const { combatDialog, setCombatDialog, executeAction } = useGameStore();
  const gameState = useGameStore.getState();
  const weapons = useGameStore((state) => state.weapons);
  const clothing = useGameStore((state) => state.clothing);
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

  const HAS_RESTLESS_KNIGHT = gameState.fellowship.restless_knight || false;
  const HAS_ELDER_WIZARD = gameState.fellowship.elder_wizard || false;

  const bastionStats = calculateBastionStats(gameState);

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
  const NIGHTSHADE_BOW_OWNED = gameState.weapons.nightshade_bow; // Assuming inventory holds bow count

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
    const configs = [
      { damage: 10, stunRounds: 1 },
      { damage: 20, stunRounds: 1 },
      { damage: 30, stunRounds: 1 },
      { damage: 40, stunRounds: 2 },
      { damage: 50, stunRounds: 2 },
      { damage: 50, stunRounds: 3 },
    ];
    const config = configs[level];

    // Deal damage immediately
    const newEnemyHealth = Math.max(0, (currentEnemy?.currentHealth || 0) - config.damage);

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
    const configs = [
      { damage: 10, burnDamage: 10, burnRounds: 1, healthCost: 10 },
      { damage: 15, burnDamage: 15, burnRounds: 1, healthCost: 10 },
      { damage: 20, burnDamage: 20, burnRounds: 1, healthCost: 10 },
      { damage: 25, burnDamage: 25, burnRounds: 2, healthCost: 20 },
      { damage: 30, burnDamage: 30, burnRounds: 2, healthCost: 20 },
      { damage: 35, burnDamage: 35, burnRounds: 3, healthCost: 20 },
    ];
    const config = configs[level];

    console.log('[BLOODFLAME] Button clicked - applying immediate effects:', {
      baseDamage: config.damage,
      healthCost: config.healthCost,
      burnDamage: config.burnDamage,
      burnRounds: config.burnRounds,
      currentEnemyHealth: currentEnemy?.currentHealth,
      currentIntegrity: currentIntegrity,
    });

    // Consume health cost from integrity
    const newIntegrityValue = Math.max(0, currentIntegrity - config.healthCost);
    setCurrentIntegrity(newIntegrityValue);

    console.log('[BLOODFLAME] Integrity consumed:', {
      before: currentIntegrity,
      cost: config.healthCost,
      after: newIntegrityValue,
    });

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
    const newEnemyHealth = Math.max(0, (currentEnemy?.currentHealth || 0) - config.damage);

    console.log('[BLOODFLAME] Base damage applied:', {
      before: currentEnemy?.currentHealth,
      damage: config.damage,
      after: newEnemyHealth,
    });

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
      const newEnemyHealth = Math.max(0, (currentEnemy?.currentHealth || 0) - finalDamage);
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
      console.log('[BLOODFLAME] Burn damage applied in Fight:', {
        burnDamage: burnDamageDealt,
        remainingBurnRounds: enemyBurnRounds,
        enemyHealth: currentEnemyHealth,
      });
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
    setEnemyDamageIndicator({ amount: playerDamage + poisonDamageDealt + burnDamageDealt, visible: true });
    setTimeout(() => {
      setEnemyDamageIndicator({ amount: 0, visible: false });
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
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="w-[95vw] sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Combat - Round {round}
              </DialogTitle>
            </DialogHeader>

            {/* Enemy Stats */}
            <div className="space-y-3">
              <div className="relative">
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {currentEnemy?.name}
                    </span>
                    {NIGHTSHADE_BOW_OWNED && usedItemsInCombat.includes("poison_arrows") && (
                      <span className="text-green-600" role="img" aria-label="poison-icon">▲</span>
                    )}
                    {enemyStunnedRounds > 0 && (
                      <span className="text-yellow-600" role="img" aria-label="stun-icon">◈</span>
                    )}
                    {enemyBurnRounds > 0 && (
                      <span className="text-orange-600" role="img" aria-label="burn-icon">✵</span>
                    )}
                  </div>
                  <span>
                    {currentEnemy?.currentHealth}/{currentEnemy?.maxHealth}{" "}
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={healthPercentage}
                    className="h-3 mt-2 [&>div]:bg-red-900" // Darker red for enemy health
                  />
                  {enemyDamageIndicator.visible && (
                    <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-red-900 font-bold text-sm pointer-events-none">
                      -{enemyDamageIndicator.amount}
                    </div>
                  )}
                </div>
                <div className="text-xs mt-2">
                  Attack: {currentEnemy?.attack}
                </div>
              </div>

              {/* Player Stats */}
              <div className="border-t pt-3">
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
                      className="h-3 mt-2 [&>div]:bg-green-900" // Darker green for bastion integrity
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
                    Attack: {bastionStats.attack} Defense:{" "}
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
                  : item.id === "poison_arrows" && NIGHTSHADE_BOW_OWNED
              ) && (
                <div className="border-t pt-3">
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
                        const tooltipContent = tooltipConfig ? tooltipConfig.getContent(gameState) : '';
                        const availabilityText = item.id === "poison_arrows"
                          ? `Available: ${poisonArrowsUsedInCombat < 1 ? "1/1" : "0/1"}`
                          : item.id === "ember_bomb"
                            ? `Available: ${MAX_EMBER_BOMBS - emberBombsUsed}/${MAX_EMBER_BOMBS}`
                            : item.id === "ashfire_bomb"
                              ? `Available: ${MAX_CINDERFLAME_BOMBS - ashfireBombsUsed}/${MAX_CINDERFLAME_BOMBS}`
                              : `Available: ${MAX_VOID_BOMBS - voidBombsUsed}/${MAX_VOID_BOMBS}`;

                        return (
                          <TooltipProvider key={item.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                                    {item.name}
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs whitespace-pre-line">
                                  {tooltipContent}
                                  {'\n'}{availabilityText}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Combat Skills Section - only show if any fellowship member is unlocked */}
              {(HAS_RESTLESS_KNIGHT || HAS_ELDER_WIZARD) && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Combat Skills</div>
                  <div className="grid grid-cols-2 gap-2">
                    {HAS_RESTLESS_KNIGHT && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">
                              <Button
                                onClick={handleUseCrushingStrike}
                                disabled={usedCrushingStrike || isProcessingRound}
                                variant="outline"
                                size="sm"
                                className="text-xs w-full"
                                button_id="combat-use-crushing-strike"
                              >
                                Crushing Strike
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs whitespace-pre-line">
                              {combatItemTooltips.crushing_strike.getContent(gameState)}
                              {'\n'}Available: {usedCrushingStrike ? "0/1" : "1/1"}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {HAS_ELDER_WIZARD && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full">
                              <Button
                                onClick={handleUseBloodflameSphere}
                                disabled={usedBloodflameSphere || isProcessingRound}
                                variant="outline"
                                size="sm"
                                className="text-xs w-full"
                                button_id="combat-use-bloodflame-sphere"
                              >
                                Bloodflame Sphere
                              </Button>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs whitespace-pre-line">
                              {combatItemTooltips.bloodflame_sphere.getContent(gameState)}
                              {'\n'}Available: {usedBloodflameSphere ? "0/1" : "1/1"}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              )}

              {/* Fight Button */}
              <div className="border-t pt-3">
                {combatEnded ? (
                  <Button
                    onClick={handleEndFight}
                    className="w-full"
                    variant="outline"
                    button_id="combat-end-fight"
                  >
                    End Fight
                  </Button>
                ) : (
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
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}