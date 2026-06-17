import { cn } from "@/lib/utils";

/** Muted 🛈 shown after tooltip labels; parent trigger should include `group`. */
export function TooltipInfoIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-noto-symbols-2 inline-flex h-[1em] shrink-0 items-center justify-center text-[10px] font-normal leading-none text-muted-foreground transition-colors group-hover:text-foreground",
        className,
      )}
      aria-hidden
    >
      🛈
    </span>
  );
}
