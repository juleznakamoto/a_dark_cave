import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { audioManager } from "@/lib/audio";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
} from "@/lib/gameFooterSocialLinks";
import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import LanguageSelector from "./LanguageSelector";
import { useState, useEffect } from "react";
import {
  hasAnyShopPurchase,
  isTraderFooterShopVisible,
} from "@/game/stateHelpers";
import { useTranslation } from "react-i18next";
import { tWithFallback } from "@/i18n/resolveGameText";

const FOOTER_CONTROL_BTN =
  "group shrink-0 px-1 py-1 text-xs text-neutral-300 hover hover:!text-red-600";
const FOOTER_CONTROL_BTN_FADE =
  "opacity-60 transition-opacity group-hover:opacity-100";
const FOOTER_CONTROL_ICON_HOVER =
  "w-4 h-4 shrink-0 object-contain opacity-60 transition-[filter,opacity] group-hover:opacity-100 [filter:invert(1)] group-hover:[filter:invert(17%)_sepia(89%)_saturate(7458%)_hue-rotate(358deg)_brightness(97%)_contrast(118%)]";
const FOOTER_CONTROL_SVG_ICON_HOVER =
  "w-4 h-4 text-neutral-300 opacity-60 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600";
const FOOTER_CONTROL_TEXT =
  `${FOOTER_CONTROL_BTN_FADE} transition-[opacity,color] group-hover:!text-red-600`;
const FOOTER_SOCIAL_ICON =
  "w-4 h-4 text-neutral-300 opacity-80 transition-opacity group-hover:opacity-100";
const FOOTER_LEGAL_LINK =
  "text-[10px] text-neutral-300 opacity-40 hover:opacity-100 transition-opacity";

