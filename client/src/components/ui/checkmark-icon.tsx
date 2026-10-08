import { cn } from "@/lib/utils";

/**
 * Rounded check from the shared mark. Stroke proportions match that graphic
 * (about 2px on a 24px box, round caps). Color follows currentColor.
 */
export function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block h-[1em] w-[1em] shrink-0 -translate-y-px", className)}
    >
      <path d="M18.7 8.1 9.4 17.3 5.1 12.9" />
    </svg>
  );
}
