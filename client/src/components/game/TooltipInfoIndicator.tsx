import { cn } from "@/lib/utils";

/** Muted 🛈 shown after tooltip labels; parent trigger should include `group`. */
export function TooltipInfoIndicator({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-noto-symbols-2 inline-block shrink-0 translate-y-0.5 align-text-bottom text-[10px] font-normal leading-none text-muted-foreground transition-colors group-hover:text-foreground",
        className,
      )}
      aria-hidden
    >
      🛈
    </span>
  );
}