export default function GameFooter() {
  const {
    setShopDialogOpen,
    isPaused,
    togglePause,
    musicMuted,
    sfxMuted,
    setMusicMuted,
    setSfxMuted,
    cruelMode,
    devMode,
    idleModeDialog,
    playTime,
    setFullGamePurchaseDialogOpen,
    fullGamePurchaseDialogOpen,
    BTP,
    story,
    traderDialogOpens,
    hasMadeNonFreePurchase,
    activatedPurchases,
  } = useGameStore();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  const { t } = useTranslation("ui");

  // Trigger glow animation when pause state changes
  useEffect(() => {
    setGlowingButton("pause");
    const timer = setTimeout(() => setGlowingButton(null), 500);
    return () => clearTimeout(timer);
  }, [isPaused]);

  const handleOfferTribute = () => {
    window.open("https://www.buymeacoffee.com/julez.b", "_blank");
  };

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

  // Check if gameplay time is less than 30 minutes
  const isEarlyGameplay = playTime < 30 * 60 * 1000; // 30 minutes in milliseconds
  const traderShopUnlocked = isTraderFooterShopVisible({
    story,
    traderDialogOpens,
    cruelMode,
    devMode,
    hasMadeNonFreePurchase,
    activatedPurchases,
  });
  const traderFooterFullOpacity =
    cruelMode ||
    hasAnyShopPurchase({ hasMadeNonFreePurchase, activatedPurchases }) ||
    !isEarlyGameplay;

  const socialLinkClass = `group ${FOOTER_CONTROL_BTN} flex items-center justify-center`;
  const socialIconClass = `${FOOTER_SOCIAL_ICON}${isPaused ? " !opacity-100" : ""}`;

  return (
    <>
      <FullGamePurchaseDialog
        isOpen={fullGamePurchaseDialogOpen}
        onClose={() => setFullGamePurchaseDialogOpen(false)}
        openedFromFooter={true}
      />
      <footer className="relative border-t border-border px-2 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-0.5 shrink-0">
            <HoverCalloutTooltip
              label={
                isPaused ? t("footer.resumeGame") : t("footer.pauseGame")
              }
              side="top"
              arrowAlign="start"
            >
              <Button
                variant="ghost"
                size="xs"
                onClick={togglePause}
                data-testid="button-pause-game"
                disabled={idleModeDialog.isOpen}
                aria-label={
                  isPaused ? t("footer.resumeGame") : t("footer.pauseGame")
                }
                className={`${FOOTER_CONTROL_BTN} ${idleModeDialog.isOpen ? "opacity-30 cursor-not-allowed" : ""} ${isPaused ? "!text-red-600 !opacity-100" : ""} ${isPaused && !idleModeDialog.isOpen ? "continue-pause-flash" : ""}`}
              >
                <span className={isPaused ? undefined : FOOTER_CONTROL_TEXT}>
                  {isPaused ? "▶" : "❚❚"}
                </span>
              </Button>
            </HoverCalloutTooltip>
            <HoverCalloutTooltip
              label={
                musicMuted ? t("footer.unmuteMusic") : t("footer.muteMusic")
              }
              side="top"
              arrowAlign="start"
            >
              <Button
                variant="ghost"
                size="xs"
                onClick={toggleMusic}
                data-testid="button-toggle-music"
                className={FOOTER_CONTROL_BTN}
                aria-label={
                  musicMuted ? t("footer.unmuteMusic") : t("footer.muteMusic")
                }
              >
                <img
                  src={musicMuted ? "/music_off.png" : "/music_on.png"}
                  alt=""
                  className={FOOTER_CONTROL_ICON_HOVER}
                />
              </Button>
            </HoverCalloutTooltip>
            <HoverCalloutTooltip
              label={sfxMuted ? t("footer.unmuteSfx") : t("footer.muteSfx")}
              side="top"
            >
              <Button
                variant="ghost"
                size="xs"
                onClick={toggleSfx}
                data-testid="button-toggle-sfx"
                className={FOOTER_CONTROL_BTN}
                aria-label={
                  sfxMuted ? t("footer.unmuteSfx") : t("footer.muteSfx")
                }
              >
                <img
                  src={sfxMuted ? "/sound_off.png" : "/sound_on.png"}
                  alt=""
                  className={FOOTER_CONTROL_ICON_HOVER}
                />
              </Button>
            </HoverCalloutTooltip>
            <LanguageSelector
              buttonClassName={FOOTER_CONTROL_BTN}
              iconClassName={FOOTER_CONTROL_SVG_ICON_HOVER}
            />

            {BTP === 1 ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setFullGamePurchaseDialogOpen(true)}
                className={`${FOOTER_CONTROL_BTN} ${FOOTER_CONTROL_BTN_FADE}`}
              >
                {t("footer.fullGame")}
              </Button>
            ) : null}
            {traderShopUnlocked && (devMode || BTP !== 1) ? (
              <HoverCalloutTooltip
                label={t("footer.openShop")}
                side="top"
              >
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShopDialogOpen(true)}
                  aria-label={t("footer.openShop")}
                  className={`${FOOTER_CONTROL_BTN} ${traderFooterFullOpacity ? "opacity-100" : "opacity-60"} hover:!opacity-100`}
                >
                  {t("footer.trader")}
                </Button>
              </HoverCalloutTooltip>
            ) : null}
            <HoverCalloutTooltip
              label={t("footer.supportGame")}
              side="top"
            >
              <Button
                variant="ghost"
                size="xs"
                onClick={handleOfferTribute}
                aria-label={t("footer.supportGame")}
                className={`${FOOTER_CONTROL_BTN} ${isEarlyGameplay ? "opacity-60" : "opacity-100"} hover:!opacity-100`}
              >
                {t("footer.donate")}
              </Button>
            </HoverCalloutTooltip>
          </div>
          <div className="flex-1 flex justify-end gap-1 items-center">
            {GAME_FOOTER_RIGHT_ICON_ORDER.map((platform) => {
              const { href, title } =
                GAME_FOOTER_RIGHT_ICON_LINKS[platform];
              const linkLabel =
                platform === "contact"
                  ? tWithFallback("ui", "footer.contact", title)
                  : title;
              return (
                <HoverCalloutTooltip
                  key={platform}
                  label={linkLabel}
                  side="top"
                >
                  <a
                    href={href}
                    {...(href.startsWith("http")
                      ? {
                        target: "_blank",
                        rel: "noopener noreferrer me",
                      }
                      : {})}
                    className={socialLinkClass}
                    aria-label={linkLabel}
                  >
                    <FooterSocialIcon
                      platform={platform}
                      className={socialIconClass}
                    />
                  </a>
                </HoverCalloutTooltip>
              );
            })}
            <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-1">
              <a href="/privacy" className={FOOTER_LEGAL_LINK}>
                {t("footer.privacy")}
              </a>
              <a href="/imprint" className={FOOTER_LEGAL_LINK}>
                {t("footer.imprint")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
