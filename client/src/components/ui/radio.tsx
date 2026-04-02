import React, { createContext, useContext, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPriorDiscFillMetrics,
  getPriorDiscInnerFillStyle,
  getPriorDiscSurfaceColors,
  PRIOR_DISC_OUTER_TRANSITION,
} from "@/lib/priorDiscStyles";

export const DEFAULT_RADIO_INDICATOR_PX = 16;

function PriorStyleRadioIndicator({
  isSelected,
  disabled,
  hovered,
  diameterPx,
}: {
  isSelected: boolean;
  disabled: boolean;
  hovered: boolean;
  diameterPx: number;
}) {
  const { fillSize, fillOffsetInPx, fillOffsetOutPx } =
    getPriorDiscFillMetrics(diameterPx);
  const { background, boxShadow } = getPriorDiscSurfaceColors({
    active: isSelected,
    surfaceLocked: disabled,
    hovered,
  });

  /* Shadow on outer shell only; inner uses overflow-hidden to clip the diagonal fill
     without clipping the ring shadow (same element + overflow-hidden cuts box-shadow). */
  return (
    <span
      className="relative shrink-0 inline-block rounded-full"
      style={{
        width: diameterPx,
        height: diameterPx,
        background,
        boxShadow,
        transition: PRIOR_DISC_OUTER_TRANSITION,
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        <span
          style={getPriorDiscInnerFillStyle({
            active: isSelected,
            fillSize,
            fillOffsetInPx,
            fillOffsetOutPx,
            mutedFill: disabled && isSelected,
          })}
        />
      </span>
    </span>
  );
}

const RadioGroupContext = createContext<{
  value: string | undefined | null;
  onChange: (value: string) => void;
  disabled: boolean;
  required: boolean;
  name: string;
  indicatorSizePx: number;
} | null>(null);

interface RadioGroupProps {
  label?: string;
  value: string | undefined | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Prior-style disc diameter in px (default 16). */
  indicatorSizePx?: number;
  children?: React.ReactNode;
}

export const RadioGroup = ({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  indicatorSizePx = DEFAULT_RADIO_INDICATOR_PX,
  children,
}: RadioGroupProps) => {
  const name = useId();
  return (
    <RadioGroupContext.Provider
      value={{
        value,
        onChange,
        disabled,
        required,
        name,
        indicatorSizePx,
      }}
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

const RadioGroupItem = React.forwardRef<HTMLLabelElement, RadioGroupItemProps>(
  function RadioGroupItem(
    {
      value,
      children,
      disabled: itemDisabled,
      disabledCursor = "not-allowed",
    },
    ref,
  ) {
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
      ref={ref}
      className={cn(
        "flex items-center gap-2.5 font-sans text-[13px] text-gray-1000 leading-snug group",
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
        diameterPx={context?.indicatorSizePx ?? DEFAULT_RADIO_INDICATOR_PX}
      />
      {children}
    </label>
  );
  },
);

RadioGroup.Item = RadioGroupItem;

interface RadioProps {
  disabled?: boolean;
  required?: boolean;
  checked?: boolean;
  onChange?: (value: string) => void;
  value?: string;
  /** Prior-style disc diameter in px (default 16). */
  indicatorSizePx?: number;
}

export const Radio = ({
  disabled,
  checked,
  required,
  onChange,
  value,
  indicatorSizePx = DEFAULT_RADIO_INDICATOR_PX,
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
        "flex items-center gap-2 cursor-pointer font-sans text-[13px] leading-snug group",
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
        diameterPx={indicatorSizePx}
      />
    </label>
  );
};
