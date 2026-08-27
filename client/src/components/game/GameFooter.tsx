import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { HoverCalloutTooltip } from "@/components/game/HoverCalloutTooltip";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
  STEAM_STORE_UTM_CONTENT,
  steamStoreUrl,
} from "@/lib/gameFooterSocialLinks";
import { useState, useEffect, useRef, useCallback, cloneElement, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { tWithFallback } from "@/i18n/resolveGameText";
import {
  useCrazyGamesEditionActive,
  useHideSteamStoreLink,
  useSteamDemoActive,
  useSteamEditionActive,
} from "@/hooks/useSteamEditionActive";
import { isGalaxyEdition } from "@/lib/edition";
import {
  handleDonateHeartAnimationEnd,
  pumpDonateHeart,
} from "@/lib/exclusivePromoShockwave";
import { SegmentedProgress } from "@/components/ui/progress-bar";
import {
  getDemoProgressCompleted,
  getDemoProgressPercent,
  getDemoProgressSegmentCount,
} from "@/game/demoLimit";
import { openGameFeedbackForm } from "@/lib/gameFeedbackForm";
import {
  initPlaylight,
  markPlaylightDiscoveryUserInitiated,
} from "@/lib/playlight";
import PlaylightDiscoveryButton from "./PlaylightDiscoveryButton";
import FooterNetworkMenu from "./FooterNetworkMenu";
import { usePeriodicPlayTimeTooltip } from "@/hooks/usePeriodicPlayTimeTooltip";
import { GAME_CHROME_NO_BG_HOVER } from "./gameChrome";
import { useCoinHoverParticles } from "@/components/ui/coin-hover-particles";
import { FOOTER_TRADER_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";

const FOOTER_CONTROL_BTN_BASE =
  `group shrink-0 px-1 py-1 text-xs font-medium text-neutral-300 hover ${GAME_CHROME_NO_BG_HOVER}`;
/** Default chrome: opacity only. Color accents are reserved for trader / more games / donate. */
const FOOTER_CONTROL_BTN = FOOTER_CONTROL_BTN_BASE;
const FOOTER_CONTROL_BTN_FADE =
  "opacity-80 transition-[opacity,color] group-hover:opacity-100";
/** Neutral icons/labels stay the same color; only brighten on hover. */
const FOOTER_CONTROL_ICON =
  `${FOOTER_CONTROL_BTN_FADE} text-neutral-300 group-hover:!text-neutral-300`;
const FOOTER_CONTROL_SVG_ICON_HOVER =
  `w-4 h-4 ${FOOTER_CONTROL_ICON}`;
const FOOTER_CONTROL_TEXT =
  `${FOOTER_CONTROL_BTN_FADE} text-neutral-300 group-hover:!text-neutral-300`;
const FOOTER_SOCIAL_LABEL =
  `${FOOTER_CONTROL_TEXT} hidden sm:inline`;
const FOOTER_LEGAL_LINK =
  "text-2xs text-neutral-300 opacity-40 hover:opacity-100 transition-opacity";
/** Heart stays red; opacity-only transition so scale pump is not overridden. */
const DONATE_HEART =
  "donate-heart text-base leading-none text-red-600 opacity-80 group-hover:opacity-100 transition-opacity";
const FOOTER_DONATE_TEXT =
  `${FOOTER_CONTROL_BTN_FADE} group-hover:!text-red-600`;
const FOOTER_TRADER_TEXT =
  `${FOOTER_CONTROL_BTN_FADE} group-hover:!text-yellow-500`;

const FOOTER_STEAM_BUTTON_ID = "footer-steam";
const FOOTER_STEAM_WISHLIST_CLICKED_SEEN_KEY = "footerSteamWishlistClicked";

/** First auto-show after 60 min active play, then every 30 min until clicked. */
const STEAM_TOOLTIP_FIRST_SHOW_PLAY_MS = 60 * 60 * 1000;
const STEAM_TOOLTIP_INTERVAL_MS = 30 * 60 * 1000;

function markFooterSteamClicked() {
  const state = useGameStore.getState();
  state.trackButtonClick(FOOTER_STEAM_BUTTON_ID);
  if (state.story?.seen?.[FOOTER_STEAM_WISHLIST_CLICKED_SEEN_KEY] === true) {
    return;
  }
  useGameStore.setState({
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        [FOOTER_STEAM_WISHLIST_CLICKED_SEEN_KEY]: true,
      },
    },
  });
}

