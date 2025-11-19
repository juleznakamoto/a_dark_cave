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
import { getPopulationProduction } from '@/game/population';
import { handleGathererProduction, handleHunterProduction, handleMinerProduction } from '@/game/loop';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { capitalizeWords } from '@/lib/utils';

// Sleep upgrade configurations
const SLEEP_LENGTH_UPGRADES = [
  { level: 0, hours: 4 },
  { level: 1, hours: 4 },
  { level: 2, hours: 6 },
  { level: 3, hours: 10 },
  { level: 4, hours: 16 },
  { level: 5, hours: 24 },
];

const SLEEP_INTENSITY_UPGRADES = [
  { level: 0, percentage: 10 },
  { level: 1, percentage: 12.5 },
  { level: 2, percentage: 15 },
  { level: 3, percentage: 17.5 },
  { level: 4, percentage: 20 },
  { level: 5, percentage: 25 },
];

export default function IdleModeDialog() {
  const { idleModeDialog, setIdleModeDialog, idleModeState, sleepUpgrades } = useGameStore();
  const [accumulatedResources, setAccumulatedResources] = useState<Record<string, number>>({});
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const state = useGameStore.getState();

  // Get current sleep duration and multiplier from upgrades
  const sleepLengthConfig = SLEEP_LENGTH_UPGRADES[sleepUpgrades?.lengthLevel || 0];
  const sleepIntensityConfig = SLEEP_INTENSITY_UPGRADES[sleepUpgrades?.intensityLevel || 0];
  const IDLE_DURATION_MS = sleepLengthConfig.hours * 60 * 60 * 1000;
  const PRODUCTION_SPEED_MULTIPLIER = sleepIntensityConfig.percentage / 100;

  // Initialize idle mode when dialog opens
  useEffect(() => {
    if (idleModeDialog.isOpen && !isActive) {
      const now = Date.now();

      // Check if there's a persisted idle mode state
      if (idleModeState?.startTime && idleModeState.startTime > 0) {
        const elapsed = now - idleModeState.startTime;
        const remaining = Math.max(0, IDLE_DURATION_MS - elapsed);

        setStartTime(idleModeState.startTime);
        setRemainingTime(remaining);

        // Calculate resources accumulated while offline
        const secondsElapsed = Math.min(elapsed, IDLE_DURATION_MS) / 1000;
        const cyclesElapsed = secondsElapsed / 15; // How many 15-second cycles occurred
        const currentState = useGameStore.getState();
        
        const offlineResources: Record<string, number> = {};
        
        // Use the same production calculation as the normal game loop
        Object.entries(currentState.villagers).forEach(([jobId, count]) => {
          if (count > 0) {
            const production = getPopulationProduction(jobId, count, currentState);
            production.forEach((prod) => {
              // Apply production/consumption per cycle, multiplied by sleep intensity
              const amountPerCycle = prod.totalAmount * PRODUCTION_SPEED_MULTIPLIER;
              offlineResources[prod.resource] = (offlineResources[prod.resource] || 0) + (amountPerCycle * cyclesElapsed);
            });
          }
        });

        setAccumulatedResources(offlineResources);
        setIsActive(remaining > 0);

        // Don't auto-end when time is up - let user see the results
      } else {
        // Start fresh idle mode
        setIsActive(true);
        setStartTime(now);
        setAccumulatedResources({});
        setRemainingTime(IDLE_DURATION_MS);

        // Persist the start time
        useGameStore.setState({
          idleModeState: {
            isActive: true,
            startTime: now,
            needsDisplay: true,
          },
        });

        // Immediately save to Supabase so user can close tab
        (async () => {
          const { saveGame } = await import('@/game/save');
          const currentState = useGameStore.getState();
          await saveGame(currentState, currentState.playTime);
        })();
      }
    }
  }, [idleModeDialog.isOpen, isActive]);

  // Timer update loop (every second)
  useEffect(() => {
    if (!isActive || !idleModeDialog.isOpen) return;

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, IDLE_DURATION_MS - elapsed);

      setRemainingTime(remaining);

      if (remaining <= 0) {
        // Time's up
        setIsActive(false);
      }
    }, 1000); // Update timer every second

    return () => clearInterval(timerInterval);
  }, [isActive, idleModeDialog.isOpen, startTime]);

  // Resource accumulation loop (synchronized to timer intervals)
  useEffect(() => {
    if (!isActive || !idleModeDialog.isOpen) return;

    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = Math.max(0, IDLE_DURATION_MS - elapsed);
    
    if (remaining <= 0) return;

    // Calculate how many seconds have elapsed since idle mode started
    const secondsElapsed = Math.floor(elapsed / 1000);
    
    // Calculate how many seconds until the next 15-second mark from start
    // For example: if 7 seconds elapsed, wait 8 more seconds to reach 15
    // if 18 seconds elapsed, wait 12 more seconds to reach 30
    const secondsUntilNextMark = 15 - (secondsElapsed % 15);
    const msUntilNextInterval = secondsUntilNextMark * 1000;

    const updateResources = () => {
      const currentState = useGameStore.getState();
      
      // Calculate the multiplier to scale production for this cycle
      const cyclesToRun = PRODUCTION_SPEED_MULTIPLIER;
      
      // Track resources produced in this cycle
      const cycleProduction: Record<string, number> = {};
      
      // Store the original updateResource to capture changes
      const originalUpdateResource = currentState.updateResource;
      let resourceChanges: Record<string, number> = {};
      
      // Temporarily override updateResource to capture changes instead of applying them
      currentState.updateResource = (resource: keyof typeof currentState.resources, amount: number) => {
        resourceChanges[resource] = (resourceChanges[resource] || 0) + amount;
      };
      
      // Run the production functions (they will populate resourceChanges)
      handleGathererProduction();
      handleHunterProduction();
      handleMinerProduction();
      
      // Restore the original updateResource
      currentState.updateResource = originalUpdateResource;
      
      // Apply the sleep multiplier to the captured changes
      Object.entries(resourceChanges).forEach(([resource, amount]) => {
        cycleProduction[resource] = amount * cyclesToRun;
      });
      
      // Update accumulated resources
      setAccumulatedResources(prev => {
        const updated = { ...prev };
        Object.entries(cycleProduction).forEach(([resource, amount]) => {
          updated[resource] = (updated[resource] || 0) + amount;
        });
        return updated;
      });
    };

    // Only schedule the next update if we haven't reached the first 15-second mark yet
    // or if we need to continue updates after that
    const initialTimeout = setTimeout(() => {
      updateResources();
      
      // After first sync, continue every 15 seconds
      const resourceInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, IDLE_DURATION_MS - elapsed);

        if (remaining <= 0) {
          clearInterval(resourceInterval);
          return;
        }

        updateResources();
      }, 15000);

      return () => clearInterval(resourceInterval);
    }, msUntilNextInterval);

    return () => clearTimeout(initialTimeout);
  }, [isActive, idleModeDialog.isOpen, startTime, accumulatedResources]);

  const handleEndIdleMode = () => {
    // Apply accumulated resources to the game state (including negative values for consumption)
    Object.entries(accumulatedResources).forEach(([resource, amount]) => {
      useGameStore.getState().updateResource(
        resource as keyof typeof state.resources,
        Math.floor(amount)
      );
    });

    // Create log message showing net resource changes
    if (Object.keys(accumulatedResources).length > 0) {
      const gainedResources = Object.entries(accumulatedResources)
        .filter(([_, amount]) => amount > 0)
        .map(([resource, amount]) => `${capitalizeWords(resource)}: +${Math.floor(amount)}`)
        .join(', ');

      const lostResources = Object.entries(accumulatedResources)
        .filter(([_, amount]) => amount < 0)
        .map(([resource, amount]) => `${capitalizeWords(resource)}: ${Math.floor(amount)}`)
        .join(', ');

      const messages = [];
      if (gainedResources) messages.push(gainedResources);
      if (lostResources) messages.push(lostResources);

      if (messages.length > 0) {
        useGameStore.getState().addLogEntry({
          id: `idle-mode-end-${Date.now()}`,
          message: `While you slept: ${messages.join(', ')}`,
          timestamp: Date.now(),
          type: 'system',
        });
      }
    }

    // Clear persisted idle mode state
    useGameStore.setState({
      idleModeState: {
        isActive: false,
        startTime: 0,
        needsDisplay: false,
      },
    });

    // Close dialog and reset
    setIsActive(false);
    setIdleModeDialog(false);
    setAccumulatedResources({});
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Show resources that are being produced
  const now = Date.now();
  const elapsed = now - startTime;
  const secondsElapsed = Math.floor(elapsed / 1000);
  
  // Show resources only after at least 15 seconds have elapsed from idle mode start
  const hasCompletedFirstInterval = secondsElapsed >= 15;
  
  // Get all resources that will be produced/consumed (using the same logic as game loop)
  const allResourceEffects: Record<string, boolean> = {};
  Object.entries(state.villagers).forEach(([jobId, count]) => {
    if (count > 0) {
      const production = getPopulationProduction(jobId, count, state);
      production.forEach((prod) => {
        allResourceEffects[prod.resource] = true;
      });
    }
  });
  
  const producedResources = Object.keys(allResourceEffects).map(resource => {
    const amount = hasCompletedFirstInterval ? (accumulatedResources[resource] || 0) : 0;
    return [resource, amount] as [string, number];
  }).filter(([_, amount]) => amount !== 0) // Only show resources that have changed
    .sort(([a], [b]) => a.localeCompare(b));

  const isTimeUp = remainingTime <= 0;

  return (
    <Dialog open={idleModeDialog.isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm" hideClose={true}>
        <DialogHeader>
          <DialogTitle>Sleeping</DialogTitle>
          <DialogDescription>
            {isTimeUp ? (
              <span className="text-yellow-600">You are awake!</span>
            ) : (
              <span>Waking up in: {formatTime(remainingTime)}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="space-y-2">
            {producedResources.map(([resource, amount]) => (
              <div key={resource} className="flex justify-between items-center">
                <span className="text-sm font-medium">{capitalizeWords(resource)}:</span>
                <span className={`text-sm tabular-nums ${amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                  <AnimatedCounter value={Math.floor(amount)} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleEndIdleMode} variant="outline" className="text-xs h-10">
            {isTimeUp ? "Get Up" : "Wake Up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}