import { useEffect, useState } from "react";
import cn from "clsx";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import { useGameStore } from "@/game/state";
import { ResourceCoinIcon } from "@/components/ui/resource-coin-icon";
import { ResourceInsightIcon } from "@/components/ui/resource-insight-icon";
import { CoinHoverParticleSurface } from "@/components/ui/coin-hover-particles";
import {
  CLICK_PARTICLE_DEMO_PRESETS,
  HOVER_PARTICLE_DEMO_PRESETS,
  type HoverParticleDemoPreset,
} from "@/components/ui/bubbly-button.particles";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  GOLD_ACCENT_MASK_ICON_CLASS,
  TAB_ICON_SIZE_CLASS,
} from "@/components/game/gameChrome";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

const REWARDS_GLYPH = "\u2B26";

const DEMO_WASH_CYCLE_MS = 8_000;

function useClickWash(mode: "fill" | "recede") {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => {
      const t = Date.now();
      if (t - startedAt >= DEMO_WASH_CYCLE_MS) {
        setStartedAt(null);
        return;
      }
      setNow(t);
    }, 50);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsed = startedAt == null ? 0 : now - startedAt;
  const previewOverlay =
    startedAt == null
      ? null
      : {
        widthPercent:
          mode === "fill"
            ? Math.min(100, (elapsed / DEMO_WASH_CYCLE_MS) * 100)
            : Math.max(0, (1 - elapsed / DEMO_WASH_CYCLE_MS) * 100),
        mode,
      };

  return {
    previewOverlay,
    start: () => {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    },
  };
}

export function CooldownWashSection() {
  const fill = useClickWash("fill");
  const recede = useClickWash("recede");

  useEffect(() => {
    useGameStore.setState((s) => {
      const cooldowns = { ...s.cooldowns };
      const initialCooldowns = { ...s.initialCooldowns };
      const executionStartTimes = { ...s.executionStartTimes };
      const executionDurations = { ...s.executionDurations };
      for (const key of [
        "demoCooldownWashFill",
        "demoCooldownWashRecede",
      ]) {
        delete cooldowns[key];
        delete initialCooldowns[key];
        delete executionStartTimes[key];
        delete executionDurations[key];
      }
      return {
        cooldowns,
        initialCooldowns,
        executionStartTimes,
        executionDurations,
      };
    });
  }, []);

  return (
    <DemoSection
      id="cooldown-wash"
      title="Cooldown wash"
      description="Click a button to play the wash once. Execution fills left to right with a brighter edge. Cooldown recedes with a darker edge."
    >
      <DemoRow label="Execution fill">
        <CooldownButton
          onClick={fill.start}
          cooldownMs={0}
          button_id="demoWashFillClick"
          data-testid="demo-cooldown-wash-fill"
          size="xs"
          variant="outline"
          previewOverlay={fill.previewOverlay}
        >
          Gather Wood
        </CooldownButton>
      </DemoRow>
      <DemoRow label="Cooldown recede">
        <CooldownButton
          onClick={recede.start}
          cooldownMs={0}
          button_id="demoWashRecedeClick"
          data-testid="demo-cooldown-wash-recede"
          size="xs"
          variant="outline"
          previewOverlay={recede.previewOverlay}
        >
          Call Merchant
        </CooldownButton>
      </DemoRow>
    </DemoSection>
  );
}

function hoverGlyphForPreset(preset: HoverParticleDemoPreset): React.ReactNode {
  switch (preset.id) {
    case "traderTab":
      return (
        <span className="group inline-flex cursor-default">
          <GameUiIcon
            name="trader"
            sizeClassName={TAB_ICON_SIZE_CLASS}
            className={cn("text-yellow-500", GOLD_ACCENT_MASK_ICON_CLASS)}
          />
        </span>
      );
    case "rewardsTasks":
      return (
        <span className="font-noto-symbols-2 text-lg text-lime-500">
          {REWARDS_GLYPH}
        </span>
      );
    case "fireLoad":
      return (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-orange-700/60 text-xs text-orange-500">
          fire
        </span>
      );
    case "shopGlyph":
      return (
        <span className="font-noto-symbols-2 text-lg text-emerald-600">
          {REWARDS_GLYPH}
        </span>
      );
    default:
      return (
        <span className="text-xs text-muted-foreground">{preset.label}</span>
      );
  }
}

export function ButtonParticlesSection() {
  return (
    <DemoSection
      id="button-particles"
      title="Button click particles"
      description="Driven by CLICK_PARTICLE_DEMO_PRESETS in bubbly-button.particles.ts (same configs the game uses)."
    >
      <div className="flex flex-wrap gap-3">
        {CLICK_PARTICLE_DEMO_PRESETS.map((preset) => (
          <CooldownButton
            key={preset.id}
            onClick={() => { }}
            cooldownMs={0}
            size="sm"
            variant="outline"
            className={gameActionOutlineButtonClassName(false)}
            data-testid={`demo-particles-${preset.id}`}
            button_id={`demo-particles-${preset.id}`}
            particleConfig={preset.getConfig()}
          >
            {preset.label}
          </CooldownButton>
        ))}
      </div>
    </DemoSection>
  );
}

export function HoverParticlesSection() {
  return (
    <DemoSection
      id="hover-particles"
      title="Hover particles"
      description="Real ResourceCoinIcon / ResourceInsightIcon, plus HOVER_PARTICLE_DEMO_PRESETS for the remaining hover bursts."
    >
      <DemoRow label="Gold (icon)">
        <ResourceCoinIcon resource="gold" />
      </DemoRow>
      <DemoRow label="Silver (icon)">
        <ResourceCoinIcon resource="silver" />
      </DemoRow>
      <DemoRow label="Insight (icon)">
        <ResourceInsightIcon />
      </DemoRow>

      {HOVER_PARTICLE_DEMO_PRESETS.filter(
        (preset) =>
          preset.id !== "gold" &&
          preset.id !== "silver" &&
          preset.id !== "insight",
      ).map((preset) => (
        <DemoRow key={preset.id} label={preset.label}>
          <CoinHoverParticleSurface
            resource="gold"
            particleConfig={preset.getConfig()}
            className="inline-flex"
          >
            {hoverGlyphForPreset(preset)}
          </CoinHoverParticleSurface>
        </DemoRow>
      ))}
    </DemoSection>
  );
}
