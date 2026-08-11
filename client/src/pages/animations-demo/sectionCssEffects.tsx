import { useRef, useState } from "react";
import cn from "clsx";
import { Button } from "@/components/ui/button";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  LIME_ACCENT_MASK_ICON_CLASS,
  TAB_ICON_SIZE_CLASS,
} from "@/components/game/gameChrome";
import {
  handleDonateHeartAnimationEnd,
  triggerExclusivePromoPingOnce,
} from "@/lib/exclusivePromoShockwave";
import { CSS_EFFECT_DEMOS } from "@/pages/animations-demo/cssEffects";
import { DemoRow, DemoSection } from "@/pages/animations-demo/DemoSection";

function CssEffectSample({
  effectId,
  className,
  mode,
  sample,
}: {
  effectId: string;
  className: string;
  mode: "loop" | "replay" | "hover";
  sample: string;
}) {
  const [active, setActive] = useState(mode === "loop");

  const replay = () => {
    setActive(false);
    requestAnimationFrame(() => setActive(true));
  };

  const sampleEl = (
    <span
      key={active ? `${effectId}-on` : `${effectId}-off`}
      className={cn(
        "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border/50 px-2 text-xs",
        mode === "hover" || (mode !== "loop" && !active) ? "" : className,
        mode === "hover" ? className : null,
      )}
    >
      {sample}
    </span>
  );

  if (mode === "replay") {
    return (
      <DemoRow label={effectId}>
        {active ? sampleEl : (
          <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-border/50 px-2 text-xs text-muted-foreground">
            {sample}
          </span>
        )}
        <Button size="xs" variant="outline" onClick={replay}>
          Replay
        </Button>
      </DemoRow>
    );
  }

  return (
    <DemoRow label={effectId}>
      {sampleEl}
      {mode === "hover" ? (
        <span className="text-xs text-muted-foreground">Hover sample</span>
      ) : null}
    </DemoRow>
  );
}

export function CssEffectsSection() {
  const shockwaveRef = useRef<HTMLSpanElement>(null);
  const heartRef = useRef<HTMLSpanElement>(null);

  return (
    <DemoSection
      id="css-effects"
      title="CSS effect classes"
      description="Catalog from cssEffects.ts. Class names match index.css; prefer real components when one owns the effect."
    >
      <div className="space-y-2">
        {CSS_EFFECT_DEMOS.map((effect) => (
          <CssEffectSample
            key={effect.id}
            effectId={effect.label}
            className={effect.className}
            mode={effect.mode}
            sample={effect.sample ?? effect.label}
          />
        ))}
      </div>

      <DemoRow label="Shockwave ping">
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
          <span className="relative z-[1] text-lg text-lime-500">
            {"\u2B26"}
          </span>
        </button>
        <span className="text-xs text-muted-foreground">
          Real triggerExclusivePromoPingOnce
        </span>
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
            {"\u2665"}
          </span>
          <span className="text-xs text-muted-foreground">
            Real handleDonateHeartAnimationEnd
          </span>
        </button>
      </DemoRow>

      <DemoRow label="Trader active glow">
        <span className="group inline-flex">
          <GameUiIcon
            name="trader"
            sizeClassName={TAB_ICON_SIZE_CLASS}
            className={cn(
              "text-lime-500",
              LIME_ACCENT_MASK_ICON_CLASS,
              "lime-accent-mask-icon-active",
            )}
          />
        </span>
        <span className="text-xs text-muted-foreground">
          balance scale + lime-accent-mask-icon-active
        </span>
      </DemoRow>
    </DemoSection>
  );
}
