
import { gameTexts } from '@/game/rules';

export default function WorldPanel() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="font-serif text-lg leading-relaxed">
          {gameTexts.world.initial}
        </p>
      </div>
    </div>
  );
}
