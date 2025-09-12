
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { Canvas } from '@react-three/fiber';
import { ShaderPlane, EnergyRing } from '@/components/ui/background-paper-shaders';

export default function StartScreen() {
  const { executeAction } = useGameStore();

  const handleLightFire = () => {
    executeAction('lightFire');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Three.js Canvas Background */}
      <div className="absolute inset-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 2] }}>
          <ShaderPlane position={[0, 0, -1]} color1="#1a1a1a" color2="#333333" />
          <EnergyRing radius={1.5} position={[-1, 0.5, 0]} />
          <EnergyRing radius={1} position={[1, -0.5, 0]} />
        </Canvas>
      </div>

      {/* Static atmospheric effects overlay */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/3 w-32 h-32 bg-gray-700/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-24 h-24 bg-gray-600/8 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-gray-800/6 rounded-full blur-xl animate-pulse" style={{animationDelay: '0.5s'}}></div>
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
