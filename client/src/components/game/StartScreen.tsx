
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';

export default function StartScreen() {
  const { executeAction } = useGameStore();

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-gray-800/10"></div>
        <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-gray-700/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-gray-600/3 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-gray-800/4 rounded-full blur-xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
      </div>
      
      <main className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="text-center mb-8">
          <p className="text-lg text-gray-300 leading-relaxed">
            A dark cave. The air is cold and stale. You can barely make out the shapes around you.
          </p>
        </div>
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
