"use client";

import { cn } from "@/lib/utils";
import { GAME_ACTION_BUTTON_STACK_CLASS } from "@/components/CooldownButton";

/** Groups an action button with optional badges in one in-flow slot. */
export function ActionButtonSlot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(GAME_ACTION_BUTTON_STACK_CLASS, className)}>{children}</div>
  );
}
