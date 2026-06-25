import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
} from "@/lib/gameFooterSocialLinks";
import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { tWithFallback } from "@/i18n/resolveGameText";
import { isSteamBuild } from "@/lib/edition";

const FOOTER_CONTROL_BTN =
  "group shrink-0 px-1 py-1 text-xs text-neutral-300 hover hover:!text-red-600";
const FOOTER_CONTROL_BTN_FADE =
  "opacity-80 transition-[opacity,color] group-hover:opacity-100";
const FOOTER_CONTROL_SVG_ICON_HOVER =
  "w-4 h-4 text-neutral-300 opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600";
const FOOTER_CONTROL_TEXT =
  `${FOOTER_CONTROL_BTN_FADE} group-hover:!text-red-600`;
const FOOTER_SOCIAL_LABEL =
  `${FOOTER_CONTROL_TEXT} hidden sm:inline`;
const FOOTER_LEGAL_LINK =
  "text-2xs text-neutral-300 opacity-40 hover:opacity-100 transition-opacity";

function pumpDonateHeart(heart: HTMLSpanElement | null): void {
  if (!heart) return;
  heart.classList.remove("donate-heart-pump-once");
  void heart.offsetWidth;
  heart.classList.add("donate-heart-pump-once");
}

export default function GameFooter() {
  const {
    setShopDialogOpen,
    isPaused,
    togglePause,
    idleModeDialog,
    setFullGamePurchaseDialogOpen,
    fullGamePurchaseDialogOpen,
    BTP,
  } = useGameStore();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  const donateHeartRef = useRef<HTMLSpanElement>(null);
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

  const socialLinkClass = `group ${FOOTER_CONTROL_BTN} flex items-center justify-center gap-1`;
  const socialIconClass = `${FOOTER_CONTROL_SVG_ICON_HOVER}${isPaused ? " !opacity-100" : ""}`;

  return (
    <>
      {!isSteamBuild && (
        <FullGamePurchaseDialog
          isOpen={fullGamePurchaseDialogOpen}
          onClose={() => setFullGamePurchaseDialogOpen(false)}
          openedFromFooter={true}
        />
      )}
      <footer className="relative flex min-h-9 items-center border-t border-border px-2 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible">
        <div className="flex w-full items-center justify-between">
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

            {BTP === 1 && !isSteamBuild ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setFullGamePurchaseDialogOpen(true)}
                className={FOOTER_CONTROL_BTN}
              >
                <span className={FOOTER_CONTROL_TEXT}>{t("footer.fullGame")}</span>
              </Button>
            ) : null}
            {/* Shop + donate are web-only (Stripe / external tip jar). */}
            {!isSteamBuild && (
              <>
                <HoverCalloutTooltip
                  label={t("footer.openShop")}
                  side="top"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShopDialogOpen(true)}
                    aria-label={t("footer.openShop")}
                    className={FOOTER_CONTROL_BTN}
                  >
                    <span className={FOOTER_CONTROL_TEXT}>
                      {t("footer.trader")}
                    </span>
                  </Button>
                </HoverCalloutTooltip>
                <HoverCalloutTooltip
                  label={t("footer.supportGame")}
                  side="top"
                >
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleOfferTribute}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse" || e.pointerType === "pen") {
                        pumpDonateHeart(donateHeartRef.current);
                      }
                    }}
                    aria-label={t("footer.supportGame")}
                    className={`${FOOTER_CONTROL_BTN} flex items-center gap-1 overflow-visible`}
                  >
                    <span
                      ref={donateHeartRef}
                      aria-hidden
                      className={`donate-heart text-red-600 ${FOOTER_CONTROL_BTN_FADE}`}
                      onAnimationEnd={(e) => {
                        e.currentTarget.classList.remove("donate-heart-pump-once");
                      }}
                    >
                      ❤︎⁠
                    </span>
                    <span className={FOOTER_CONTROL_TEXT}>
                      {t("footer.donate")}
                    </span>
                  </Button>
                </HoverCalloutTooltip>
              </>
            )}
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
                <a
                  key={platform}
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
                  <span className={FOOTER_SOCIAL_LABEL}>{linkLabel}</span>
                </a>
              );
            })}
            {!isSteamBuild && (
              <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-1">
                <a href="/privacy" className={FOOTER_LEGAL_LINK}>
                  {t("footer.privacy")}
                </a>
                <a href="/imprint" className={FOOTER_LEGAL_LINK}>
                  {t("footer.imprint")}
                </a>
              </div>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