function FooterSteamWishlistCallout({
  href,
  label,
  forceShowTooltip,
  forceTooltipFadeDurationMs,
  children,
}: {
  href: string;
  label: string;
  forceShowTooltip: boolean;
  forceTooltipFadeDurationMs?: number;
  children: ReactNode;
}) {
  const steamClicked = useGameStore(
    (s) => s.story?.seen?.[FOOTER_STEAM_WISHLIST_CLICKED_SEEN_KEY] === true,
  );
  const showPeriodicTooltip = usePeriodicPlayTimeTooltip({
    firstShowPlayMs: STEAM_TOOLTIP_FIRST_SHOW_PLAY_MS,
    intervalMs: STEAM_TOOLTIP_INTERVAL_MS,
    enabled: !steamClicked,
  });
  const autoVisible =
    !steamClicked && (forceShowTooltip || showPeriodicTooltip);

  return (
    <HoverCalloutTooltip
      label={label}
      side="top"
      size="md"
      portal
      forceVisible={autoVisible}
      fadeDurationMs={
        forceShowTooltip && !steamClicked
          ? forceTooltipFadeDurationMs
          : undefined
      }
      onCalloutClick={() => {
        markFooterSteamClicked();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      {children}
    </HoverCalloutTooltip>
  );
}

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
      <div className="pointer-events-auto w-full max-w-[min(9rem,25vw)] min-w-[4rem] opacity-80 transition-opacity hover:opacity-100 sm:max-w-[10rem]">
        <SegmentedProgress
          value={percent}
          segments={segments}
          label={label}
          showPercentage={false}
          showDemo={false}
          compact
          showRim={false}
          filledClassName="bg-green-700"
          emptyClassName="bg-neutral-800"
          segmentClassName="h-1.5"
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
  const setShopDialogOpen = useGameStore((s) => s.setShopDialogOpen);
  const referralCount = useGameStore((s) => s.referralCount ?? 0);
  const isPaused = useGameStore((s) => s.isPaused);
  const togglePause = useGameStore((s) => s.togglePause);
  const idleModeDialogOpen = useGameStore((s) => s.idleModeDialog.isOpen);
  const [glowingButton, setGlowingButton] = useState<string | null>(null);
  const donateHeartRef = useRef<HTMLSpanElement>(null);
  const { t } = useTranslation("ui");
  const steamEditionActive = useSteamEditionActive();
  const steamDemoActive = useSteamDemoActive();
  const crazyGamesEditionActive = useCrazyGamesEditionActive();
  const showFooterDonate = !steamEditionActive || isGalaxyEdition();
  // Steam Game / Playtest / Demo (build or DEV Game Mode) hide the store link.
  // Galaxy and Normal/web keep the wishlist link. CrazyGames moves Steam +
  // socials into the upper-right menu.
  const hideSteamStoreLink = useHideSteamStoreLink();
  const hideFooterSteamAndSocial = crazyGamesEditionActive;

  const triggerDonateHeartPump = useCallback(() => {
    pumpDonateHeart(donateHeartRef.current);
  }, []);

  const footerTraderIconRef = useRef<HTMLSpanElement>(null);
  const {
    hoverHandlers: footerTraderHoverHandlers,
    portal: footerTraderParticlesPortal,
  } = useCoinHoverParticles("gold", {
    particleOriginRef: footerTraderIconRef,
    particleConfig: FOOTER_TRADER_PARTICLE_CONFIG,
    /** Large interval so hover enter fires one burst of 10 until leave/re-enter. */
    emitIntervalMs: 60_000,
    zIndex: 50,
  });

  // Trigger glow animation when pause state changes
  useEffect(() => {
    setGlowingButton("pause");
    const timer = setTimeout(() => setGlowingButton(null), 500);
    return () => clearTimeout(timer);
  }, [isPaused]);

  const handleOfferTribute = () => {
    window.open("https://www.buymeacoffee.com/julez.b", "_blank");
  };

  const handlePlaylightDiscovery = async () => {
    // @ts-ignore
    let playlightSDK = window.playlightSDK;
    if (!playlightSDK) {
      try {
        await initPlaylight();
        // @ts-ignore
        playlightSDK = window.playlightSDK;
      } catch {
        return;
      }
    }
    if (playlightSDK && typeof playlightSDK.setDiscovery === "function") {
      markPlaylightDiscoveryUserInitiated();
      playlightSDK.setDiscovery();
    }
  };

  const socialLinkClass = `group ${FOOTER_CONTROL_BTN} flex items-center justify-center gap-1`;
  const socialIconClass = `${FOOTER_CONTROL_SVG_ICON_HOVER}${isPaused ? " !opacity-100" : ""}`;
  const showPauseSleepCallout = isPaused || idleModeDialogOpen;
  const feedbackButton = (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => openGameFeedbackForm("footer")}
      data-testid="button-footer-feedback"
      aria-label={tWithFallback(
        "ui",
        "footer.openFeedback",
        "Open feedback form",
      )}
      className={`${FOOTER_CONTROL_BTN} flex items-center gap-1`}
    >
      <GameUiIcon
        name="feedback"
        sizeClassName="game-tab-icon"
        className={FOOTER_CONTROL_ICON}
      />
      <span className={FOOTER_SOCIAL_LABEL}>
        {tWithFallback("ui", "footer.feedback", "Feedback")}
      </span>
    </Button>
  );
  const playlightButton = !steamEditionActive ? (
    <PlaylightDiscoveryButton
      onClick={handlePlaylightDiscovery}
      forceShowTooltip={showPauseSleepCallout}
      forceTooltipFadeDurationMs={1_000}
      tooltipSide="top"
    />
  ) : null;

  return (
    <>
      <footer className="relative flex min-h-9 items-center border-t border-border px-4 py-1 text-xs text-muted-foreground pointer-events-auto overflow-visible md:px-2">
        {steamDemoActive && <SteamDemoProgressBar />}
        <div className="relative z-10 flex w-full items-center justify-between">
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="xs"
              onClick={togglePause}
              button_id="footer-pause"
              data-testid="button-pause-game"
              disabled={idleModeDialogOpen}
              aria-label={
                isPaused ? t("footer.resumeGame") : t("footer.pauseGame")
              }
              className={`${FOOTER_CONTROL_BTN} ${idleModeDialogOpen ? "opacity-30 cursor-not-allowed" : ""} ${isPaused ? "!text-red-600 !opacity-100" : ""} ${isPaused && !idleModeDialogOpen ? "continue-pause-flash" : ""}`}
            >
              <GameUiIcon
                name={isPaused ? "unpause" : "pause"}
                sizeClassName="game-tab-icon"
                className={isPaused ? undefined : FOOTER_CONTROL_ICON}
              />
            </Button>

            {/* Shop is web-only (Stripe). Donate is web + Galaxy (external tip jar). */}
            {!steamEditionActive && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShopDialogOpen(true, "footer")}
                aria-label={t("footer.openShop")}
                className={`${FOOTER_CONTROL_BTN_BASE} hover:!text-yellow-500 flex items-center gap-1`}
                {...footerTraderHoverHandlers}
              >
                <span ref={footerTraderIconRef} className="inline-flex" aria-hidden>
                  <GameUiIcon
                    name="trader"
                    sizeClassName="game-tab-icon"
                    className="text-yellow-500 opacity-80 transition-[opacity,color] group-hover:opacity-100 group-hover:!text-yellow-500"
                  />
                </span>
                <span className={FOOTER_TRADER_TEXT}>
                  {t("footer.trader")}
                </span>
              </Button>
            )}
            {footerTraderParticlesPortal}
            {/* Full / playtest / web: left. Steam demo: right (clear of progress bar). */}
            {!steamDemoActive && playlightButton}
            {showFooterDonate && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleOfferTribute}
                onMouseEnter={triggerDonateHeartPump}
                button_id="footer-donate"
                aria-label={t("footer.supportGame")}
                className={`${FOOTER_CONTROL_BTN_BASE} hover:!text-red-600 flex items-center gap-1`}
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
                <span className={FOOTER_DONATE_TEXT}>
                  {t("footer.donate")}
                </span>
              </Button>
            )}
          </div>
          <div className="flex-1 flex justify-end gap-1 items-center">
            {steamDemoActive && playlightButton}
            {/* Steam edition hides the store link — keep Feedback in the right cluster. */}
            {(hideSteamStoreLink || hideFooterSteamAndSocial) && (
              <>
                {feedbackButton}
                {!hideFooterSteamAndSocial && (
                  <FooterNetworkMenu
                    iconClassName={FOOTER_CONTROL_ICON}
                    labelClassName={FOOTER_SOCIAL_LABEL}
                    referralCount={referralCount}
                  />
                )}
              </>
            )}
            {GAME_FOOTER_RIGHT_ICON_ORDER.map((platform) => {
              if (
                platform === "steam" &&
                (hideSteamStoreLink || hideFooterSteamAndSocial)
              ) {
                return null;
              }

              const { href: defaultHref, title } =
                GAME_FOOTER_RIGHT_ICON_LINKS[platform];
              const href =
                platform === "steam"
                  ? steamStoreUrl(STEAM_STORE_UTM_CONTENT.gameFooter)
                  : defaultHref;
              const linkLabel =
                platform === "contact"
                  ? tWithFallback("ui", "footer.contact", title)
                  : title;
              /** Steam keeps a desktop label; other inline icons stay icon-only. */
              const showSocialLabel = platform === "steam";
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
                  onClick={
                    platform === "steam" ? markFooterSteamClicked : undefined
                  }
                >
                  <FooterSocialIcon
                    platform={platform}
                    className={socialIconClass}
                  />
                  {showSocialLabel && (
                    <span className={FOOTER_SOCIAL_LABEL}>{linkLabel}</span>
                  )}
                </a>
              );

              if (platform === "steam") {
                return (
                  <div key={platform} className="contents">
                    {feedbackButton}
                    <FooterSteamWishlistCallout
                      href={href}
                      label={t("footer.wishlistOnSteam")}
                      forceShowTooltip={showPauseSleepCallout}
                      forceTooltipFadeDurationMs={1_000}
                    >
                      {socialLink}
                    </FooterSteamWishlistCallout>
                    <FooterNetworkMenu
                      iconClassName={FOOTER_CONTROL_ICON}
                      labelClassName={FOOTER_SOCIAL_LABEL}
                      referralCount={referralCount}
                    />
                  </div>
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
