import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useExplosionEffect } from "@/components/ui/explosion-effect";

export default function ExplosionTest() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const explosionEffect = useExplosionEffect();

  const handleClick = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    explosionEffect.triggerExplosion(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      {explosionEffect.ExplosionEffectRenderer()}

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">Gate Blast — Effect Test</h1>
        <p className="text-muted-foreground text-sm">
          Tweak <code className="text-xs bg-muted px-1 py-0.5 rounded">explosion-effect.tsx</code> and click to preview
        </p>
      </div>

      <Button
        ref={buttonRef}
        onClick={handleClick}
        variant="outline"
        size="lg"
        className="text-base px-8"
      >
        💥 Blast Gate
      </Button>
    </div>
  );
}
