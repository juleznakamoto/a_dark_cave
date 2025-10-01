import React, { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { calculateBastionStats } from "@/game/bastionStats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  const [usedItemsInCombat, setUsedItemsInCombat] = useState<Set<string>>(new Set());
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [casualties, setCasualties] = useState(0);
  const [combatEnded, setCombatEnded] = useState(false);
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | null>(null);
  const [currentIntegrity, setCurrentIntegrity] = useState(0);
  const [maxIntegrityForCombat, setMaxIntegrityForCombat] = useState(0);

  const bastionStats = calculateBastionStats(gameState);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && enemy) {
      setCombatStarted(false);
      setCurrentEnemy({ ...enemy });
      setRound(1);
      setUsedItemsInCombat(new Set());
      setCombatLog([]);
      setIsProcessingRound(false);
      setCasualties(0);
      setCombatEnded(false);
      setCombatResult(null);
      // Reset integrity to full calculated amount for this combat
      const maxIntegrity = bastionStats.defense * 2 + (bastionStats.attackFromFortifications > 0 ? 50 : 0);
      setMaxIntegrityForCombat(maxIntegrity);
      setCurrentIntegrity(maxIntegrity);
    }
  }, [isOpen, enemy, bastionStats.defense, bastionStats.attackFromFortifications]);

  // Available combat items
  const combatItems: CombatItem[] = [
    {
      id: "ember_bomb",
      name: "Ember Bomb",
      damage: 5,
      available: gameState.resources.ember_bomb > 0,
    },
    {
      id: "cinderflame_bomb",
      name: "Cinderflame Bomb",
      damage: 15,
      available: gameState.resources.cinderflame_bomb > 0,
    },
  ];

  const handleStartFight = () => {
    setCombatStarted(true);
    setCombatLog([`Round ${round} begins!`]);
  };

  const handleUseItem = (item: CombatItem) => {
    if (!currentEnemy || usedItemsInCombat.has(item.id) || !item.available) return;

    // Use the item
    setUsedItemsInCombat(prev => new Set([...prev, item.id]));
    setCurrentEnemy(prev => prev ? {
      ...prev,
      currentHealth: Math.max(0, prev.currentHealth - item.damage)
    } : null);

    // Update game state to consume the item
    gameState.updateResource(item.id as keyof typeof gameState.resources, -1);

    setCombatLog(prev => [...prev, `Used ${item.name} for ${item.damage} damage!`]);

    // Check if enemy is defeated
    if (currentEnemy && currentEnemy.currentHealth - item.damage <= 0) {
      setTimeout(() => {
        setCombatLog(prev => [...prev, `${currentEnemy.name} is defeated!`]);
        setCombatEnded(true);
        setCombatResult('victory');
      }, 500);
    }
  };

  const handleEndFight = () => {
    // Update bastion integrity in game state
    gameState.updateBastionIntegrity(currentIntegrity);

    if (combatResult === 'victory') {
      onVictory();
    } else if (combatResult === 'defeat') {
      onDefeat();
    }
    onClose();
  };

  const handleFight = () => {
    if (!currentEnemy || isProcessingRound) return;

    setIsProcessingRound(true);

    setTimeout(() => {
      let newLog = [...combatLog];
      let newCasualties = casualties;

      // Enemy attacks first
      if (currentEnemy.attack > bastionStats.defense) {
        const integrityDamage = currentEnemy.attack - bastionStats.defense;
        const newIntegrityValue = Math.max(0, currentIntegrity - integrityDamage);
        setCurrentIntegrity(newIntegrityValue);
        newLog.push(`Enemy breaches defenses! Bastion integrity damaged by ${integrityDamage}! (Attack ${currentEnemy.attack} vs Defense ${bastionStats.defense})`);

        // Check if integrity is depleted
        if (newIntegrityValue <= 0) {
          newLog.push("Your bastion has fallen! The enemy overruns your defenses!");
          setCombatLog(newLog);
          setTimeout(() => {
            setCombatEnded(true);
            setCombatResult('defeat');
            setIsProcessingRound(false);
          }, 1000);
          return;
        }
      } else {
        newLog.push(`Your defenses hold! (Defense ${bastionStats.defense} vs Attack ${currentEnemy.attack})`);
      }

      // Player attacks
      const newHealth = Math.max(0, currentEnemy.currentHealth - bastionStats.attack);
      newLog.push(`You deal ${bastionStats.attack} damage!`);

      setCurrentEnemy(prev => prev ? { ...prev, currentHealth: newHealth } : null);
      setCombatLog(newLog);
      setCasualties(newCasualties);

      // Check battle outcome
      if (newHealth <= 0) {
        newLog.push(`${currentEnemy.name} is defeated!`);
        setCombatLog(newLog);
        setTimeout(() => {
          // Apply casualties before victory
          if (newCasualties > 0) {
            const currentPopulation = Object.values(gameState.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
            const actualCasualties = Math.min(newCasualties, currentPopulation);
            // Apply casualties to game state here if needed
          }
          setCombatEnded(true);
          setCombatResult('victory');
          setIsProcessingRound(false);
        }, 1000);
      } else {
        // Next round
        setRound(prev => prev + 1);
        setUsedItemsInCombat(new Set()); // Reset item usage for new round
        newLog.push(`Round ${round + 1} begins!`);
        setCombatLog(newLog);
        setIsProcessingRound(false);
      }
    }, 1000);
  };

  if (!enemy) return null;

  const healthPercentage = currentEnemy ? (currentEnemy.currentHealth / currentEnemy.maxHealth) * 100 : 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={() => {}}
    >
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
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
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                {eventMessage}
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-center mt-4">
              <Button onClick={handleStartFight} className="w-full" variant="outline">
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
              <div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{currentEnemy?.name} Health</span>
                  <span>{currentEnemy?.currentHealth}/{currentEnemy?.maxHealth} </span>
                </div>
                <Progress 
                  value={healthPercentage} 
                  className="h-3 mt-1 [&>div]:bg-red-900" // Darker red for enemy health
                />
                <div className="text-xs mt-1">
                  Attack: {currentEnemy?.attack}
                </div>
              </div>

              {/* Player Stats */}
              <div className="border-t pt-3">


                {/* Bastion Integrity */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Bastion Integrity</span>
                    <span>{currentIntegrity}/{maxIntegrityForCombat}</span>
                  </div>
                  <Progress 
                    value={(currentIntegrity / maxIntegrityForCombat) * 100} 
                    className="h-3 mt-1 [&>div]:bg-green-900" // Darker green for bastion integrity
                  />
                </div>

                <div className="text-xs">
                  <div>
                    Attack: {bastionStats.attack} enemDefense: {bastionStats.defense}
                  </div>

                </div>
                {casualties > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    Casualties this battle: {casualties}
                  </div>
                )}
              </div>

              {/* Combat Items */}
              {combatItems.some(item => item.available) && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Combat Items</div>
                  <div className="grid grid-cols-2 gap-2">
                    {combatItems
                      .filter(item => item.available)
                      .map(item => (
                        <Button
                          key={item.id}
                          onClick={() => handleUseItem(item)}
                          disabled={usedItemsInCombat.has(item.id) || isProcessingRound}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {usedItemsInCombat.has(item.id) ? "Used" : `${item.name} (${item.damage})`}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Fight Button */}
              <div className="border-t pt-3">
                {combatEnded ? (
                  <Button
                    onClick={handleEndFight}
                    className="w-full" variant="outline"
                  >
                    End Fight
                  </Button>
                ) : (
                  <Button
                    onClick={handleFight}
                    disabled={isProcessingRound || (currentEnemy?.currentHealth || 0) <= 0}
                    className="w-full" variant="outline"
                  >
                    {isProcessingRound ? "Fighting..." : "Fight"}
                  </Button>
                )}
              </div>

              {/* Combat Log */}
              {combatLog.length > 0 && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Combat Log</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {combatLog.map((entry, index) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}