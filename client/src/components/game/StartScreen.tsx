
import { ParticleButton } from '@/components/ui/particle-button';
import { useGameStore } from '@/game/state';
import CloudShader from '@/components/ui/cloud-shader';

export default function StartScreen() {
  const { executeAction } = useGameStore();

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <CloudShader />
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-4">
          <p className="text-lg text-gray-300 leading-relaxed">
            A dark cave.<br></br>The air is cold and damp.<br></br>You barely see the shapes around you.
          </p>
        </div>
        <ParticleButton
          onClick={handleLightFire}
          className="bg-transparent border-none text-white hover:bg-transparent text-lg px-8 py-4 fire-hover z-[99999]"
          data-testid="button-light-fire"
        >
          Light Fire
        </ParticleButton>
      </main>
    </div>
  );
}
