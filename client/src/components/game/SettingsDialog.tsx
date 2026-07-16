import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import {
  DEV_GAME_MODE_OPTIONS,
  isSteamBuild,
  type DevGameMode,
} from "@/lib/edition";
import { useSteamEditionActive } from "@/hooks/useSteamEditionActive";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import TextScaleSelector, {
  TextScaleSettingsIcon,
} from "./TextScaleSelector";
import {
  MARKETING_SUBSCRIBE_GOLD,
} from "@/game/marketingEmailReward";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import cn from "clsx";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Web-only: signed-in user (null for guests / Steam). */
  currentUser: { email: string } | null;
  marketingOptIn: boolean;
  marketingPrefLoading: boolean;
  marketingRewardClaimed: boolean;
  onToggleMarketing: () => void;
  onDeleteAccount: () => void;
}

/** Shared row layout so every settings row lines up its icon column and label. */
const ROW = "flex items-center gap-2 px-2 min-h-9";
const ICON_SLOT = "w-7 shrink-0 flex items-center justify-center";
/** Dark unfilled track; filled portion stays red (WebKit gradient + Firefox progress). */
const VOLUME_SLIDER =
  "w-full h-4 cursor-pointer appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#dc2626_0%,#dc2626_var(--slider-fill),#262626_var(--slider-fill),#262626_100%)] " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:border-0 " +
  "[&::-webkit-slider-thumb]:mt-[calc(0.375rem/2-0.75rem/2)] " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-neutral-800 " +
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-red-600 " +
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600";

const GAME_MODE_LABEL_KEYS: Record<
  DevGameMode,
  | "settings.gameModeNormal"
  | "settings.gameModeSteamGame"
  | "settings.gameModeSteamPlaytest"
  | "settings.gameModeSteamDemo"
> = {
  normal: "settings.gameModeNormal",
  steamGame: "settings.gameModeSteamGame",
  steamPlaytest: "settings.gameModeSteamPlaytest",
  steamDemo: "settings.gameModeSteamDemo",
};

const GAME_MODE_DEFAULTS: Record<DevGameMode, string> = {
  normal: "Normal Mode",
  steamGame: "Steam Game",
  steamPlaytest: "Steam Playtest",
  steamDemo: "Steam Demo",
};

interface AudioControlRowProps {
  iconOn: string;
  iconOff: string;
  /** Visible channel name, e.g. "Music" / "Sound". */
  title: string;
  /** Accessible mute/unmute action label. */
  label: string;
  muted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}

