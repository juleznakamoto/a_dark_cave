import cn from "clsx";
import type { SidePanelSectionId } from "./SidePanelSection";

/** White SVG masks in `client/public/icons/side-panel/`. */
const SIDE_PANEL_SECTION_ICON_SRC: Partial<
  Record<SidePanelSectionId, string>
> = {
  resources: "/icons/side-panel/large_stone.svg",
  tools: "/icons/side-panel/sledge_hammer.svg",
  weapons: "/icons/side-panel/long_sword.svg",
  bastion: "/icons/side-panel/crossed_swords.svg",
  fortifications: "/icons/side-panel/wooden_shield_4.svg",
  combatItems: "/icons/side-panel/game_backpack.svg",
  clothing: "/icons/side-panel/ragged_tunic.svg",
  relics: "/icons/side-panel/ornate_goblet.svg",
  schematics: "/icons/side-panel/ancient_scroll_2.svg",
  blessings: "/icons/side-panel/cracked_eye.svg",
  buildings: "/icons/side-panel/log_cabin.svg",
  stats: "/icons/side-panel/barbed_crown.svg",
  bonuses: "/icons/side-panel/precision_boost.svg",
  books: "/icons/side-panel/quest_book.svg",
  fellowship: "/icons/side-panel/user_group.svg",
};

const DEFAULT_CLASS =
  "inline-block shrink-0 bg-current opacity-90 [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]";

export function SidePanelSectionIcon({
  sectionId,
  className,
  sizeClassName = "w-3.5 h-3.5",
}: {
  sectionId: SidePanelSectionId;
  className?: string;
  sizeClassName?: string;
}) {
  const src = SIDE_PANEL_SECTION_ICON_SRC[sectionId];
  if (!src) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(DEFAULT_CLASS, sizeClassName, className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
    />
  );
}
