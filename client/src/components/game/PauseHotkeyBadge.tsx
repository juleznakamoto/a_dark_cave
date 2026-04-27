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
      className="pointer-events-none absolute -right-1 -top-1 z-10 rounded border border-primary/40 bg-background/95 px-1 py-px font-mono text-[9px] leading-none text-foreground shadow-sm tabular-nums"
      aria-hidden
    >
      {label}
    </span>
  );
}
