
import { ParticleButton } from '@/components/ui/particle-button';
import { useGameStore } from '@/game/state';

export default function StartScreen() {
  const { executeAction } = useGameStore();

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-4">
          <p className="text-lg text-gray-300 leading-relaxed">
            A dark cave.<br></br>The air is cold and stale.<br></br>You can barely make out the shapes around you.
          </p>
        </div>
        <ParticleButton
          onClick={handleLightFire}
          className="bg-transparent border-none text-white hover:bg-transparent text-lg px-8 py-4 fire-hover z-[99999]"
          data-testid="button-light-fire"
          hoverDelay={1500}
        >
          Light Fire
        </ParticleButton>
      </main>
    </div>
  );
}
