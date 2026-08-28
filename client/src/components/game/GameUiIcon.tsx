import { publicUrl } from "@/lib/publicUrl";
import { cn } from "@/lib/utils";

/** Grunge UI icons in `client/public/icons/` (white SVG masks from Pixarts bundle). */
export const GAME_UI_ICON_SRC = {
  settings: "/icons/settings_gear.svg",
  menu: "/icons/option_bars.svg",
  deleteAccount: "/icons/trash_can.svg",
  signOut: "/icons/exit_door.svg",
  saveGame: "/icons/save_game.svg",
  newGame: "/icons/refresh_arrows.svg",
  leaderboard: "/icons/award_medal.svg",
  reward: "/icons/award_star.svg",
  unpause: "/icons/play_button.svg",
  pause: "/icons/pause_button.svg",
  achievements: "/icons/quest_book.svg",
  timedEvent: "/icons/time_hourglass.svg",
  language: "/icons/language_bubble.svg",
  textSize: "/icons/zoom_magnifier.svg",
  email: "/icons/grungy_mail.svg",
  feedback: "/icons/speech_bubble.svg",
  share: "/icons/progress_arrows.svg",
  inviteUser: "/icons/add_user.svg",
  discover: "/icons/directional_pad.svg",
  signUp: "/icons/up_button.svg",
  socialReward: "/icons/cut_diamond.svg",
  exclusiveReward: "/icons/diamond_ring.svg",
  trader: "/icons/coin_stack.svg",
  network: "/icons/side-panel/user_group.svg",
} as const;

export type GameUiIconName = keyof typeof GAME_UI_ICON_SRC;

const DEFAULT_CLASS =
  "inline-block shrink-0 bg-current opacity-90 [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]";

export function GameUiIcon({
  name,
  className,
  sizeClassName = "game-tab-icon",
}: {
  name: GameUiIconName;
  className?: string;
  /** Tailwind/CSS size utilities, e.g. `w-5 h-5` or `game-tab-icon`. */
  sizeClassName?: string;
}) {
  const src = publicUrl(GAME_UI_ICON_SRC[name]);
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

/** Dark-on-transparent PNG glyphs. Use alpha masks, not GameUiIcon luminance masks. */
const AUDIO_GLYPH_SRC = {
  music: "/music_on.png",
  musicMuted: "/music_off.png",
  sound: "/sound_on.png",
  soundMuted: "/sound_off.png",
} as const;

export type AudioGlyphIconName = keyof typeof AUDIO_GLYPH_SRC;

const AUDIO_GLYPH_CLASS =
  "inline-block shrink-0 bg-current [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] [mask-mode:alpha] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]";

export function AudioGlyphIcon({
  name,
  className,
  sizeClassName = "w-5 h-5",
}: {
  name: AudioGlyphIconName;
  className?: string;
  sizeClassName?: string;
}) {
  const src = publicUrl(AUDIO_GLYPH_SRC[name]);
  return (
    <span
      aria-hidden="true"
      className={cn(AUDIO_GLYPH_CLASS, sizeClassName, className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
      }}
    />
  );
}
