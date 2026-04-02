import React, { createContext, useContext, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPriorDiscFillMetrics,
  getPriorDiscInnerFillStyle,
  getPriorDiscSurfaceColors,
  PRIOR_DISC_OUTER_TRANSITION,
} from "@/lib/priorDiscStyles";

const PRIOR_RADIO_PX = 16;
const radioFillMetrics = getPriorDiscFillMetrics(PRIOR_RADIO_PX);

function PriorStyleRadioIndicator({
  isSelected,
  disabled,
  hovered,
}: {
  isSelected: boolean;
  disabled: boolean;
  hovered: boolean;
}) {
  const { background, boxShadow } = getPriorDiscSurfaceColors({
    active: isSelected,
    surfaceLocked: disabled,
    hovered,
  });

  return (
    <span
      className="relative mt-0.5 shrink-0 inline-block rounded-full overflow-hidden"
      style={{
        width: PRIOR_RADIO_PX,
        height: PRIOR_RADIO_PX,
        background,
        boxShadow,
        transition: PRIOR_DISC_OUTER_TRANSITION,
      }}
      aria-hidden="true"
    >
      <span
        style={getPriorDiscInnerFillStyle({
          active: isSelected,
          fillSize: radioFillMetrics.fillSize,
          fillOffsetInPx: radioFillMetrics.fillOffsetInPx,
          fillOffsetOutPx: radioFillMetrics.fillOffsetOutPx,
          mutedFill: disabled && isSelected,
        })}
      />
    </span>
  );
}

const RadioGroupContext = createContext<{
  value: string | undefined | null;
  onChange: (value: string) => void;
  disabled: boolean;
  required: boolean;
  name: string;
} | null>(null);

interface RadioGroupProps {
  label?: string;
  value: string | undefined | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  children?: React.ReactNode;
}

export const RadioGroup = ({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  children,
}: RadioGroupProps) => {
  const name = useId();
  return (
    <RadioGroupContext.Provider
      value={{ value, onChange, disabled, required, name }}
    >
      {label && <span className="sr-only">{label}</span>}
      {children}
    </RadioGroupContext.Provider>
  );
};

interface RadioGroupItemProps {
  value?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  /** When disabled: default `not-allowed` (prohibited cursor). Use `help` for tooltip-style hints without the blocked cursor. */
  disabledCursor?: "not-allowed" | "help" | "default";
}

const RadioGroupItem = ({
  value,
  children,
  disabled: itemDisabled,
  disabledCursor = "not-allowed",
}: RadioGroupItemProps) => {
  const context = useContext(RadioGroupContext);
  const isSelected = context?.value === value;
  const disabled = Boolean(context?.disabled || itemDisabled);
  const [hovered, setHovered] = useState(false);

  const disabledCursorClass =
    disabled &&
    (disabledCursor === "help"
      ? "cursor-help"
      : disabledCursor === "default"
        ? "cursor-default"
        : "cursor-not-allowed");

  return (
    <label
      className={cn(
        "flex items-start gap-2.5 font-sans text-[13px] text-gray-1000 leading-snug group",
        disabled ? cn("text-gray-500", disabledCursorClass) : "cursor-pointer",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="radio"
        className="sr-only"
        checked={!!isSelected}
        onChange={(event) => context?.onChange(event.target.value)}
        disabled={disabled}
        required={context?.required}
        name={context?.name}
        value={value}
      />
      <PriorStyleRadioIndicator
        isSelected={!!isSelected}
        disabled={disabled}
        hovered={hovered}
      />
      {children}
    </label>
  );
};

RadioGroup.Item = RadioGroupItem;

interface RadioProps {
  disabled?: boolean;
  required?: boolean;
  checked?: boolean;
  onChange?: (value: string) => void;
  value?: string;
}

export const Radio = ({
  disabled,
  checked,
  required,
  onChange,
  value,
}: RadioProps) => {
  const [internalChecked, setInternalChecked] = useState<boolean>(
    checked ?? false,
  );
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (typeof checked === "boolean") {
      setInternalChecked(checked);
    }
  }, [checked]);

  const isChecked = typeof checked === "boolean" ? checked : internalChecked;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof checked !== "boolean") {
      setInternalChecked(event.target.checked);
    }
    onChange?.(event.target.value);
  };

  return (
    <label
      className={cn(
        "flex items-center gap-2 cursor-pointer font-sans text-[13px] leading-3 group",
        disabled && "cursor-not-allowed",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <input
        type="radio"
        className="sr-only"
        checked={isChecked}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        value={value}
      />
      <PriorStyleRadioIndicator
        isSelected={isChecked}
        disabled={!!disabled}
        hovered={hovered}
      />
    </label>
  );
};
