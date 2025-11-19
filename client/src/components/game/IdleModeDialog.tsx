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
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { capitalizeWords } from '@/lib/utils';
import { getPopulationProduction } from '@/game/population';

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

// Simulate production functions from loop.ts
function simulateGathererProduction(state: any, multiplier: number, accumulatedResources: Record<string, number>) {
  const gatherer = state.villagers.gatherer;
  if (gatherer > 0) {
    const production = getPopulationProduction("gatherer", gatherer, state);
    console.log('[IDLE GATHERER]', { gatherer, production, multiplier });
    production.forEach((prod) => {
      const amount = prod.totalAmount * multiplier;
      console.log(`[IDLE GATHERER] ${prod.resource}: ${accumulatedResources[prod.resource] || 0} + ${amount}`);
      accumulatedResources[prod.resource] = (accumulatedResources[prod.resource] || 0) + amount;
    });
  }
}

function simulateHunterProduction(state: any, multiplier: number, accumulatedResources: Record<string, number>) {
  const hunter = state.villagers.hunter;
  if (hunter > 0) {
    const production = getPopulationProduction("hunter", hunter, state);
    production.forEach((prod) => {
      const amount = prod.totalAmount * multiplier;
      accumulatedResources[prod.resource] = (accumulatedResources[prod.resource] || 0) + amount;
    });
  }
}

function simulateMinerProduction(state: any, multiplier: number, accumulatedResources: Record<string, number>) {
  // Collect all production data
  const allProduction: { job: string; production: any[] }[] = [];
  Object.entries(state.villagers).forEach(([job, count]) => {
    if (
      count > 0 &&
      (job.endsWith("miner") ||
        job === "steel_forger" ||
        job === "tanner" ||
        job === "powder_maker" ||
        job === "ashfire_dust_maker")
    ) {
      const production = getPopulationProduction(job, count as number, state);
      allProduction.push({ job, production });
    }
  });

  console.log('[IDLE MINER] All production jobs:', allProduction.map(p => ({ job: p.job, production: p.production })));

  // Track available resources after each job's production/consumption
  const availableResources = { ...accumulatedResources };
  
  console.log('[IDLE MINER] Available resources at start:', availableResources);

  // Process each job sequentially
  allProduction.forEach(({ job, production }) => {
    // Check if this job can produce based on currently available resources
    const canProduce = production.every((prod) => {
      if (prod.totalAmount < 0) {
        // Consumption - check if we have enough available
        const available = availableResources[prod.resource] || 0;
        const needed = Math.abs(prod.totalAmount * multiplier);
        console.log(`[IDLE MINER] ${job} needs ${needed} ${prod.resource}, has ${available}`);
        return available >= needed;
      }
      return true; // Production is always allowed
    });

    console.log(`[IDLE MINER] ${job} canProduce:`, canProduce);

    // Only apply production if all resources are available
    if (canProduce) {
      production.forEach((prod) => {
        const amount = prod.totalAmount * multiplier;
        console.log(`[IDLE MINER] ${job} ${prod.resource}: ${availableResources[prod.resource] || 0} + ${amount}`);
        // Update both the tracked available resources and accumulated resources
        availableResources[prod.resource] = (availableResources[prod.resource] || 0) + amount;
        accumulatedResources[prod.resource] = (accumulatedResources[prod.resource] || 0) + amount;
      });
    }
  });
}

function simulatePopulationConsumption(state: any, multiplier: number, accumulatedResources: Record<string, number>) {
  const totalPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + ((count as number) || 0),
    0,
  );

  if (totalPopulation > 0) {
    // Food consumption (1 per villager per 15 seconds)
    const foodConsumption = totalPopulation * multiplier;
    console.log(`[IDLE CONSUMPTION] Food: ${accumulatedResources['food'] || 0} - ${foodConsumption} (${totalPopulation} pop * ${multiplier})`);
    accumulatedResources['food'] = (accumulatedResources['food'] || 0) - foodConsumption;

    // Wood consumption (1 per villager per 15 seconds)
    const woodConsumption = totalPopulation * multiplier;
    console.log(`[IDLE CONSUMPTION] Wood: ${accumulatedResources['wood'] || 0} - ${woodConsumption} (${totalPopulation} pop * ${multiplier})`);
    accumulatedResources['wood'] = (accumulatedResources['wood'] || 0) - woodConsumption;
  }
}

