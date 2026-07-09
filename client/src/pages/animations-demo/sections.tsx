import { useRef, useState } from "react";
import cn from "clsx";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
} from "@/components/game/BuildingActionBadge";
import { Progress } from "@/components/ui/progress";
import { ImproveButton } from "@/components/ui/improve-button";
import { Button } from "@/components/ui/button";
import { CircularProgress } from "@/components/ui/circular-progress";
import { ResourceCoinIcon } from "@/components/ui/resource-coin-icon";
import { ResourceInsightIcon } from "@/components/ui/resource-insight-icon";
import {
  useCoinHoverParticles,
  CoinHoverParticleSurface,
} from "@/components/ui/coin-hover-particles";
import {
  BUILD_PARTICLE_CONFIG,
  CRAFT_PARTICLE_CONFIG,
  REWARDS_TASKS_PARTICLE_CONFIG,
  TRADER_TAB_PARTICLE_CONFIG,
} from "@/components/ui/bubbly-button.particles";
import {
  LIME_ACCENT_GLOW_TEXT_SHADOW_ACTIVE,
  LIME_ACCENT_GLOW_TEXT_SHADOW_HOVER,
  LIME_ACCENT_ICON_IDLE,
} from "@/components/game/gameChrome";
import {
  handleDonateHeartAnimationEnd,
  triggerExclusivePromoPingOnce,
} from "@/lib/exclusivePromoShockwave";

const ESTATE_BAR_GROW_ANIMATION_MS = 500;
const BOOST_GLYPH = "\u23E9";

export function DemoSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-6 space-y-3 rounded-md border border-border/60 bg-neutral-950/80 p-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DemoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {children}
      </div>
    </div>
  );
}

