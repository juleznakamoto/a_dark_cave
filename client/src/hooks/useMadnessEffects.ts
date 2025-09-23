
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
    const baseInterval = 15; // 15 seconds base
    const madnessMultiplier = Math.min(madness / 50, 0.8); // Max 80% reduction
    const effectInterval = baseInterval * (1 - madnessMultiplier);

    const triggerRandomEffect = () => {
      const effects = ['text-jitter', 'text-fade', 'text-echo', 'button-shift', 'overlay'];
      const randomEffect = effects[Math.floor(Math.random() * effects.length)];
      
      setCurrentEffect(randomEffect);
      setIsEffectActive(true);

      // Effect duration
      const effectDuration = randomEffect === 'overlay' ? 8000 : 
                           randomEffect === 'text-echo' ? 1200 :
                           randomEffect === 'text-fade' ? 800 : 400;

      setTimeout(() => {
        setIsEffectActive(false);
        setTimeout(() => setCurrentEffect(null), 5000);
      }, effectDuration);
    };

    const intervalId = setInterval(triggerRandomEffect, effectInterval);

    // Also trigger an effect immediately with some probability
    if (Math.random() < 0.3) {
      setTimeout(triggerRandomEffect, Math.random() * 3000);
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
