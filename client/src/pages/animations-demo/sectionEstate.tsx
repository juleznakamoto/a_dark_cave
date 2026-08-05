import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ImproveButton } from "@/components/ui/improve-button";
import { Button } from "@/components/ui/button";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
} from "@/components/game/BuildingActionBadge";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

const ESTATE_BAR_GROW_ANIMATION_MS = 500;
const BOOST_GLYPH = "\u23E9";

export function EstateBarsSection() {
  const [level, setLevel] = useState(0);
  const maxLevel = 5;

  return (
    <DemoSection
      id="estate-bars"
      title="Estate upgrade bars"
      description="Real Progress + ImproveButton (EstatePanel skill/sleep upgrades)."
    >
      <div className="w-full max-w-md space-y-1">
        <div className="flex h-6 items-center justify-between">
          <span className="text-xs font-medium">Sleep Length</span>
          <div className="flex h-5 shrink-0 items-center justify-end pb-1">
            {level < maxLevel ? (
              <ImproveButton
                onClick={() => setLevel((l) => Math.min(maxLevel, l + 1))}
                disabled={false}
                button_id="demo-estate-improve"
              />
            ) : null}
          </div>
        </div>
        <Progress
          value={(level / maxLevel) * 100}
          className="h-2"
          segments={maxLevel}
          growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
          emitSparksOnGrow
        />
        <p className="text-xs text-muted-foreground">
          Level {level}/{maxLevel}
        </p>
        <Button size="xs" variant="outline" onClick={() => setLevel(0)}>
          Reset
        </Button>
      </div>
    </DemoSection>
  );
}

export function ImproveButtonSection() {
  const [clicks, setClicks] = useState(0);

  return (
    <DemoSection
      id="improve-button"
      title="Improve button"
      description="Real ImproveButton (improve-text-flash on click)."
    >
      <DemoRow label="Enabled">
        <ImproveButton
          onClick={() => setClicks((n) => n + 1)}
          disabled={false}
          button_id="demo-improve"
        />
      </DemoRow>
      <DemoRow label="Disabled">
        <ImproveButton
          onClick={() => { }}
          disabled
          button_id="demo-improve-disabled"
        />
      </DemoRow>
      <p className="text-xs text-muted-foreground">Clicks: {clicks}</p>
    </DemoSection>
  );
}

export function InsightBadgeSection() {
  const [playing, setPlaying] = useState(false);
  const [canAfford, setCanAfford] = useState(true);
  const [size, setSize] = useState<"sm" | "lg">("lg");
  const [glyph, setGlyph] = useState<"insight" | "boost">("insight");

  return (
    <DemoSection
      id="insight-badge"
      title="Insight / action badges"
      description="Real BuildingActionBadge. Hover for preview; Play reveal for the loop."
    >
      <div className="flex flex-wrap gap-2">
        <Button
          size="xs"
          variant={playing ? "default" : "outline"}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Stop playing" : "Play reveal"}
        </Button>
        <Button
          size="xs"
          variant={canAfford ? "default" : "outline"}
          onClick={() => setCanAfford((a) => !a)}
        >
          {canAfford ? "Affordable" : "Unaffordable"}
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() => setSize((s) => (s === "lg" ? "sm" : "lg"))}
        >
          Size: {size}
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={() =>
            setGlyph((g) => (g === "insight" ? "boost" : "insight"))
          }
        >
          Glyph: {glyph === "insight" ? "Insight" : "Boost"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-8 pt-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Inline</p>
          <button
            type="button"
            className={getInsightBadgeTriggerClassName({
              canAfford,
              playing,
              className: size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5",
            })}
          >
            <BuildingActionBadge
              playing={playing}
              embedded
              size={size}
              glyph={glyph === "boost" ? BOOST_GLYPH : undefined}
            />
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Action overlay</p>
          <div className="relative inline-block">
            <Button size="sm" variant="outline" className="h-7">
              Build Cabin
            </Button>
            <div
              className="absolute"
              style={{
                bottom: -9,
                right: -9,
                width: 20,
                height: 20,
                zIndex: 30,
              }}
            >
              <button
                type="button"
                className={getInsightBadgeTriggerClassName({
                  canAfford,
                  playing,
                  className: "flex h-full w-full",
                })}
              >
                <BuildingActionBadge
                  playing={playing}
                  embedded
                  size="lg"
                  glyph={glyph === "boost" ? BOOST_GLYPH : undefined}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
