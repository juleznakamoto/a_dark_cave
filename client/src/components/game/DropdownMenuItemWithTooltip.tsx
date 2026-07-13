import React from "react";
import { useGlobalTooltip } from "@/hooks/useGlobalTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type EventHandler<E> = (e: E) => void;

function mergeHandlers<E>(
  a?: EventHandler<E>,
  b?: EventHandler<E>
): EventHandler<E> | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return (e: E) => {
    a(e);
    b(e);
  };
}

export interface DropdownMenuItemWithTooltipProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof DropdownMenuItem>,
    "disabled"
  > {
  tooltip: React.ReactNode;
  tooltipId: string;
  disabled?: boolean;
  onTooltipAction?: () => void;
  tooltipContentClassName?: string;
}

/**
 * DropdownMenuItem with tooltip support that preserves the correct DOM structure.
 * Uses TooltipTrigger asChild so DropdownMenuItem is the direct trigger (no wrapper div).
 *
 * Uses the centralized tooltip system (useGlobalTooltip) for:
 * - Single-tooltip-at-a-time global state
 * - Hold-to-show (250–300ms) on all devices
 * - Tap-to-show when disabled on mobile
 * - Desktop hover tooltips when inactive (aria-disabled, not native disabled — Radix
 *   sets pointer-events-none on disabled items, which blocks hover)
 * Cannot use TooltipWrapper here because its wrapper div breaks Radix DropdownMenu.
 */
export function DropdownMenuItemWithTooltip({
  tooltip,
  tooltipId,
  disabled = false,
  onTooltipAction,
  tooltipContentClassName,
  className,
  onMouseDown,
  onMouseUp,
  onTouchStart,
  onTouchEnd,
  onClick,
  onSelect,
  ...props
}: DropdownMenuItemWithTooltipProps) {
  const globalTooltip = useGlobalTooltip();

  const wrappedAction = React.useCallback(() => {
    onTooltipAction?.();
  }, [onTooltipAction]);

  const blockWhenDisabled = React.useCallback(
    (e: { preventDefault: () => void; stopPropagation?: () => void }) => {
      if (!disabled) return false;
      e.preventDefault();
      e.stopPropagation?.();
      return true;
    },
    [disabled],
  );

  return (
    <TooltipProvider>
      <Tooltip
        open={globalTooltip.isTooltipOpen(tooltipId)}
        delayDuration={300}
      >
        <TooltipTrigger asChild>
          <DropdownMenuItem
            data-tooltip-trigger-id={tooltipId}
            style={{ touchAction: "manipulation" }}
            aria-disabled={disabled || undefined}
            className={cn(
              disabled && "opacity-50 cursor-default",
              className,
            )}
            onSelect={(e) => {
              if (disabled) {
                e.preventDefault();
                return;
              }
              onSelect?.(e);
            }}
            onMouseDown={mergeHandlers(
              (e) =>
                globalTooltip.handleMouseDown(tooltipId, disabled, false, e),
              onMouseDown
            )}
            onMouseUp={mergeHandlers(
              (e) =>
                globalTooltip.handleMouseUp(
                  tooltipId,
                  disabled,
                  wrappedAction,
                  e
                ),
              onMouseUp
            )}
            onTouchStart={mergeHandlers(
              (e) =>
                globalTooltip.handleTouchStart(tooltipId, disabled, false, e),
              onTouchStart
            )}
            onTouchEnd={mergeHandlers(
              (e) =>
                globalTooltip.handleTouchEnd(
                  tooltipId,
                  disabled,
                  wrappedAction,
                  e
                ),
              onTouchEnd
            )}
            onClick={mergeHandlers(
              (e) => {
                if (blockWhenDisabled(e)) return;
                globalTooltip.handleWrapperClick(tooltipId, disabled, false, e);
              },
              (e) => {
                if (disabled) return;
                onClick?.(e);
              },
            )}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent className={tooltipContentClassName}>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
