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
  const gameState = useGameStore();
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
      const maxIntegrity = bastionStats.integrity;
      setMaxIntegrityForCombat(maxIntegrity);
      setCurrentIntegrity(maxIntegrity);
    }
  }, [
    isOpen,
    enemy,
    bastionStats.defense,
    bastionStats.attackFromFortifications,
  ]);

  // Available combat items with max limits
  const MAX_EMBER_BOMBS = gameState.clothing.grenadier_bag ? 4 : 3;
  const MAX_CINDERFLAME_BOMBS = gameState.clothing.grenadier_bag ? 3 : 2;
  const NIGHTSHADE_BOW_OWNED = gameState.weapons.nightshade_bow; // Assuming inventory holds bow count

  const emberBombsUsed = usedItemsInCombat.filter(
    (id) => id === "ember_bomb",
  ).length;
  const ashfireBombsUsed = usedItemsInCombat.filter(
    (id) => id === "ashfire_bomb",
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
      setCurrentEnemy((prev) =>
        prev
          ? {
              ...prev,
              currentHealth: Math.max(0, prev.currentHealth - finalDamage),
            }
          : null,
      );
      // Update game state to consume the item
      gameState.updateResource(item.id as keyof typeof gameState.resources, -1);

      // Show damage indicator on enemy health bar
      setEnemyDamageIndicator({ amount: finalDamage, visible: true });
      setTimeout(() => {
        setEnemyDamageIndicator({ amount: 0, visible: false });
      }, 3000);
    }


    // Check if enemy is defeated by bombs
    if (currentEnemy && currentEnemy.currentHealth - finalDamage <= 0 && item.id !== "poison_arrows") {
      setCombatEnded(true);
      setCombatResult("victory");
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

    // Apply poison damage if active and not used this round
    const poisonArrowsUsedThisRound = usedItemsInRound.has("poison_arrows");
    if (NIGHTSHADE_BOW_OWNED && poisonArrowsUsedThisRound) {
      const totalKnowledge = getTotalKnowledge(gameState);
      const knowledgeBonus = Math.floor(totalKnowledge / 5);
      poisonDamageDealt = 15 + knowledgeBonus; // Base 15 damage + knowledge bonus
      // Need to track poison duration and its application per round
      // For simplicity, let's assume it applies for 3 rounds after use
      // This state needs to be managed more robustly, e.g., using useEffect or a state variable for poison status
    }


    // Enemy attacks first
    if (currentEnemy.attack > bastionStats.defense) {
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
      currentEnemyHealth - playerDamage - poisonDamageDealt,
    );
    currentEnemyHealth = newHealth;

    // Show damage indicator on enemy health bar
    setEnemyDamageIndicator({ amount: playerDamage + poisonDamageDealt, visible: true });
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
                            : `Available: ${MAX_CINDERFLAME_BOMBS - ashfireBombsUsed}/${MAX_CINDERFLAME_BOMBS}`;

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