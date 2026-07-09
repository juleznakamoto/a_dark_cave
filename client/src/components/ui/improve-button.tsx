import * as React from "react";
import { tWithFallback } from "@/i18n/resolveGameText";
import { Button } from "./button";

// Improve button with a brief red text flash on click
export function ImproveButton({
  onClick,
  disabled,
  button_id,
}: {
  onClick: () => void;
  disabled: boolean;
  button_id: string;
}) {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const improveLabelRaw = tWithFallback("ui", "estate.improve", "Improve");
  const improveLabel =
    improveLabelRaw === "estate.improve" ? "Improve" : improveLabelRaw;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    setIsPulsing(true);
    onClick();
  };

  return (
    <div className="inline-block text-xs font-medium text-foreground">
      <div className="relative inline-block">
        <Button
          onClick={handleClick}
          disabled={disabled}
          size="xs"
          variant="outline"
          className={`h-5 px-2 bg-red-950/30 hover:bg-red-950/70 hover:text-foreground relative overflow-visible border border-border border-red-800/50 rounded-xl ${isPulsing ? "improve-text-flash" : ""}`}
          button_id={button_id}
          onAnimationEnd={() => setIsPulsing(false)}
        >
          {improveLabel}
        </Button>
      </div>
    </div>
  );
}
