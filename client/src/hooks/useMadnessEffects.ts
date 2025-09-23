
import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/state';
import { getTotalMadness } from '@/game/rules/effects';

export const useMadnessEffects = () => {
  const state = useGameStore();
  const [isEffectActive, setIsEffectActive] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);
  
  const madness = getTotalMadness(state);
  const shouldTriggerEffects = madness > 10;

  useEffect(() => {
    if (!shouldTriggerEffects) {
      setIsEffectActive(false);
      setCurrentEffect(null);
      return;
    }

    // Calculate effect frequency based on madness level
    const baseInterval = 8; // 8 seconds base for more frequent effects
    const madnessMultiplier = Math.min(madness / 50, 0.7); // Max 70% reduction
    const effectInterval = Math.max(2, baseInterval * (1 - madnessMultiplier)); // Minimum 2 seconds

    const triggerRandomEffect = () => {
      const effects = ['text-jitter', 'text-fade', 'text-echo', 'button-shift', 'overlay'];
      const randomEffect = effects[Math.floor(Math.random() * effects.length)];
      
      setCurrentEffect(randomEffect);
      setIsEffectActive(true);

      // Effect duration
      const effectDuration = randomEffect === 'overlay' ? 8000 : 
                           randomEffect === 'text-echo' ? 12000 :
                           randomEffect === 'text-fade' ? 8000 : 4000;

      setTimeout(() => {
        setIsEffectActive(false);
        setTimeout(() => setCurrentEffect(null), 5000);
      }, effectDuration);
    };

    const intervalId = setInterval(triggerRandomEffect, effectInterval);

    // Also trigger an effect immediately with higher probability for testing
    if (Math.random() < 0.8) {
      setTimeout(triggerRandomEffect, Math.random() * 2000);
    }

    return () => clearInterval(intervalId);
  }, [shouldTriggerEffects, madness]);

  return {
    isEffectActive,
    currentEffect,
    madnessLevel: madness,
    shouldTriggerEffects
  };
};

export default useMadnessEffects;
