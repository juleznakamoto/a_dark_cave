import { useState } from "react";
import { motion } from "motion/react";
import "./motion-layout-animation-utils/index.css";

type LayoutAnimationProps = {
  /** When set, the switch follows the caller instead of its own state. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  "data-testid"?: string;
};

export function LayoutAnimation({
  checked,
  onCheckedChange,
  disabled = false,
  "aria-label": ariaLabel,
  "data-testid": testId,
}: LayoutAnimationProps = {}) {
  const [uncontrolledOn, setUncontrolledOn] = useState(false);
  const isOn = checked ?? uncontrolledOn;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={ariaLabel}
      data-testid={testId}
      disabled={disabled}
      data-state={isOn ? "on" : "off"}
      className="layout-toggle"
      style={{ justifyContent: `flex-${isOn ? "end" : "start"}` }}
      onClick={() => {
        const next = !isOn;
        onCheckedChange?.(next);
        if (checked === undefined) setUncontrolledOn(next);
      }}
    >
      <motion.div
        className="layout-toggle__handle"
        layout
        transition={{ type: "spring", visualDuration: 0.2, bounce: 0.2 }}
      />
    </button>
  );
}

export default LayoutAnimation;
