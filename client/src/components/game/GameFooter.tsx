import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
} from "@/lib/gameFooterSocialLinks";
import FullGamePurchaseDialog from "./FullGamePurchaseDialog";
import { useState, useEffect, useRef, useCallback, cloneElement } from "react";
import { useTranslation } from "react-i18next";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { tWithFallback } from "@/i18n/resolveGameText";
import {
  useSteamDemoActive,
  useSteamDesktopEditionActive,
  useSteamEditionActive,
} from "@/hooks/useSteamEditionActive";
import { isGalaxyEdition } from "@/lib/edition";
import {
  handleDonateHeartAnimationEnd,
  pumpDonateHeart,
} from "@/lib/exclusivePromoShockwave";
import { Progress } from "@/components/ui/progress";
import {
  getDemoProgressCompleted,
  getDemoProgressPercent,
  getDemoProgressSegmentCount,
} from "@/game/demoLimit";

const FOOTER_CONTROL_BTN =
  "group shrink-0 px-1 py-1 text-xs text-neutral-300 hover hover:!text-red-600";
const FOOTER_CONTROL_BTN_FADE =
  "opacity-80 transition-[opacity,color] group-hover:opacity-100";
const FOOTER_CONTROL_SVG_ICON_HOVER =
  "w-4 h-4 text-neutral-300 opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600";
/** Steam editions: Reddit/Contact sit quieter at rest, full opacity on hover. */
const FOOTER_CONTROL_SVG_ICON_HOVER_STEAM_MUTED =
  "w-4 h-4 text-neutral-300 opacity-40 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600";
const FOOTER_CONTROL_TEXT =
  `${FOOTER_CONTROL_BTN_FADE} group-hover:!text-red-600`;
const FOOTER_SOCIAL_LABEL =
  `${FOOTER_CONTROL_TEXT} hidden sm:inline`;
const FOOTER_SOCIAL_LABEL_STEAM_MUTED =
  "opacity-60 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-red-600 hidden sm:inline";
const FOOTER_LEGAL_LINK =
  "text-2xs text-neutral-300 opacity-40 hover:opacity-100 transition-opacity";
/** Heart stays red; opacity-only transition so scale pump is not overridden. */
const DONATE_HEART =
  "donate-heart text-red-600 opacity-80 group-hover:opacity-100 transition-opacity";

