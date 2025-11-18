
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { getTotalPopulationEffects } from '@/game/population';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { capitalizeWords } from '@/lib/utils';

const IDLE_DURATION_MS = 2 * 60 * 1000; // 2 minutes for testing
const PRODUCTION_SPEED_MULTIPLIER = 0.1; // 10% of normal speed

export default function IdleModeDialog() {
  const { idleModeDialog, setIdleModeDialog } = useGameStore();
  const [accumulatedResources, setAccumulatedResources] = useState<Record<string, number>>({});
  const [remainingTime, setRemainingTime] = useState(IDLE_DURATION_MS);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const state = useGameStore.getState();

  // Initialize idle mode when dialog opens
  useEffect(() => {
    if (idleModeDialog.isOpen && !isActive) {
      setIsActive(true);
      setStartTime(Date.now());
      setAccumulatedResources({});
      setRemainingTime(IDLE_DURATION_MS);
    }
  }, [idleModeDialog.isOpen, isActive]);

  // Main idle mode loop
  useEffect(() => {
    if (!isActive || !idleModeDialog.isOpen) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, IDLE_DURATION_MS - elapsed);

      setRemainingTime(remaining);

      if (remaining <= 0) {
        // Time's up
        setIsActive(false);
        return;
      }

      // Calculate production (every second)
      const currentState = useGameStore.getState();
      const totalEffects = getTotalPopulationEffects(currentState, Object.keys(currentState.villagers));

      // Apply 10% production speed and scale to 1 second intervals
      // Normal production is per 15 seconds, so we divide by 15
      const productionPerSecond: Record<string, number> = {};
      Object.entries(totalEffects).forEach(([resource, amount]) => {
        if (amount > 0) {
          productionPerSecond[resource] = (amount / 15) * PRODUCTION_SPEED_MULTIPLIER;
        }
      });

      // Accumulate resources
      setAccumulatedResources(prev => {
        const updated = { ...prev };
        Object.entries(productionPerSecond).forEach(([resource, amount]) => {
          updated[resource] = (updated[resource] || 0) + amount;
        });
        return updated;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isActive, idleModeDialog.isOpen, startTime]);

  const handleEndIdleMode = () => {
    // Apply accumulated resources to the game state
    Object.entries(accumulatedResources).forEach(([resource, amount]) => {
      if (amount > 0) {
        useGameStore.getState().updateResource(
          resource as keyof typeof state.resources,
          Math.floor(amount)
        );
      }
    });

    // Create log message showing resources gained
    if (Object.keys(accumulatedResources).length > 0) {
      const resourcesList = Object.entries(accumulatedResources)
        .filter(([_, amount]) => amount > 0)
        .map(([resource, amount]) => `${capitalizeWords(resource)}: ${Math.floor(amount)}`)
        .join(', ');

      if (resourcesList) {
        useGameStore.getState().addLogEntry({
          id: `idle-mode-end-${Date.now()}`,
          message: `While you were idle, the villagers produced: ${resourcesList}`,
          timestamp: Date.now(),
          type: 'system',
        });
      }
    }

    // Close dialog and reset
    setIsActive(false);
    setIdleModeDialog(false);
    setAccumulatedResources({});
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Only show resources that are being produced
  const producedResources = Object.entries(accumulatedResources)
    .filter(([_, amount]) => amount > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const isTimeUp = remainingTime <= 0;

  return (
    <Dialog open={idleModeDialog.isOpen} onOpenChange={(open) => !open && handleEndIdleMode()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Idle Mode</DialogTitle>
          <DialogDescription>
            {isTimeUp ? (
              <span className="text-yellow-600">Time's up! Your villagers have finished their work.</span>
            ) : (
              <span>Time remaining: {formatTime(remainingTime)}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {producedResources.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No resources produced yet...
            </p>
          ) : (
            <div className="space-y-2">
              {producedResources.map(([resource, amount]) => (
                <div key={resource} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{capitalizeWords(resource)}:</span>
                  <span className="text-sm tabular-nums">
                    <AnimatedCounter value={Math.floor(amount)} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleEndIdleMode} variant="default">
            End Idle Mode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
