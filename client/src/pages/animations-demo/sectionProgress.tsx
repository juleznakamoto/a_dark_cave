import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

export function ProgressBarsSection() {
  const [growValue, setGrowValue] = useState(40);
  const [healthValue, setHealthValue] = useState(80);
  const [focusProgress, setFocusProgress] = useState(65);

  return (
    <DemoSection
      id="progress-bars"
      title="Progress bars"
      description="Real Progress (grow glow, combat flash) and CircularProgress (focus ring)."
    >
      <div className="max-w-md space-y-2">
        <p className="text-xs text-muted-foreground">Grow + glow</p>
        <Progress value={growValue} className="h-2" growAnimationMs={400} />
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setGrowValue((v) => Math.min(100, v + 20))}
          >
            +20%
          </Button>
          <Button size="xs" variant="outline" onClick={() => setGrowValue(0)}>
            Reset
          </Button>
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <p className="text-xs text-muted-foreground">Combat flash on decrease</p>
        <Progress
          value={healthValue}
          className="h-2"
          flashOnDecrease
          indicatorClassName="bg-red-700"
        />
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setHealthValue((v) => Math.max(0, v - 25))}
          >
            -25 HP
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setHealthValue(100)}
          >
            Heal
          </Button>
        </div>
      </div>

      <DemoRow label="Focus ring">
        <div className="relative inline-flex items-center gap-1">
          <CircularProgress
            value={focusProgress}
            size={18}
            strokeWidth={2}
            className="text-teal-400"
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-teal-400">
            {"\u2629"}
          </span>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setFocusProgress((v) => (v >= 100 ? 10 : v + 15))}
        >
          Tick
        </Button>
      </DemoRow>
    </DemoSection>
  );
}
