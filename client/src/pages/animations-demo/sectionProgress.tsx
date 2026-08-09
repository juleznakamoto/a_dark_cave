import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { SegmentedProgress } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

/** Same duration CombatDialog uses for health / integrity bars. */
const COMBAT_BAR_CHANGE_MS = 500;

export function ProgressBarsSection() {
  const [growValue, setGrowValue] = useState(40);
  const [enemyHealth, setEnemyHealth] = useState(80);
  const [integrity, setIntegrity] = useState(70);
  const [focusProgress, setFocusProgress] = useState(65);

  return (
    <DemoSection
      id="progress-bars"
      title="Progress bars"
      description="Real Progress with the same props as EstatePanel / CombatDialog."
    >
      <div className="max-w-md space-y-2">
        <p className="text-xs text-muted-foreground">Estate grow + glow</p>
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
        <p className="text-xs text-muted-foreground">
          Enemy health (CombatDialog props: red heal sparks + decrease bubbles)
        </p>
        <Progress
          value={enemyHealth}
          hideBorder
          flashOnDecrease
          growAnimationMs={COMBAT_BAR_CHANGE_MS}
          emitSparksOnGrow
          growSparkIntensity="subtle"
          growSparkTipGlow={false}
          emitCirclesOnDecrease
          indicatorClassName="bg-red-900"
          className="h-2"
        />
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setEnemyHealth((v) => Math.max(0, v - 25))}
          >
            -25 HP
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setEnemyHealth((v) => Math.min(100, v + 25))}
          >
            +25 HP
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setEnemyHealth(100)}
          >
            Full
          </Button>
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <p className="text-xs text-muted-foreground">
          Bastion integrity (CombatDialog props: heal sparks + decrease bubbles)
        </p>
        <Progress
          value={integrity}
          hideBorder
          flashOnDecrease
          growAnimationMs={COMBAT_BAR_CHANGE_MS}
          emitSparksOnGrow
          growSparkIntensity="subtle"
          growSparkTipGlow={false}
          emitCirclesOnDecrease
          indicatorClassName="bg-green-900"
          className="h-2"
        />
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setIntegrity((v) => Math.max(0, v - 25))}
          >
            -25
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setIntegrity((v) => Math.min(100, v + 25))}
          >
            +25 heal
          </Button>
          <Button size="xs" variant="outline" onClick={() => setIntegrity(100)}>
            Full
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

      <div className="max-w-md space-y-2">
        <p className="text-xs text-muted-foreground">
          Segmented progress (Steam demo footer style)
        </p>
        <div className="max-w-[10rem]">
          <SegmentedProgress
            value={growValue}
            segments={8}
            label="Demo Progress"
            showPercentage
            showDemo
            compact
            filledClassName="bg-green-700"
            emptyClassName="bg-neutral-700"
            filledGlowClassName="shadow-[0_0_12px_rgba(21,128,61,0.45)]"
            segmentClassName="h-1.5"
          />
        </div>
      </div>
    </DemoSection>
  );
}