export function EstateBarsSection() {
  const [level, setLevel] = useState(0);
  const maxLevel = 5;

  return (
    <DemoSection
      id="estate-bars"
      title="Estate upgrade bars"
      description="Segmented progress bars with grow transition, tip glow, and canvas sparks — used in EstatePanel skill/sleep upgrades."
    >
      <div className="w-full max-w-md space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Sleep Length</span>
          {level < maxLevel ? (
            <ImproveButton
              onClick={() => setLevel((l) => Math.min(maxLevel, l + 1))}
              disabled={false}
              button_id="demo-estate-improve"
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
      description="Estate upgrade control — brief red text flash on click."
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
      description="BuildingActionBadge — hover the badge for preview animation; toggle Playing for the insight-reveal loop."
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
              style={{ bottom: -9, right: -9, width: 20, height: 20, zIndex: 30 }}
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

const PARTICLE_PRESETS = [
  { id: "build", label: "Build", config: BUILD_PARTICLE_CONFIG },
  { id: "craft", label: "Craft", config: CRAFT_PARTICLE_CONFIG },
] as const;

export function ButtonParticlesSection() {
  return (
    <DemoSection
      id="button-particles"
      title="Button click particles"
      description="CooldownButton inline particle bursts — village build vs cave craft presets."
    >
      <div className="flex flex-wrap gap-4">
        {PARTICLE_PRESETS.map((preset) => (
          <CooldownButton
            key={preset.id}
            onClick={() => { }}
            cooldownMs={0}
            size="sm"
            variant="outline"
            className={gameActionOutlineButtonClassName(false)}
            data-testid={`demo-particles-${preset.id}`}
            button_id={`demo-particles-${preset.id}`}
            particleConfig={preset.config}
          >
            {preset.label}
          </CooldownButton>
        ))}
      </div>
    </DemoSection>
  );
}

export function HoverParticlesSection() {
  const traderIconRef = useRef<HTMLSpanElement>(null);
  const { hoverHandlers: traderHoverHandlers, portal: traderPortal } =
    useCoinHoverParticles("gold", {
      particleOriginRef: traderIconRef,
      particleConfig: TRADER_TAB_PARTICLE_CONFIG,
      zIndex: 50,
    });

  return (
    <DemoSection
      id="hover-particles"
      title="Hover particles"
      description="Coin / insight / trader tab hover bursts — hover each glyph to preview."
    >
      <DemoRow label="Gold">
        <ResourceCoinIcon resource="gold" />
      </DemoRow>
      <DemoRow label="Silver">
        <ResourceCoinIcon resource="silver" />
      </DemoRow>
      <DemoRow label="Insight">
        <ResourceInsightIcon />
      </DemoRow>
      <DemoRow label="Trader tab">
        <button type="button" className="inline-flex" {...traderHoverHandlers}>
          <span
            ref={traderIconRef}
            className={cn(
              "font-noto-symbols-2 cursor-default text-[19px] leading-none text-lime-500",
              LIME_ACCENT_ICON_IDLE,
              LIME_ACCENT_GLOW_TEXT_SHADOW_HOVER,
            )}
          >
            ◬
          </span>
        </button>
        {traderPortal}
      </DemoRow>
      <DemoRow label="Rewards">
        <CoinHoverParticleSurface
          resource="gold"
          particleConfig={REWARDS_TASKS_PARTICLE_CONFIG}
          className="inline-flex"
        >
          <span className="font-noto-symbols-2 text-lg text-lime-500">⯫</span>
        </CoinHoverParticleSurface>
      </DemoRow>
    </DemoSection>
  );
}

export function ProgressBarsSection() {
  const [growValue, setGrowValue] = useState(40);
  const [healthValue, setHealthValue] = useState(80);

  return (
    <DemoSection
      id="progress-bars"
      title="Progress bars"
      description="Grow glow, estate sparks, and combat health flash-on-decrease."
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
            −25 HP
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
    </DemoSection>
  );
}

export function TabAnimationsSection() {
  const [blink, setBlink] = useState(false);
  const [fade, setFade] = useState(false);

  return (
    <DemoSection
      id="tab-animations"
      title="Tab unlock animations"
      description="tab-blink-new and tab-fade-in classes used when new tabs unlock."
    >
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="outline"
          className={blink ? "tab-blink-new" : ""}
          onClick={() => {
            setBlink(false);
            requestAnimationFrame(() => setBlink(true));
          }}
        >
          Replay blink
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={fade ? "tab-fade-in" : ""}
          onClick={() => {
            setFade(false);
            requestAnimationFrame(() => setFade(true));
          }}
        >
          Replay fade-in
        </Button>
      </div>
    </DemoSection>
  );
}

export function MiscAnimationsSection() {
  const [focusProgress, setFocusProgress] = useState(65);
  const [compassGlow, setCompassGlow] = useState(false);
  const shockwaveRef = useRef<HTMLSpanElement>(null);
  const heartRef = useRef<HTMLSpanElement>(null);

  return (
    <DemoSection
      id="misc"
      title="Focus, glow & promo effects"
      description="Focus timer ring, focus button glow, cube hover glow, new-item pulse, compass glow, shockwave ping, donate heart pump."
    >
      <DemoRow label="Focus ring">
        <div className="relative inline-flex items-center gap-1">
          <CircularProgress
            value={focusProgress}
            size={18}
            strokeWidth={2}
            className="text-teal-400"
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-teal-400">
            ☩
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

      <DemoRow label="Focus glow">
        <Button
          size="sm"
          variant="outline"
          className="focus-glow-hover h-7"
        >
          Focus
        </Button>
        <Button size="sm" variant="outline" className="focus-glow h-7">
          Active glow
        </Button>
      </DemoRow>

      <DemoRow label="Cube glow">
        <button
          type="button"
          className="group flex items-center gap-2 text-left"
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 transition-all group-hover:border-neutral-500 group-hover:bg-neutral-800">
            <span className="text-md">▣</span>
            <span className="cube-dialog-glow pointer-events-none absolute inset-0 rounded opacity-0 transition-opacity group-hover:opacity-30" />
          </span>
          <span className="text-xs">Hover cube</span>
        </button>
      </DemoRow>

      <DemoRow label="New item">
        <span className="new-item-pulse text-xs text-amber-400">● New</span>
      </DemoRow>

      <DemoRow label="Compass">
        <Button
          size="sm"
          variant="outline"
          className={compassGlow ? "compass-glow" : ""}
          onClick={() => {
            setCompassGlow(false);
            requestAnimationFrame(() => setCompassGlow(true));
          }}
        >
          Trigger compass glow
        </Button>
      </DemoRow>

      <DemoRow label="Shockwave">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center overflow-visible rounded-md border border-border hover:bg-muted/30"
          onClick={() => triggerExclusivePromoPingOnce(shockwaveRef.current)}
        >
          <span
            ref={shockwaveRef}
            className="exclusive-promo-shockwave-ring exclusive-promo-shockwave-ring--no-ambient"
            aria-hidden
            onAnimationEnd={(e) => {
              if (e.animationName === "exclusive-promo-shockwave-once") {
                e.currentTarget.classList.remove(
                  "exclusive-promo-shockwave-ring--ping-once",
                );
              }
            }}
          />
          <span className="relative z-[1] text-lg text-lime-500">⯫</span>
        </button>
        <span className="text-xs text-muted-foreground">Click to ping once</span>
      </DemoRow>

      <DemoRow label="Donate heart">
        <button
          type="button"
          className="group flex items-center gap-1"
          onClick={() => {
            const heart = heartRef.current;
            if (!heart) return;
            heart.classList.remove("donate-heart-pump-once");
            void heart.offsetWidth;
            requestAnimationFrame(() => {
              heart.classList.add("donate-heart-pump-once");
            });
          }}
        >
          <span
            ref={heartRef}
            className="donate-heart text-lg text-red-600 opacity-80 group-hover:opacity-100"
            onAnimationEnd={(e) =>
              handleDonateHeartAnimationEnd(e.currentTarget, e.animationName)
            }
          >
            ♥
          </span>
          <span className="text-xs text-muted-foreground">Click to pump</span>
        </button>
      </DemoRow>

      <DemoRow label="Trader glow">
        <span
          className={cn(
            "font-noto-symbols-2 text-[19px] leading-none text-lime-500",
            LIME_ACCENT_ICON_IDLE,
            LIME_ACCENT_GLOW_TEXT_SHADOW_ACTIVE,
          )}
        >
          ◬
        </span>
        <span className="text-xs text-muted-foreground">
          Active hint state (15m trader tab)
        </span>
      </DemoRow>
    </DemoSection>
  );
}
