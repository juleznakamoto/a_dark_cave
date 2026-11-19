"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import {
  destroyedChromeMaskStyle,
  gameChromeTooltipClassName,
  useDestroyedChrome,
} from "@/components/game/gameChrome";
import {
  getTabVisibleEpoch,
  subscribeGameTabHidden,
} from "@/lib/tabVisibility";
import {
  TOOLTIP_GAP_PX,
  TOOLTIP_RULE_COLOR_CLASS,
  TOOLTIP_SHADOW_CLASS,
  TOOLTIP_SURFACE_CLASS,
  TOOLTIP_VIEWPORT_PAD_PX,
  tooltipFrameMaxWidth,
} from "@/game/tooltipMetrics";
import {
  applyFittedTooltipWidth,
  useTooltipShrinkWrap,
} from "@/game/tooltipShrinkWrap";
import {
  collisionPaddingClearOfSafeArea,
  useSafeAreaInsets,
} from "@/lib/safeAreaInsets";
import { cn } from "@/lib/utils";

const TooltipProvider = ({
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={150}
    skipDelayDuration={0}
    disableHoverableContent={true}
    {...props}
  >
    {children}
  </TooltipPrimitive.Provider>
);

const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>((props, ref) => {
  // Forced `open={false}` while the tab is hidden, then back to uncontrolled,
  // leaves Radix hover dead until a full remount (same trap as modal suppression).
  const hoverResetKey = React.useSyncExternalStore(
    subscribeGameTabHidden,
    getTabVisibleEpoch,
    () => 0,
  );
  return (
    <React.Fragment key={hoverResetKey}>
      <TooltipPrimitive.Root disableHoverableContent forceMount {...props} />
    </React.Fragment>
  );
});
Tooltip.displayName = "Tooltip";

const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Nowrap lines used to paint past this frame (the destroyed border is
 * overflow-visible). Those lines wrap, and long tokens can break, so a flex
 * row can shrink inside the shared maximum width.
 */
const TOOLTIP_FRAME_CLASS = `z-[10000] w-max rounded-md ${TOOLTIP_SURFACE_CLASS} px-2 pb-1 pt-1.5 ${TOOLTIP_SHADOW_CLASS} whitespace-normal [overflow-wrap:anywhere] [&_.whitespace-nowrap]:whitespace-normal`;

const TOOLTIP_MOTION_CLASS =
  "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]";

/**
 * Visual shell shared by live tips and the /dev/tooltips gallery.
 * Live tips add the motion classes on the Radix content.
 */
export function useTooltipFrame(
  className?: string,
  style?: React.CSSProperties,
) {
  const chromeSeed = React.useId();
  const destroyed = useDestroyedChrome();
  return {
    destroyed,
    className: cn(
      TOOLTIP_FRAME_CLASS,
      destroyed
        ? gameChromeTooltipClassName()
        : `overflow-hidden border ${TOOLTIP_RULE_COLOR_CLASS}`,
      className,
      TOOLTIP_SURFACE_CLASS,
    ),
    style: {
      pointerEvents: "none" as const,
      ...(destroyed ? destroyedChromeMaskStyle(chromeSeed) : {}),
      ...style,
      maxWidth: tooltipFrameMaxWidth(),
    },
  };
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = TOOLTIP_GAP_PX, collisionPadding = TOOLTIP_VIEWPORT_PAD_PX, style, ...props }, ref) => {
  const frame = useTooltipFrame(className, style);
  const safeArea = useSafeAreaInsets();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  useTooltipShrinkWrap(contentRef);
  const setContentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;
      // Fit before Radix places the tip. Its placement read happens in a
      // layout effect, after this ref, and it animates whatever size it found.
      if (node && node.offsetWidth > 0) applyFittedTooltipWidth(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={setContentRef}
        sideOffset={sideOffset}
        collisionPadding={collisionPaddingClearOfSafeArea(collisionPadding, safeArea)}
        style={frame.style}
        className={cn(frame.className, TOOLTIP_MOTION_CLASS)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
