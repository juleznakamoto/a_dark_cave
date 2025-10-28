
"use client";

import { MotionValue, motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

const fontSize = 14;
const padding = 4;
const height = fontSize + padding;

export function AnimatedCounter({ value }: { value: number }) {
  // Determine how many digits we need
  const digitCount = value === 0 ? 1 : Math.floor(Math.log10(Math.abs(value))) + 1;
  
  // Generate digit places dynamically
  const digits = [];
  for (let i = digitCount - 1; i >= 0; i--) {
    digits.push(Math.pow(10, i));
  }

  return (
    <div
      style={{ fontSize }}
      className="flex overflow-hidden leading-none tabular-nums"
    >
      {digits.map((place) => (
        <Digit key={place} place={place} value={value} />
      ))}
    </div>
  );
}

function Digit({ place, value }: { place: number; value: number }) {
  let valueRoundedToPlace = Math.floor(value / place);
  let animatedValue = useSpring(valueRoundedToPlace);

  useEffect(() => {
    animatedValue.set(valueRoundedToPlace);
  }, [animatedValue, valueRoundedToPlace]);

  return (
    <div style={{ height }} className="relative w-[1ch]">
      {[...Array(10).keys()].map((i) => (
        <Number key={i} mv={animatedValue} number={i} />
      ))}
    </div>
  );
}

function Number({ mv, number }: { mv: MotionValue; number: number }) {
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
      className="absolute inset-0 flex items-center justify-center"
    >
      {number}
    </motion.span>
  );
}
