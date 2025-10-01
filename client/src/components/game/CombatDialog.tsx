import React, { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { GameState } from "@shared/schema";
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
  const [usedItems, setUsedItems] = useState<Set<string>>(new Set());
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [casualties, setCasualties] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && enemy) {
      setCombatStarted(false);
      setCurrentEnemy({ ...enemy });
      setRound(1);
      setUsedItems(new Set());
      setCombatLog([]);
      setIsProcessingRound(false);
      setCasualties(0);
    }
  }, [isOpen, enemy]);

  const bastionStats = calculateBastionStats(gameState);

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
    if (!currentEnemy || usedItems.has(item.id) || !item.available) return;

    // Use the item
    setUsedItems(prev => new Set([...prev, item.id]));
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
        setTimeout(() => {
          onVictory();
          onClose();
        }, 1000);
      }, 500);
    }
  };

  const handleFight = () => {
    if (!currentEnemy || isProcessingRound) return;

    setIsProcessingRound(true);

    setTimeout(() => {
      let newLog = [...combatLog];
      let newCasualties = casualties;

      // Enemy attacks first
      if (currentEnemy.attack > bastionStats.defense) {
        const victims = currentEnemy.attack - bastionStats.defense;
        newCasualties += victims;
        newLog.push(`Enemy deals ${victims} casualties! (Attack ${currentEnemy.attack} vs Defense ${bastionStats.defense})`);
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
          onVictory();
          onClose();
        }, 1000);
      } else {
        // Next round
        setRound(prev => prev + 1);
        setUsedItems(new Set()); // Reset item usage for new round
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
              <Button onClick={handleStartFight} className="w-full">
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
                  <span className="font-medium">{currentEnemy?.name}</span>
                  <span>{currentEnemy?.currentHealth}/{currentEnemy?.maxHealth} HP</span>
                </div>
                <Progress value={healthPercentage} className="h-3 mt-1" />
                <div className="text-xs text-muted-foreground mt-1">
                  Attack: {currentEnemy?.attack}
                </div>
              </div>

              {/* Player Stats */}
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-2">Your Forces</div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Attack:</span> {bastionStats.attack}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Defense:</span> {bastionStats.defense}
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
                          disabled={usedItems.has(item.id) || isProcessingRound}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          {usedItems.has(item.id) ? "Used" : `${item.name} (${item.damage})`}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Fight Button */}
              <div className="border-t pt-3">
                <Button
                  onClick={handleFight}
                  disabled={isProcessingRound || (currentEnemy?.currentHealth || 0) <= 0}
                  className="w-full"
                >
                  {isProcessingRound ? "Fighting..." : "Fight"}
                </Button>
              </div>

              {/* Combat Log */}
              {combatLog.length > 0 && (
                <div className="border-t pt-3">
                  <div className="text-sm font-medium mb-2">Combat Log</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {combatLog.slice(-5).map((entry, index) => (
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