import { cn } from "@/lib/utils";
import { GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS } from "@/components/game/gameChrome";
import { GlowingShadow } from "@/components/ui/glowing-shadow";

export type ConstructionQueueSlotKind = "free" | "used" | "locked" | "plus";

const SLOT_GLYPH_CLASS =
  "font-noto-symbols-2 text-[12px] translate-y-[2px] font-extrabold leading-none text-muted-foreground/45 select-none";

/**
 * Village Build header queue mark.
 * Used slots reuse the share-card spinning rim in red, without hover.
 */
export function ConstructionQueueSlot({
  kind,
  testId,
  className,
}: {
  kind: ConstructionQueueSlotKind;
  testId?: string;
  className?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
        "relative inline-flex items-center justify-center rounded-md border border-neutral-400/50 box-border",
        kind === "locked" && "opacity-70",
        className,
      )}
    >
      {kind === "plus" ? (
        <span aria-hidden className={SLOT_GLYPH_CLASS}>
          +
        </span>
      ) : kind === "locked" ? (
        <span aria-hidden className={SLOT_GLYPH_CLASS}>
          ×
        </span>
      ) : kind === "used" ? (
        <span aria-hidden className="absolute inset-[2px] rounded-[1px]">
          <GlowingShadow variant="red" size="slot" interactive={false} />
        </span>
      ) : null}
    </span>
  );
}
