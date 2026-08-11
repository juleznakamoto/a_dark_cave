import cn from "clsx";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
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
  LIME_ACCENT_MASK_ICON_CLASS,
  TAB_ICON_SIZE_CLASS,
} from "@/components/game/gameChrome";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

const REWARDS_GLYPH = "\u2B26";

function hoverGlyphForPreset(preset: HoverParticleDemoPreset): React.ReactNode {
  switch (preset.id) {
    case "traderTab":
      return (
        <span className="group inline-flex cursor-default">
          <GameUiIcon
            name="trader"
            sizeClassName={TAB_ICON_SIZE_CLASS}
            className={cn("text-lime-500", LIME_ACCENT_MASK_ICON_CLASS)}
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
