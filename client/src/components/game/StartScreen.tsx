
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';

export default function StartScreen() {
  const { executeAction } = useGameStore();

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <p className="text-lg text-gray-300 leading-relaxed">
            A dark cave. The air is cold and stale. You can barely make out the shapes around you.
          </p>
        </div>
        <Button
          onClick={handleLightFire}
          className="bg-transparent border-none text-white hover:bg-transparent text-lg px-8 py-4 fire-hover"
          data-testid="button-light-fire"
        >
          Light Fire
        </Button>
      </main>
    </div>
  );
}