function SteamDemoProgressBar() {
  const { t } = useTranslation("ui");
  const woodenHut = useGameStore((s) => s.buildings.woodenHut ?? 0);
  const buildings = { woodenHut };
  const segments = getDemoProgressSegmentCount();
  const completed = getDemoProgressCompleted(buildings);
  const percent = getDemoProgressPercent(buildings);
  const label = t("footer.demoProgress", { defaultValue: "Demo Progress" });

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-16 sm:px-24"
      aria-hidden={false}
    >
      <div className="pointer-events-auto flex max-w-[min(18rem,50vw)] flex-col items-center gap-1 opacity-80 transition-opacity hover:opacity-100 sm:max-w-[20rem]">
        <span className="text-2xs leading-none text-neutral-400 whitespace-nowrap">
          {label}
        </span>
        <Progress
          value={percent}
          segments={segments}
          hideBorder
          disableGlow
          className="h-1.5 w-full min-w-[8rem]"
          indicatorClassName="bg-green-700"
          aria-label={label}
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={segments}
          data-testid="footer-demo-progress"
        />
      </div>
    </div>
  );
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
  const steamEditionActive = useSteamEditionActive();
  const steamDesktopEditionActive = useSteamDesktopEditionActive();
  const steamDemoActive = useSteamDemoActive();
  const showFooterDonate = !steamEditionActive || isGalaxyEdition();
  // Steam Game / Playtest / Demo (build or DEV Game Mode) — no "Steam" in footer.
  // Galaxy and Normal/web keep the wishlist link.
  const hideSteamStoreLink = steamDesktopEditionActive;

  const triggerDonateHeartPump = useCallback(() => {
    pumpDonateHeart(donateHeartRef.current);
  }, []);

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
      {!steamEditionActive && (
        <FullGamePurchaseDialog
          isOpen={fullGamePurchaseDialogOpen}
          onClose={() => setFullGamePurchaseDialogOpen(false)}
          openedFromFooter={true}
        />
      )}
      <footer className="relative flex min-h-9 items-center border-t border-border px-2 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible">
        {steamDemoActive && <SteamDemoProgressBar />}
        <div className="relative z-0 flex w-full items-center justify-between">
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
                <GameUiIcon
                  name={isPaused ? "unpause" : "pause"}
                  sizeClassName="w-3.5 h-3.5"
                  className={
                    isPaused
                      ? undefined
                      : `${FOOTER_CONTROL_TEXT} group-hover:!text-red-600`
                  }
                />
              </Button>
            </HoverCalloutTooltip>

            {BTP === 1 && !steamEditionActive ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setFullGamePurchaseDialogOpen(true)}
                className={FOOTER_CONTROL_BTN}
              >
                <span className={FOOTER_CONTROL_TEXT}>{t("footer.fullGame")}</span>
              </Button>
            ) : null}
            {/* Shop is web-only (Stripe). Donate is web + Galaxy (external tip jar). */}
            {!steamEditionActive && (
              <HoverCalloutTooltip
                label={t("footer.openShop")}
                side="top"
              >
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShopDialogOpen(true, "footer")}
                  aria-label={t("footer.openShop")}
                  className={FOOTER_CONTROL_BTN}
                >
                  <span className={FOOTER_CONTROL_TEXT}>
                    {t("footer.trader")}
                  </span>
                </Button>
              </HoverCalloutTooltip>
            )}
            {showFooterDonate && (
              <HoverCalloutTooltip
                label={t("footer.supportGame")}
                side="top"
                onHoverStart={triggerDonateHeartPump}
              >
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleOfferTribute}
                  onMouseEnter={triggerDonateHeartPump}
                  aria-label={t("footer.supportGame")}
                  className={`${FOOTER_CONTROL_BTN} flex items-center gap-1`}
                >
                  <span
                    ref={donateHeartRef}
                    aria-hidden
                    className={DONATE_HEART}
                    onAnimationEnd={(e) =>
                      handleDonateHeartAnimationEnd(
                        e.currentTarget,
                        e.animationName,
                      )
                    }
                  >
                    ❤︎⁠
                  </span>
                  <span className={FOOTER_CONTROL_TEXT}>
                    {t("footer.donate")}
                  </span>
                </Button>
              </HoverCalloutTooltip>
            )}
          </div>
          <div className="flex-1 flex justify-end gap-1 items-center">
            {GAME_FOOTER_RIGHT_ICON_ORDER.map((platform) => {
              if (platform === "steam" && hideSteamStoreLink) {
                return null;
              }

              const { href, title } =
                GAME_FOOTER_RIGHT_ICON_LINKS[platform];
              const linkLabel =
                platform === "contact"
                  ? tWithFallback("ui", "footer.contact", title)
                  : title;
              // Steam Game / Playtest / Demo: mute Reddit + Contact until hover.
              const steamMutedSocial =
                steamDesktopEditionActive &&
                (platform === "reddit" || platform === "contact");
              const platformIconClass = steamMutedSocial
                ? `${FOOTER_CONTROL_SVG_ICON_HOVER_STEAM_MUTED}${isPaused ? " !opacity-100" : ""}`
                : socialIconClass;
              const platformLabelClass = steamMutedSocial
                ? FOOTER_SOCIAL_LABEL_STEAM_MUTED
                : FOOTER_SOCIAL_LABEL;
              const socialLink = (
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
                    className={platformIconClass}
                  />
                  <span className={platformLabelClass}>{linkLabel}</span>
                </a>
              );

              if (platform === "steam") {
                const showWishlistCallout =
                  isPaused || idleModeDialog.isOpen;
                return (
                  <HoverCalloutTooltip
                    key={platform}
                    label={t("footer.wishlistOnSteam")}
                    side="top"
                    forceVisible={showWishlistCallout}
                    onCalloutClick={
                      showWishlistCallout
                        ? () =>
                          window.open(
                            href,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        : undefined
                    }
                  >
                    {socialLink}
                  </HoverCalloutTooltip>
                );
              }

              return cloneElement(socialLink, { key: platform });
            })}
            {!steamEditionActive && (
              <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-1">
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={FOOTER_LEGAL_LINK}
                >
                  {t("footer.privacy")}
                </a>
                <a
                  href="/imprint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={FOOTER_LEGAL_LINK}
                >
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
