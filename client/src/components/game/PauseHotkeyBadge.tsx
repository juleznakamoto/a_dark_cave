/** Small key hint shown on controls while the game is manually paused. */
export function PauseHotkeyBadge({
  label,
  show,
}: {
  label: string;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <span
      className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full animate-none bg-background/90 px-1 py-px font-mono text-[11px] leading-none text-foreground tabular-nums"
      aria-hidden
    >
      {label}
    </span>
  );
}
