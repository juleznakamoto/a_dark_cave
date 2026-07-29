import * as React from "react";
import { tWithFallback } from "@/i18n/resolveGameText";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// Improve button with a brief red text flash on click
export function ImproveButton({
  onClick,
  disabled,
  button_id,
  onUnaffordableClick,
}: {
  onClick: () => void;
  disabled: boolean;
  button_id: string;
  /** When unaffordable, click runs this instead (e.g. open gold shop). */
  onUnaffordableClick?: () => void;
}) {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const improveLabelRaw = tWithFallback("ui", "estate.improve", "Improve");
  const improveLabel =
    improveLabelRaw === "estate.improve" ? "Improve" : improveLabelRaw;
  const allowUnaffordableClick = disabled && !!onUnaffordableClick;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) {
      onUnaffordableClick?.();
      return;
    }
    setIsPulsing(true);
    onClick();
  };

  return (
    <div className="inline-block text-xs font-medium text-foreground">
      <div className="relative inline-block">
        <Button
          onClick={handleClick}
          disabled={disabled && !allowUnaffordableClick}
          aria-disabled={disabled || undefined}
          size="xs"
          variant="outline"
          className={cn(
            "h-5 px-2 bg-red-950/30 hover:bg-red-950/70 hover:text-foreground relative overflow-visible border border-border border-red-800/50 rounded-xl",
            isPulsing && "improve-text-flash",
            allowUnaffordableClick && "opacity-50",
          )}
          button_id={button_id}
          onAnimationEnd={() => setIsPulsing(false)}
        >
          {improveLabel}
        </Button>
      </div>
    </div>
  );
}
