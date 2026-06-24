
"use client";

import { MotionValue, motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TEXT_SCALE_CHANGE_EVENT } from "@/lib/textScale";

/** Digit column height in px — derived from root rem × scale for scroll animation. */
export function getAnimatedCounterHeightPx(): number {
  if (typeof document === "undefined") return 18;
  const root = document.documentElement;
  const rootPx = parseFloat(getComputedStyle(root).fontSize) || 16;
  const scale =
    parseFloat(getComputedStyle(root).getPropertyValue("--adc-text-scale")) || 1;
  return rootPx * 1.125 * scale;
}

export const ANIMATED_COUNTER_TEXT_CLASS = "adc-counter-text tabular-nums";

function useAnimatedCounterHeight(): number {
  const [height, setHeight] = useState(() => getAnimatedCounterHeightPx());

  useEffect(() => {
    const update = () => setHeight(getAnimatedCounterHeightPx());
    update();
    window.addEventListener(TEXT_SCALE_CHANGE_EVENT, update);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener(TEXT_SCALE_CHANGE_EVENT, update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return height;
}

export function AnimatedCounter({
  value,
  suffix,
  className,
  align = "center",
}: {
  value: number;
  suffix?: string;
  className?: string;
  align?: "center" | "end";
}) {
  const height = useAnimatedCounterHeight();

  // Determine how many digits we need
  const digitCount = value === 0 ? 1 : Math.floor(Math.log10(Math.abs(value))) + 1;

  // Generate digit places dynamically
  const digits = [];
  for (let i = digitCount - 1; i >= 0; i--) {
    digits.push(Math.pow(10, i));
  }

  return (
    <div
      translate="no"
      className={cn(
        "notranslate flex",
        align === "end" ? "items-end" : "items-center",
        ANIMATED_COUNTER_TEXT_CLASS,
        className,
      )}
    >
      <div className={cn("flex overflow-hidden", ANIMATED_COUNTER_TEXT_CLASS)}>
        {digits.map((place) => (
          <Digit key={place} place={place} value={value} height={height} align={align} />
        ))}
      </div>
      {suffix != null && (
        <span className={cn("inline-block", ANIMATED_COUNTER_TEXT_CLASS)}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function Digit({
  place,
  value,
  height,
  align,
}: {
  place: number;
  value: number;
  height: number;
  align: "center" | "end";
}) {
  let valueRoundedToPlace = Math.floor(value / place);
  let animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div style={{ height }} className="relative w-[1ch]">
      {[...Array(10).keys()].map((i) => (
        <Number key={i} mv={animatedValue} number={i} height={height} align={align} />
      ))}
    </div>
  );
}

function Number({
  mv,
  number,
  height,
  align,
}: {
  mv: MotionValue;
  number: number;
  height: number;
  align: "center" | "end";
}) {
  let y = useTransform(mv, (latest) => {
    let placeValue = latest % 10;
    let offset = (10 + number - placeValue) % 10;
    let memo = offset * height;
    if (offset > 5) {
      memo -= 10 * height;
    }
    return memo;
  });

  return (
    <motion.span
      style={{ y }}
      className={cn(
        "absolute inset-0 flex justify-center",
        align === "end" ? "items-end" : "items-center",
      )}
    >
      {number}
    </motion.span>
  );
}
