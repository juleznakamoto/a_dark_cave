import React, { useState, useEffect } from "react";
import { useGameStore } from "@/game/state";
import { calculateBastionStats } from "@/game/bastionStats";
import { getTotalKnowledge } from "@/game/rules/effects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [usedItemsInRound, setUsedItemsInRound] = useState<Set<string>>(new Set());
  const [usedItemsInCombat, setUsedItemsInCombat] = useState<string[]>([]);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [casualties, setCasualties] = useState(0);
  const [combatEnded, setCombatEnded] = useState(false);
  const [combatResult, setCombatResult] = useState<'victory' | 'defeat' | null>(null);
  const [currentIntegrity, setCurrentIntegrity] = useState(0);
  const [maxIntegrityForCombat, setMaxIntegrityForCombat] = useState(0);
  const [enemyDamageIndicator, setEnemyDamageIndicator] = useState<{amount: number, visible: boolean}>({amount: 0, visible: false});
  const [playerDamageIndicator, setPlayerDamageIndicator] = useState<{amount: number, visible: boolean}>({amount: 0, visible: false});
  const [integrityDamageIndicator, setIntegrityDamageIndicator] = useState<{amount: number, visible: boolean}>({amount: 0, visible: false});

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
      setCasualties(0);
      setCombatEnded(false);
      setCombatResult(null);
      setEnemyDamageIndicator({amount: 0, visible: false});
      setPlayerDamageIndicator({amount: 0, visible: false});
      setIntegrityDamageIndicator({amount: 0, visible: false});
      // Reset integrity to full calculated amount for this combat
      const maxIntegrity = bastionStats.defense * 2 + (bastionStats.attackFromFortifications > 0 ? 50 : 0);
      setMaxIntegrityForCombat(maxIntegrity);
      setCurrentIntegrity(maxIntegrity);
    }
  }, [isOpen, enemy, bastionStats.defense, bastionStats.attackFromFortifications]);

  // Available combat items with max limits
  const MAX_EMBER_BOMBS = 3;
  const MAX_CINDERFLAME_BOMBS = 2;
  
  const emberBombsUsed = usedItemsInCombat.filter(id => id === 'ember_bomb').length;
  const cinderflameBombsUsed = usedItemsInCombat.filter(id => id === 'cinderflame_bomb').length;
  
  const combatItems: CombatItem[] = [
    {
      id: "ember_bomb",
      name: "Ember Bomb",
      damage: 5,
      available: gameState.resources.ember_bomb > 0 && 
                 emberBombsUsed < MAX_EMBER_BOMBS && 
                 !usedItemsInRound.has('ember_bomb'),
    },
    {
      id: "cinderflame_bomb",
      name: "Cinderflame Bomb",
      damage: 15,
      available: gameState.resources.cinderflame_bomb > 0 && 
                 cinderflameBombsUsed < MAX_CINDERFLAME_BOMBS &&
                 !usedItemsInRound.has('cinderflame_bomb'),
    },
  ];

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
    setUsedItemsInRound(prev => new Set([...prev, item.id]));
    setUsedItemsInCombat(prev => [...prev, item.id]);
    setCurrentEnemy(prev => prev ? {
      ...prev,
      currentHealth: Math.max(0, prev.currentHealth - finalDamage)
    } : null);

    // Update game state to consume the item
    gameState.updateResource(item.id as keyof typeof gameState.resources, -1);

    // Show damage indicator on enemy health bar
    setEnemyDamageIndicator({amount: finalDamage, visible: true});
    setTimeout(() => {
      setEnemyDamageIndicator({amount: 0, visible: false});
    }, 3000);

    // Check if enemy is defeated
    if (currentEnemy && currentEnemy.currentHealth - finalDamage <= 0) {
      setTimeout(() => {
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
      let newCasualties = casualties;

      // Enemy attacks first
      if (currentEnemy.attack > bastionStats.defense) {
        const integrityDamage = currentEnemy.attack - bastionStats.defense;
        const newIntegrityValue = Math.max(0, currentIntegrity - integrityDamage);
        setCurrentIntegrity(newIntegrityValue);
        
        // Show damage indicator on integrity bar
        setIntegrityDamageIndicator({amount: integrityDamage, visible: true});
        setTimeout(() => {
          setIntegrityDamageIndicator({amount: 0, visible: false});
        }, 3000);

        // Check if integrity is depleted
        if (newIntegrityValue <= 0) {
          setTimeout(() => {
            setCombatEnded(true);
            setCombatResult('defeat');
            setIsProcessingRound(false);
          }, 1000);
          return;
        }
      }

      // Player attacks
      const newHealth = Math.max(0, currentEnemy.currentHealth - bastionStats.attack);
      
      // Show damage indicator on enemy health bar
      setEnemyDamageIndicator({amount: bastionStats.attack, visible: true});
      setTimeout(() => {
        setEnemyDamageIndicator({amount: 0, visible: false});
      }, 3000);

      setCurrentEnemy(prev => prev ? { ...prev, currentHealth: newHealth } : null);
      setCasualties(newCasualties);

      // Check battle outcome
      if (newHealth <= 0) {
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
        // Next round - reset items for this round but keep total combat tracking
        setRound(prev => prev + 1);
        setUsedItemsInRound(new Set());
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
              <div className="relative">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{currentEnemy?.name} Health</span>
                  <span>{currentEnemy?.currentHealth}/{currentEnemy?.maxHealth} </span>
                </div>
                <div className="relative">
                  <Progress 
                    value={healthPercentage} 
                    className="h-3 mt-1 [&>div]:bg-red-900" // Darker red for enemy health
                  />
                  {enemyDamageIndicator.visible && (
                    <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-red-900 font-bold text-sm pointer-events-none animate-pulse">
                      -{enemyDamageIndicator.amount}
                    </div>
                  )}
                </div>
                <div className="text-xs mt-1">
                  Attack: {currentEnemy?.attack}
                </div>
              </div>

              {/* Player Stats */}
              <div className="border-t pt-3">


                {/* Bastion Integrity */}
                <div className="mb-3 relative">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Bastion Integrity</span>
                    <span>{currentIntegrity}/{maxIntegrityForCombat}</span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={(currentIntegrity / maxIntegrityForCombat) * 100} 
                      className="h-3 mt-1 [&>div]:bg-green-900" // Darker green for bastion integrity
                    />
                    {integrityDamageIndicator.visible && (
                      <div className="absolute -translate-y-5 inset-0 flex items-center justify-center text-green-900 font-bold text-sm pointer-events-none animate-pulse">
                        -{integrityDamageIndicator.amount}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs">
                  <div>
                    Attack: {bastionStats.attack} Defense: {bastionStats.defense}
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
                        <TooltipProvider key={item.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleUseItem(item)}
                                disabled={usedItemsInCombat.has(item.id) || isProcessingRound}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                {item.name}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Base Damage: {item.damage}</p>
                              {getTotalKnowledge(gameState) >= 5 && (
                                <p>Knowledge Bonus: +{Math.floor(getTotalKnowledge(gameState) / 5)}</p>
                              )}
                              <p>Total Damage: {item.damage + Math.floor(getTotalKnowledge(gameState) / 5)}</p>
                              <p>Available: {item.id === 'ember_bomb' 
                                ? `${MAX_EMBER_BOMBS - emberBombsUsed}/${MAX_EMBER_BOMBS}`
                                : `${MAX_CINDERFLAME_BOMBS - cinderflameBombsUsed}/${MAX_CINDERFLAME_BOMBS}`
                              }</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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

              
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}