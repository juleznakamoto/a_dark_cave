import * as React from "react";
import { Button } from "./button";

// Improve button with a rewarding red pulse animation on click
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

  const handleClick = () => {
    if (disabled) return;
    setIsPulsing(true);
    onClick();
  };

  return (
    <div className="h-5 inline-block pb-1 text-xs font-medium text-foreground">
      <Button
        onClick={handleClick}
        disabled={disabled}
        size="xs"
        variant="ghost"
        className={`h-5 pb-1 hover:bg-transparent hover:text-foreground ${isPulsing ? "improve-pulse-active" : ""}`}
        button_id={button_id}
        onAnimationEnd={() => setIsPulsing(false)}
      >
        Improve
      </Button>
    </div>
  );
}
