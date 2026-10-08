import { cn } from "@/lib/utils";

/**
 * Rounded X from the shared mark. Stroke proportions match that graphic
 * (about 1.6px on a 24px box, round caps). Color follows currentColor.
 */
export function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={cn(
        "inline-block h-[1em] w-[1em] shrink-0",
        className,
      )}
    >
      <path d="M7 7 17 17" />
      <path d="M17 7 7 17" />
    </svg>
  );
}
