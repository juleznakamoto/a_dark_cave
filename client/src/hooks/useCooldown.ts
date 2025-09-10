
import { useState, useEffect, useCallback } from 'react';

interface UseCooldownReturn {
  isCoolingDown: boolean;
  progress: number; // 0 to 1, where 1 is fully cooled down
  startCooldown: (durationMs: number) => void;
  remainingTime: number; // in milliseconds
}

export function useCooldown(): UseCooldownReturn {
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [progress, setProgress] = useState(1);
  const [remainingTime, setRemainingTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const startCooldown = useCallback((durationMs: number) => {
    if (isCoolingDown) return; // Prevent starting multiple cooldowns
    
    setIsCoolingDown(true);
    setProgress(0);
    setRemainingTime(durationMs);
    setTotalDuration(durationMs);
  }, [isCoolingDown]);

  useEffect(() => {
    if (!isCoolingDown) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const newRemaining = Math.max(0, prev - 50); // Update every 50ms for smooth animation
        
        if (newRemaining <= 0) {
          setIsCoolingDown(false);
          setProgress(1);
          return 0;
        }
        
        // Calculate progress (0 = just started, 1 = finished)
        const newProgress = 1 - (newRemaining / totalDuration);
        setProgress(newProgress);
        
        return newRemaining;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isCoolingDown, totalDuration]);

  return {
    isCoolingDown,
    progress,
    startCooldown,
    remainingTime,
  };
}
