
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
      <div className="absolute inset-0 opacity-60">
        <Canvas camera={{ position: [0, 0, 2] }}>
          <ShaderPlane position={[0, 0, -1]} color1="#ff5722" color2="#ffffff" />
          <EnergyRing radius={1.5} position={[-1, 0.5, 0]} />
          <EnergyRing radius={1} position={[1, -0.5, 0]} />
        </Canvas>
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
