import cn from "clsx";

/** Grunge UI icons in `client/public/icons/` (white SVG masks from Pixarts bundle). */
export const GAME_UI_ICON_SRC = {
  settings: "/icons/settings_gear.svg",
  deleteAccount: "/icons/trash_can.svg",
  signOut: "/icons/exit_door.svg",
  saveGame: "/icons/save_game.svg",
  newGame: "/icons/refresh_arrows.svg",
  leaderboard: "/icons/award_star.svg",
  unpause: "/icons/play_button.svg",
  pause: "/icons/pause_button.svg",
  achievements: "/icons/quest_book.svg",
  timedEvent: "/icons/time_hourglass.svg",
  language: "/icons/language_bubble.svg",
  textSize: "/icons/zoom_magnifier.svg",
  email: "/icons/grungy_mail.svg",
  share: "/icons/speech_bubble.svg",
  inviteUser: "/icons/add_user.svg",
  socialReward: "/icons/cut_diamond.svg",
  exclusiveReward: "/icons/diamond_ring.svg",
} as const;

export type GameUiIconName = keyof typeof GAME_UI_ICON_SRC;

const DEFAULT_CLASS =
  "inline-block shrink-0 bg-current opacity-90 [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]";

export function GameUiIcon({
  name,
  className,
  sizeClassName = "w-3.5 h-3.5",
}: {
  name: GameUiIconName;
  className?: string;
  /** Tailwind size utilities, e.g. `w-5 h-5`. */
  sizeClassName?: string;
}) {
  const src = GAME_UI_ICON_SRC[name];
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
