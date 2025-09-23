import SidePanel from "./panels/SidePanel";
import { useGameStore } from "@/game/state";
import { useEffect } from "react";
import { useMadnessEffects } from '@/hooks/useMadnessEffects';

export default function GameTabs() {
  const {
    buildings,
    villagers,
    updatePopulation,
  } = useGameStore();
  const { isEffectActive, currentEffect } = useMadnessEffects();

  // Update population whenever the component renders
  useEffect(() => {
    updatePopulation();
  }, [villagers, buildings.woodenHut, updatePopulation]);

  return (
    <div className={`flex flex-col h-full ${
      isEffectActive && (currentEffect === 'text-jitter' || currentEffect === 'text-fade' || currentEffect === 'text-echo') 
        ? `madness-${currentEffect}` : ''
    }`}>
      <SidePanel />
    </div>
  );
}