import cn from "clsx";

/** Grunge UI icons in `client/public/icons/` (white-on-black PNG masks). */
export const GAME_UI_ICON_SRC = {
  settings: "/icons/settings_gear.png",
  deleteAccount: "/icons/trash_can.png",
  signOut: "/icons/exit_door.png",
  saveGame: "/icons/save_game.png",
  newGame: "/icons/refresh_arrows.png",
  leaderboard: "/icons/award_star.png",
  unpause: "/icons/play_button.png",
  pause: "/icons/pause_button.png",
  language: "/icons/language_bubble.png",
  textSize: "/icons/zoom_magnifier.png",
  email: "/icons/grungy_mail.png",
  share: "/icons/speech_bubble.png",
  inviteUser: "/icons/add_user.png",
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
