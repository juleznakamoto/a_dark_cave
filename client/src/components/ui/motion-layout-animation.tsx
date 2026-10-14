import { type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import "./motion-layout-animation-utils/index.css";

type LayoutAnimationProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
};

/** Spring layout switch. `checked` comes from the caller so game state stays in sync. */
export function LayoutAnimation({
  checked,
  onCheckedChange,
  disabled = false,
  children,
  className,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: LayoutAnimationProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex items-center gap-2 bg-transparent p-0 text-xs select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      )}
    >
      {children ? (
        <span className="inline-flex items-center gap-1">{children}</span>
      ) : null}
      <span
        className="layout-toggle"
        data-state={checked ? "on" : "off"}
        style={{ justifyContent: checked ? "flex-end" : "flex-start" }}
      >
        <motion.div
          className="layout-toggle__handle"
          layout
          transition={{ type: "spring", visualDuration: 0.2, bounce: 0.2 }}
        />
      </span>
    </button>
  );
}

export default LayoutAnimation;
