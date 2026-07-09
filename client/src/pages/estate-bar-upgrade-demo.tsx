import { useState } from "react";
import { Redirect } from "wouter";
import { Progress } from "@/components/ui/progress";
import { ImproveButton } from "@/components/ui/improve-button";
import { Button } from "@/components/ui/button";

const ESTATE_BAR_GROW_ANIMATION_MS = 500;

type DemoBarConfig = {
  id: string;
  title: string;
  description: string;
  maxLevel: number;
};

const DEMO_BARS: DemoBarConfig[] = [
  {
    id: "sleep-length",
    title: "Sleep Length",
    description: "Max idle time while sleeping",
    maxLevel: 5,
  },
  {
    id: "sleep-intensity",
    title: "Sleep Intensity",
    description: "Production bonus while sleeping",
    maxLevel: 5,
  },
  {
    id: "huntress-training",
    title: "Huntress Training",
    description: "+2 hunt bonus, +1 food per hunter",
    maxLevel: 5,
  },
];

function EstateUpgradeBar({
  title,
  description,
  level,
  maxLevel,
  onUpgrade,
  buttonId,
}: {
  title: string;
  description: string;
  level: number;
  maxLevel: number;
  onUpgrade: () => void;
  buttonId: string;
}) {
  const canUpgrade = level < maxLevel;

  return (
    <div className="w-full max-w-md space-y-1 rounded-md border border-border/60 bg-neutral-950/80 p-3">
      <div className="flex items-center justify-between">
        <span className="pb-1 text-xs font-medium text-foreground">{title}</span>
        {canUpgrade ? (
          <ImproveButton
            onClick={onUpgrade}
            disabled={false}
            button_id={buttonId}
            variant="flash"
          />
        ) : null}
      </div>
      <Progress
        value={(level / maxLevel) * 100}
        className="h-2"
        segments={maxLevel}
        growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
        emitSparksOnGrow
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Level {level}/{maxLevel} — {description}
        </span>
      </div>
    </div>
  );
}

export default function EstateBarUpgradeDemo() {
  const [levels, setLevels] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEMO_BARS.map((bar) => [bar.id, 0])),
  );

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const upgrade = (id: string, maxLevel: number) => {
    setLevels((prev) => {
      const current = prev[id] ?? 0;
      if (current >= maxLevel) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  const resetAll = () => {
    setLevels(Object.fromEntries(DEMO_BARS.map((bar) => [bar.id, 0])));
  };

  const maxAll = () => {
    setLevels(
      Object.fromEntries(DEMO_BARS.map((bar) => [bar.id, bar.maxLevel])),
    );
  };

  return (
    <div className="min-h-[100dvh] w-full bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <h1 className="text-lg font-semibold">Estate bar upgrade animation</h1>
          <p className="text-sm text-muted-foreground">
            Dev preview for segmented progress bars with grow transition and spark
            particles. Click <span className="text-foreground">Improve</span> to
            trigger the same animation used in the Estate tab.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={resetAll}>
              Reset all
            </Button>
            <Button size="sm" variant="outline" onClick={maxAll}>
              Max all
            </Button>
          </div>
        </header>

        <section className="space-y-3">
          {DEMO_BARS.map((bar) => (
            <EstateUpgradeBar
              key={bar.id}
              title={bar.title}
              description={bar.description}
              level={levels[bar.id] ?? 0}
              maxLevel={bar.maxLevel}
              onUpgrade={() => upgrade(bar.id, bar.maxLevel)}
              buttonId={`demo-upgrade-${bar.id}`}
            />
          ))}
        </section>

        <p className="text-xs text-muted-foreground">
          Animation: {ESTATE_BAR_GROW_ANIMATION_MS}ms grow + tip glow + canvas
          sparks (matches <code className="text-foreground">EstatePanel</code>).
        </p>
      </div>
    </div>
  );
}
