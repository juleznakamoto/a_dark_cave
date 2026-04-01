import React, { createContext, useContext, useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

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
}

const RadioGroupItem = ({
  value,
  children,
  disabled: itemDisabled,
}: RadioGroupItemProps) => {
  const context = useContext(RadioGroupContext);
  const isSelected = context?.value === value;
  const disabled = Boolean(context?.disabled || itemDisabled);

  return (
    <label
      className={cn(
        "flex items-start gap-2.5 cursor-pointer font-sans text-[13px] text-gray-1000 leading-snug group",
        disabled && "cursor-not-allowed text-gray-500",
      )}
    >
      <input
        type="radio"
        className="absolute w-4 h-4 opacity-0"
        checked={!!isSelected}
        onChange={(event) => context?.onChange(event.target.value)}
        disabled={disabled}
        required={context?.required}
        name={context?.name}
        value={value}
      />
      <span
        className={cn(
          "mt-0.5 shrink-0 w-4 h-4 bg-background-100 relative border rounded-full duration-200 after:duration-200 flex items-center justify-center after:absolute after:top-1/2 after:left-1/2 after:-translate-y-1/2 after:-translate-x-1/2 after:rounded-full after:bg-gray-1000",
          isSelected && "border-gray-1000 after:w-2 after:h-2",
          !isSelected && "border-gray-700 after:w-0 after:h-0",
          !isSelected &&
          !disabled &&
          "group-hover:bg-gray-200 group-hover:border-gray-900",
          disabled && "after:bg-gray-500 border-gray-500",
        )}
        aria-hidden="true"
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
    >
      <input
        type="radio"
        className="absolute w-4 h-4 opacity-0"
        checked={isChecked}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        value={value}
      />
      <span
        className={cn(
          "w-4 h-4 bg-background-100 relative border rounded-full duration-200 after:duration-200 flex items-center justify-center after:absolute after:top-1/2 after:left-1/2 after:-translate-y-1/2 after:-translate-x-1/2 after:rounded-full after:bg-gray-1000",
          isChecked && "border-gray-1000 after:w-2 after:h-2",
          !isChecked && "border-gray-700 after:w-0 after:h-0",
          !isChecked &&
          !disabled &&
          "group-hover:bg-gray-200 group-hover:border-gray-900",
          disabled && "after:bg-gray-500 border-gray-500",
        )}
        aria-hidden="true"
      />
    </label>
  );
};
