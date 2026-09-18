import { cn } from "@/lib/utils";
import {
  destroyedChromeTinyMaskStyle,
  GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
  gameChromeSlotClassName,
  useDestroyedChrome,
} from "@/components/game/gameChrome";
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
  const destroyed = useDestroyedChrome();
  return (
    <span
      data-testid={testId}
      style={
        destroyed
          ? destroyedChromeTinyMaskStyle(testId ?? kind)
          : undefined
      }
      className={cn(
        GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
        "relative inline-flex items-center justify-center rounded-md box-border",
        destroyed ? gameChromeSlotClassName() : "border border-neutral-400/50",
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