export default function IdleModeDialog() {
  const { idleModeDialog, setIdleModeDialog, idleModeState, sleepUpgrades } = useGameStore();
  const [accumulatedResources, setAccumulatedResources] = useState<Record<string, number>>({});
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [initialResources, setInitialResources] = useState<Record<string, number>>({});

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

        console.log('[IDLE MODE] Loading persisted state:', {
          startTime: idleModeState.startTime,
          elapsed,
          remaining,
          intervals: Math.floor((Math.min(elapsed, IDLE_DURATION_MS) / 1000) / 15)
        });

        setStartTime(idleModeState.startTime);
        setRemainingTime(remaining);

        // Calculate resources accumulated while offline
        const secondsElapsed = Math.min(elapsed, IDLE_DURATION_MS) / 1000;
        const intervals = Math.floor(secondsElapsed / 15); // How many 15-second intervals have passed

        // Get CURRENT resources state (most recent)
        const currentState = useGameStore.getState();
        
        console.log('[IDLE MODE] Starting resources:', currentState.resources);
        
        // Start with CURRENT game resources (most recent state)
        const offlineResources: Record<string, number> = { ...currentState.resources };

        // Simulate each 15-second interval
        console.log(`[IDLE MODE] Simulating ${intervals} intervals while you were away`);
        for (let i = 0; i < intervals; i++) {
          simulateGathererProduction(currentState, PRODUCTION_SPEED_MULTIPLIER, offlineResources);
          simulateHunterProduction(currentState, PRODUCTION_SPEED_MULTIPLIER, offlineResources);
          simulateMinerProduction(currentState, PRODUCTION_SPEED_MULTIPLIER, offlineResources);
          simulatePopulationConsumption(currentState, PRODUCTION_SPEED_MULTIPLIER, offlineResources);
        }

        console.log('[IDLE MODE] Final simulated resources:', offlineResources);

        // Calculate the delta (change) from starting resources
        const resourceDeltas: Record<string, number> = {};
        Object.keys(offlineResources).forEach(resource => {
          resourceDeltas[resource] = offlineResources[resource] - (currentState.resources[resource as keyof typeof currentState.resources] || 0);
        });

        console.log('[IDLE MODE] Resource deltas:', resourceDeltas);

        setAccumulatedResources(resourceDeltas);
        // Store the CURRENT resources as initial state (most recent before simulation started)
        setInitialResources({ ...currentState.resources });
        setIsActive(remaining > 0);
      } else {
        console.log('[IDLE MODE] Starting fresh idle mode');
        
        // Get the CURRENT (most recent) resources state
        const currentState = useGameStore.getState();
        setIsActive(true);
        setStartTime(now);
        setAccumulatedResources({});
        setRemainingTime(IDLE_DURATION_MS);
        // Store the CURRENT resources as initial state
        setInitialResources({ ...currentState.resources });

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
    const secondsUntilNextMark = 15 - (secondsElapsed % 15);
    const msUntilNextInterval = secondsUntilNextMark * 1000;

    const updateResources = () => {
      const currentState = useGameStore.getState();

      console.log('[IDLE MODE UPDATE] Starting resource update', {
        initialResources,
        currentResources: currentState.resources
      });

      // Accumulate resources using the same production functions as normal mode
      setAccumulatedResources(prev => {
        // Start with current tracked resources (delta from start)
        const currentTracked = { ...prev };
        
        // Create a simulated resource state (initial + accumulated changes)
        const simulatedResources: Record<string, number> = {};
        Object.keys(initialResources).forEach(resource => {
          simulatedResources[resource] = initialResources[resource] + (currentTracked[resource] || 0);
        });

        // Apply production functions to the simulated state
        simulateGathererProduction(currentState, PRODUCTION_SPEED_MULTIPLIER, simulatedResources);
        simulateHunterProduction(currentState, PRODUCTION_SPEED_MULTIPLIER, simulatedResources);
        simulateMinerProduction(currentState, PRODUCTION_SPEED_MULTIPLIER, simulatedResources);
        simulatePopulationConsumption(currentState, PRODUCTION_SPEED_MULTIPLIER, simulatedResources);

        // Calculate new deltas from initial state
        const newDeltas: Record<string, number> = {};
        Object.keys(simulatedResources).forEach(resource => {
          newDeltas[resource] = simulatedResources[resource] - initialResources[resource];
        });

        return newDeltas;
      });
    };

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
  }, [isActive, idleModeDialog.isOpen, startTime]);

  const handleEndIdleMode = () => {
    // Apply accumulated resources to the game state
    Object.entries(accumulatedResources).forEach(([resource, amount]) => {
      useGameStore.getState().updateResource(
        resource as keyof typeof state.resources,
        Math.floor(amount)
      );
    });

    // Create log message showing resources gained
    if (Object.keys(accumulatedResources).length > 0) {
      const resourcesList = Object.entries(accumulatedResources)
        .filter(([_, amount]) => Math.floor(amount) !== 0)
        .map(([resource, amount]) => `${capitalizeWords(resource)}: ${Math.floor(amount) > 0 ? '+' : ''}${Math.floor(amount)}`)
        .join(', ');

      if (resourcesList) {
        useGameStore.getState().addLogEntry({
          id: `idle-mode-end-${Date.now()}`,
          message: `While you slept: ${resourcesList}`,
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

  // Get all resources that have changed (only positive)
  const producedResources = Object.keys(accumulatedResources)
    .map(resource => {
      const amount = hasCompletedFirstInterval ? (accumulatedResources[resource] || 0) : 0;
      return [resource, amount] as [string, number];
    })
    .filter(([_, amount]) => Math.floor(amount) > 0) // Only show positive resource changes
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
          <div className="space-y-1">
            {producedResources.map(([resource, amount]) => (
              <div key={resource} className="flex justify-between items-center">
                <span className="text-sm font-medium">{capitalizeWords(resource)}:</span>
                <span className="text-sm tabular-nums">
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