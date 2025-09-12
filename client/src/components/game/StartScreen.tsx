
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';

export default function StartScreen() {
  const { executeAction } = useGameStore();

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        <Button
          onClick={handleLightFire}
          className="bg-transparent border-none text-white hover:bg-transparent hover:text-gray-300 text-lg px-8 py-4"
          data-testid="button-light-fire"
        >
          Light Fire
        </Button>
      </main>
    </div>
  );
}
