
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/state';

export function useResourceAnimation() {
  const resources = useGameStore(state => state.resources);
  const prevResourcesRef = useRef(resources);
  const [animatingResources, setAnimatingResources] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prevResources = prevResourcesRef.current;
    const newAnimating = new Set<string>();

    // Check for resource changes
    Object.entries(resources).forEach(([key, value]) => {
      const prevValue = prevResources[key as keyof typeof prevResources] || 0;
      if (value > prevValue) {
        newAnimating.add(key);
      }
    });

    if (newAnimating.size > 0) {
      setAnimatingResources(newAnimating);
      
      // Clear animations after 2 seconds
      setTimeout(() => {
        setAnimatingResources(new Set());
      }, 2000);
    }

    prevResourcesRef.current = resources;
  }, [resources]);

  return animatingResources;
}
