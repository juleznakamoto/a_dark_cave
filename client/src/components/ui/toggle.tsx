import * as React from "react";
import { cn } from "@/lib/utils";

const colors = {
  blue: {
    backgroundColor: "bg-blue-700",
    fill: "fill-blue-1000 dark:fill-blue-100",
  },
  red: {
    backgroundColor: "bg-red-600",
    fill: "fill-red-1000 dark:fill-red-100",
  },
  amber: {
    backgroundColor: "bg-amber-700",
    fill: "fill-amber-1000 dark:fill-amber-100",
  },
  green: {
    backgroundColor: "bg-[oklch(64.58%_0.1746_147.27)]",
    fill: "fill-green-1000 dark:fill-green-100",
  },
  teal: {
    backgroundColor: "bg-teal-700",
    fill: "fill-teal-1000 dark:fill-teal-100",
  },
  purple: {
    backgroundColor: "bg-purple-700",
    fill: "fill-purple-1000 dark:fill-purple-100",
  },
  pink: {
    backgroundColor: "bg-pink-700",
    fill: "fill-pink-1000 dark:fill-pink-100",
  },
  gray: {
    backgroundColor: "bg-gray-700",
    fill: "fill-gray-1000 dark:fill-gray-100",
  },
};

type TToggleColor = keyof typeof colors;

interface ToggleProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  checked: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  size?: "small" | "large";
  color?: TToggleColor;
  icon?: {
    checked: React.ReactNode;
    unchecked: React.ReactNode;
  };
  direction?: "switch-first" | "label-first";
}

const getClasses = (
  checked: boolean,
  disabled: boolean,
  size: "small" | "large",
  color?: TToggleColor,
) => {
  let toggle = "rounded-[14px] inline-block relative duration-150";
  let thumb =
    "rounded-[50%] border border-transparent absolute top-1/2 -translate-y-1/2 shadow-toggle duration-150 flex items-center justify-center";

  if (size === "small") {
    toggle += " h-3.5 w-7";
    thumb += " h-3 w-3";
  } else {
    toggle += " h-6 w-10";
    thumb += " h-[22px] w-[22px]";
  }

  if (checked) {
    thumb += size === "small" ? " left-3.5" : " left-4";
    if (disabled) {
      toggle += " bg-accents-1 border border-accents-2 cursor-not-allowed";
      thumb += " bg-gray-200";
    } else {
      // Active track uses the chosen color. Green is the brighter toggle green.
      toggle += ` ${
        color
          ? `${colors[color].backgroundColor} ${colors[color].fill}`
          : "bg-green-700 fill-gray-900 dark:fill-background-100"
      } border border-gray-alpha-400 cursor-pointer`;
      thumb += " bg-gray-100 dark:bg-gray-1000";
    }
  } else if (disabled) {
    toggle += " bg-background-100 border border-gray-alpha-400 cursor-not-allowed";
    thumb += " bg-gray-200 left-0";
  } else {
    toggle +=
      " bg-gray-700 border border-gray-alpha-400 cursor-pointer";
    thumb += " bg-gray-200 dark:bg-gray-1000 left-0";
  }

  return { toggle, thumb };
};

export const Toggle = ({
  checked,
  onChange,
  disabled = false,
  size = "small",
  color,
  icon,
  direction = "label-first",
  children,
  className,
  ...rest
}: ToggleProps) => {
  const classes = getClasses(checked, disabled, size, color);

  return (
    <label
      className={cn(
        "relative inline-flex items-center gap-2 py-[3px] text-xs text-secondary select-none",
        direction === "switch-first" && "flex-row-reverse",
        !disabled && "cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children ? (
        <span className="inline-flex items-center gap-1">{children}</span>
      ) : null}
      <input
        className="absolute h-0 w-0 appearance-none"
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className={classes.toggle}>
        <span className={classes.thumb}>
          {icon && checked ? icon.checked : null}
          {icon && !checked ? icon.unchecked : null}
        </span>
      </span>
    </label>
  );
};
