import { GameHeaderControls } from "./ProfileMenu";

export default function GameHeader() {
  return (
    <header className="relative z-50 flex min-h-9 flex-shrink-0 items-center border-b border-border pl-4 pr-2 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="shrink-0 text-xs font-medium tracking-wide text-neutral-300">
          A Dark Cave
        </span>
        <GameHeaderControls />
      </div>
    </header>
  );
}
