import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import { isSteamBuild } from "@/lib/edition";
import { Mail, Trash2 } from "lucide-react";
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

interface AudioControlRowProps {
  iconOn: string;
  iconOff: string;
  label: string;
  muted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}

/** One [icon][slider] row: tapping the icon mutes/unmutes, the slider sets volume. */
function AudioControlRow({
  iconOn,
  iconOff,
  label,
  muted,
  volume,
  onToggleMute,
  onVolumeChange,
}: AudioControlRowProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={label}
        aria-pressed={!muted}
        className="group shrink-0 w-9 h-9 flex items-center justify-center rounded-md hover:bg-muted/40 transition-colors"
      >
        <img
          src={muted ? iconOff : iconOn}
          alt=""
          aria-hidden="true"
          className={`w-5 h-5 object-contain [filter:invert(1)] transition-opacity ${muted ? "opacity-40" : "opacity-90 group-hover:opacity-100"
            }`}
        />
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        disabled={muted}
        aria-label={label}
        onChange={(e) => onVolumeChange(Number(e.target.value))}
        className={`flex-1 h-1.5 cursor-pointer accent-red-600 ${muted ? "opacity-40 cursor-not-allowed" : ""
          }`}
      />
    </div>
  );
}

/**
 * Settings dialog opened from the Profile menu. Houses audio (music + sound effects),
 * email preferences, and account deletion. Intentionally NON-blocking: the simulation
 * keeps running while the player adjusts volume, so its open flag is not added to
 * `isModalDialogOpen` / `isNonRewardBlockingModalOpen`.
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
      <DialogContent className="[--adc-dialog-max-w:24rem]">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <section className="space-y-3">
            <AudioControlRow
              iconOn="/music_on.png"
              iconOff="/music_off.png"
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
              label={sfxMuted ? t("footer.unmuteSfx") : t("footer.muteSfx")}
              muted={sfxMuted}
              volume={sfxVolume}
              onToggleMute={toggleSfx}
              onVolumeChange={changeSfxVolume}
            />
            <LanguageSelector
              showTooltip={false}
              menuAlign="start"
              buttonClassName="group flex items-center gap-2 w-full justify-start rounded-md px-2 py-1.5 text-sm font-normal hover:bg-muted/40 transition-colors"
              iconClassName="w-4 h-4 shrink-0 opacity-90"
              showInlineLabel
              inlineLabelClassName="inline"
            />
          </section>

          {showAccountSettings && (
            <>
              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={onToggleMarketing}
                disabled={marketingPrefLoading}
                className={`flex items-center justify-between w-full gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40 transition-colors ${marketingPrefLoading ? "opacity-50 cursor-wait" : ""
                  }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
                  <span>
                    {marketingOptIn
                      ? t("profile.emailsOn")
                      : t("profile.emailsOff")}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {!marketingRewardClaimed && (
                    <span className="font-semibold">
                      +
                      {t("common:currency.goldAmount", {
                        amount: MARKETING_SUBSCRIBE_GOLD,
                      })}
                    </span>
                  )}
                  {marketingRewardClaimed && (
                    <span className="text-xs text-muted-foreground">✓</span>
                  )}
                </span>
              </button>

              <div className="h-px bg-border" />
              <button
                type="button"
                onClick={onDeleteAccount}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                <Trash2 className="w-4 h-4 shrink-0" aria-hidden />
                <span>{t("profile.deleteAccount")}</span>
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
