import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import { isSteamBuild } from "@/lib/edition";
import { Globe, Mail, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";
import {
  MARKETING_SUBSCRIBE_GOLD,
} from "@/game/marketingEmailReward";

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
const ROW = "flex items-center gap-2 px-2 min-h-8";
const ICON_SLOT = "w-7 shrink-0 flex items-center justify-center";
/** Dark unfilled track; filled portion stays red (WebKit gradient + Firefox progress). */
const VOLUME_SLIDER =
  "flex-1 h-1.5 cursor-pointer appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full " +
  "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#dc2626_0%,#dc2626_var(--slider-fill),#262626_var(--slider-fill),#262626_100%)] " +
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 " +
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:border-0 " +
  "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-neutral-800 " +
  "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-red-600 " +
  "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full " +
  "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-red-600";

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

  const showAccountSettings = !isSteamBuild && !!currentUser;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="[--adc-dialog-max-w:24rem] gap-2 py-4 px-5"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest('[role="menu"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement).closest('[role="menu"]')) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="pb-0">
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <section className="space-y-1">
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
                <Globe className="w-5 h-5 opacity-90" aria-hidden />
              </span>
              <span className="flex-1 text-sm">
                {t("languageSelector.label")}
              </span>
              <LanguageSelector
                inDialog
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

          {showAccountSettings && (
            <>
              <div className="h-px bg-border" />
              <label
                htmlFor="settings-email-updates"
                className={`${ROW} rounded-md hover:bg-muted/40 transition-colors cursor-pointer`}
              >
                <span className={ICON_SLOT}>
                  <Mail className="w-5 h-5 opacity-90" aria-hidden />
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
                  id="settings-email-updates"
                  checked={marketingOptIn}
                  disabled={marketingPrefLoading}
                  onCheckedChange={() => onToggleMarketing()}
                  aria-label={t("settings.emails")}
                />
              </label>

              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={onDeleteAccount}
                className={`${ROW} rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors`}
              >
                <span className={ICON_SLOT}>
                  <Trash2 className="w-5 h-5" aria-hidden />
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