/** One [icon][label][slider] row: tapping the icon mutes/unmutes, the slider sets volume. */
function AudioControlRow({
  iconOn,
  iconOff,
  title,
  label,
  muted,
  volume,
  onToggleMute,
  onVolumeChange,
}: AudioControlRowProps) {
  return (
    <div className={ROW}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={label}
        aria-pressed={!muted}
        className={`group ${ICON_SLOT} h-7 rounded-md hover:bg-muted/40 transition-colors`}
      >
        <img
          src={muted ? iconOff : iconOn}
          alt=""
          aria-hidden="true"
          className={`w-5 h-5 object-contain [filter:invert(1)] transition-opacity ${muted ? "opacity-40" : "opacity-90 group-hover:opacity-100"
            }`}
        />
      </button>
      <span className="w-16 shrink-0 text-sm">{title}</span>
      <div className="flex flex-1 items-center">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          disabled={muted}
          aria-label={label}
          style={{ "--slider-fill": `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className={`${VOLUME_SLIDER} ${muted ? "opacity-40 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
}

function GameModeSelector({
  value,
  onChange,
  menuPortalContainer,
}: {
  value: DevGameMode;
  onChange: (mode: DevGameMode) => void;
  menuPortalContainer: HTMLElement | null;
}) {
  const { t } = useTranslation("ui");
  const [open, setOpen] = useState(false);
  const dialogPortalReady = menuPortalContainer != null;

  const handleOpenChange = (next: boolean) => {
    if (next && !menuPortalContainer) return;
    setOpen(next);
  };

  useEffect(() => {
    if (!menuPortalContainer) {
      setOpen(false);
    }
  }, [menuPortalContainer]);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="group -mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted/40 transition-colors"
          aria-label={t("settings.gameMode", { defaultValue: "Game Mode" })}
          aria-expanded={open}
        >
          <span className="inline">
            {t(GAME_MODE_LABEL_KEYS[value], {
              defaultValue: GAME_MODE_DEFAULTS[value],
            })}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      {dialogPortalReady && (
        <DropdownMenuContent
          align="end"
          portalContainer={menuPortalContainer ?? undefined}
          className="w-max min-w-0 text-sm z-[60]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {DEV_GAME_MODE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={cn(value === option && "font-semibold", "text-sm")}
            >
              {t(GAME_MODE_LABEL_KEYS[option], {
                defaultValue: GAME_MODE_DEFAULTS[option],
              })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}

/**
 * Settings dialog opened from the Profile menu. Houses audio (music + sound effects),
 * language, email preferences, and account deletion. Blocking: while open, the
 * simulation is frozen and no new event/combat dialogs spawn over it — its
 * `settingsDialogOpen` store flag is part of `isNonRewardBlockingModalOpen` in
 * `state.ts` (and listed in `UI_ONLY_PROPERTIES` so it is never persisted).
 */
export default function SettingsDialog({
  isOpen,
  onClose,
  currentUser,
  marketingOptIn,
  marketingPrefLoading,
  marketingRewardClaimed,
  onToggleMarketing,
  onDeleteAccount,
}: SettingsDialogProps) {
  const { t } = useTranslation("ui");
  const {
    musicMuted,
    sfxMuted,
    musicVolume,
    sfxVolume,
    setMusicMuted,
    setSfxMuted,
    setMusicVolume,
    setSfxVolume,
    devGameMode,
    setDevGameMode,
  } = useGameStore();

  const toggleMusic = () => {
    const next = !musicMuted;
    setMusicMuted(next);
    audioManager.musicMute(next);
  };

  const toggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    audioManager.sfxMute(next);
  };

  const changeMusicVolume = (volume: number) => {
    setMusicVolume(volume);
    audioManager.setMusicVolume(volume);
    // Raising the slider while muted is treated as unmuting.
    if (musicMuted && volume > 0) {
      setMusicMuted(false);
      audioManager.musicMute(false);
    }
  };

  const changeSfxVolume = (volume: number) => {
    setSfxVolume(volume);
    audioManager.setSfxVolume(volume);
    if (sfxMuted && volume > 0) {
      setSfxMuted(false);
      audioManager.sfxMute(false);
    }
  };

  const steamEditionActive = useSteamEditionActive();
  const showAccountSettings = !steamEditionActive && !!currentUser;
  const showDevGameMode = import.meta.env.DEV && !isSteamBuild;
  const [menuPortalContainer, setMenuPortalContainer] =
    useState<HTMLElement | null>(null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={setMenuPortalContainer}
        className="[--adc-dialog-max-w:24rem] gap-3 py-4 px-5"
      >
        <DialogHeader className="pb-0">
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <section className="space-y-2">
            <AudioControlRow
              iconOn="/music_on.png"
              iconOff="/music_off.png"
              title={t("settings.music")}
              label={
                musicMuted ? t("footer.unmuteMusic") : t("footer.muteMusic")
              }
              muted={musicMuted}
              volume={musicVolume}
              onToggleMute={toggleMusic}
              onVolumeChange={changeMusicVolume}
            />
            <AudioControlRow
              iconOn="/sound_on.png"
              iconOff="/sound_off.png"
              title={t("settings.sound")}
              label={sfxMuted ? t("footer.unmuteSfx") : t("footer.muteSfx")}
              muted={sfxMuted}
              volume={sfxVolume}
              onToggleMute={toggleSfx}
              onVolumeChange={changeSfxVolume}
            />
            <div className={ROW}>
              <span className={ICON_SLOT}>
                <TextScaleSettingsIcon />
              </span>
              <span className="flex-1 text-sm">{t("textScale.label")}</span>
              <TextScaleSelector
                inDialog
                menuPortalContainer={menuPortalContainer}
                menuAlign="end"
                buttonClassName="group -mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted/40 transition-colors"
              />
            </div>
            <div className={ROW}>
              <span className={ICON_SLOT}>
                <GameUiIcon name="language" sizeClassName="w-5 h-5" />
              </span>
              <span className="flex-1 text-sm">
                {t("languageSelector.label")}
              </span>
              <LanguageSelector
                inDialog
                menuPortalContainer={menuPortalContainer}
                showTooltip={false}
                menuAlign="end"
                showIcon={false}
                showInlineLabel
                inlineLabelVariant="selected"
                inlineLabelClassName="inline"
                showChevron
                buttonClassName="group -mr-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm hover:bg-muted/40 transition-colors"
              />
            </div>
          </section>

          {showDevGameMode && (
            <>
              <div className="h-px bg-border my-1" />
              <div className={ROW}>
                <span className="flex-1 text-sm">
                  {t("settings.gameMode", { defaultValue: "Game Mode" })}
                </span>
                <GameModeSelector
                  value={devGameMode}
                  onChange={setDevGameMode}
                  menuPortalContainer={menuPortalContainer}
                />
              </div>
            </>
          )}

          {showAccountSettings && (
            <>
              <div className="h-px bg-border my-1" />
              <div className={ROW}>
                <span className={ICON_SLOT}>
                  <GameUiIcon name="email" sizeClassName="w-5 h-5" />
                </span>
                <span className="flex-1 text-sm">{t("settings.emails")}</span>
                {!marketingRewardClaimed && (
                  <span className="text-sm font-semibold shrink-0">
                    +
                    {t("common:currency.goldAmount", {
                      amount: MARKETING_SUBSCRIBE_GOLD,
                    })}
                  </span>
                )}
                <Checkbox
                  checked={marketingOptIn}
                  disabled={marketingPrefLoading}
                  onCheckedChange={() => onToggleMarketing()}
                  aria-label={t("settings.emails")}
                />
              </div>

              <div className="h-px bg-border my-1" />
              <button
                type="button"
                onClick={onDeleteAccount}
                className={`${ROW} rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors`}
              >
                <span className={ICON_SLOT}>
                  <GameUiIcon name="deleteAccount" sizeClassName="w-5 h-5" />
                </span>
                <span className="flex-1 text-left text-sm">
                  {t("profile.deleteAccount")}
                </span>
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
