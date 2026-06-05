import { GameHeaderControls } from "./ProfileMenu";

export default function GameHeader() {
  return (
    <header className="relative z-50 flex-shrink-0 border-b border-border px-2 py-2 text-xs text-muted-foreground pointer-events-auto overflow-visible">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-xs font-medium tracking-wide text-neutral-300">
          A Dark Cave
        </span>
        <GameHeaderControls />
      </div>
    </header>
  );
}
