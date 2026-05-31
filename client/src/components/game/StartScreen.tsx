import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ParticleButton } from "@/components/ui/particle-button";
import { useGameStore } from "@/game/state";
import CloudShader from "@/components/ui/cloud-shader";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import LanguageSelector from "@/components/game/LanguageSelector";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
} from "@/lib/gameFooterSocialLinks";
import { useTranslation } from "react-i18next";
import { tWithFallback } from "@/i18n/resolveGameText";
import { useLocale } from "@/i18n/useLocale";
import { OG_LOCALE_TAGS, SUPPORTED_LOCALES } from "@/i18n/locales";

const START_FOOTER_LINK =
  "inline-flex items-center gap-0 sm:gap-1 hover:text-foreground transition-colors opacity-40 hover:opacity-100";
const START_FOOTER_LEGAL_LINK =
  `${START_FOOTER_LINK} text-[9px] sm:text-[10px]`;
const START_FOOTER_LANGUAGE_BTN =
  `${START_FOOTER_LINK} p-0 h-auto min-h-0`;
export default function StartScreen() {
  const { executeAction, setBoostMode, boostMode, cruelMode } = useGameStore();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const executedRef = useRef(false);
  const isCruelMode = cruelMode;
  const [showParticles, setShowParticles] = useState(false);
  const { t } = useTranslation("ui");
  const { locale } = useLocale();

  useEffect(() => {
    const isBoostPath = window.location.pathname.includes("/boost");
    if (isBoostPath) {
      setBoostMode(true);
      window.history.replaceState({}, "", "/");
    }

    // Wind plays as soon as the user shows intent (mousemove on desktop, touchstart on mobile).
    // Both events fire before the click event, so executedRef.current is still false
    // even when the user's first action is clicking "Light Fire".
    const playWind = () => {
      audioManager.playLoopingSound("wind", SOUND_VOLUME.wind, false, 1);
    };

    const handleInitialGesture = () => {
      if (!executedRef.current) {
        playWind();
      }
      document.removeEventListener("mousemove", handleInitialGesture);
      document.removeEventListener("touchstart", handleInitialGesture);
    };
    document.addEventListener("mousemove", handleInitialGesture, { once: true });
    document.addEventListener("touchstart", handleInitialGesture, { once: true });

    return () => {
      audioManager.stopLoopingSound("wind", 2);
      document.removeEventListener("mousemove", handleInitialGesture);
      document.removeEventListener("touchstart", handleInitialGesture);
    };
  }, [setBoostMode]);

  // ✅ Remove animation class after it finishes once
  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const handleAnimationEnd = () => {
      btn.classList.remove("animate-fade-in-button");
    };

    btn.addEventListener("animationend", handleAnimationEnd);
    return () => btn.removeEventListener("animationend", handleAnimationEnd);
  }, []);

  const handleLightFire = () => {
    if (executedRef.current) return;
    executedRef.current = true;

    // Preload font dynamically (lazy-loaded for better Lighthouse scores)
    // Don't apply font-loaded class here - the Game component will apply it
    // when it mounts, avoiding a jarring font swap on the start screen.
    if (!document.getElementById('inter-font-face')) {
      const style = document.createElement('style');
      style.id = 'inter-font-face';
      style.textContent = `
        @font-face {
          font-family: 'Inter';
          src: url('/fonts/inter.woff2') format('woff2');
          font-weight: 100 900;
          font-style: normal;
          font-display: swap;
        }
      `;
      document.head.appendChild(style);
    }

    // Preload the font so it's cached and ready when the Game component applies it
    if ('fonts' in document) {
      const interFont = new FontFace('Inter', 'url(/fonts/inter.woff2)', {
        weight: '100 900',
        style: 'normal',
        display: 'swap',
      });

      interFont.load().then(() => {
        document.fonts.add(interFont);
      }).catch(() => { });
    }

    // Immediately stop wind with no fade to prevent overlap
    audioManager.stopLoopingSound("wind", 2);

    audioManager.playSound("lightFire", SOUND_VOLUME.lightFire);

    audioManager.loadGameSounds().then(() => {
      if (!useGameStore.getState().musicMuted) {
        audioManager.startBackgroundMusic();
      }
    });

    // Show button effect for 3 seconds on both mobile and desktop
    setShowParticles(true);
    setTimeout(async () => {
      // Ensure game loop is running (may have been stopped by sign out)
      const { startGameLoop } = await import("@/game/loop");
      startGameLoop();
      executeAction("lightFire");
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <Helmet>
        <title>{t("seo.title")}</title>
        <meta name="description" content={t("seo.description")} />
        <meta property="og:title" content={t("seo.title")} />
        <meta property="og:description" content={t("seo.description")} />
        <meta property="og:locale" content={OG_LOCALE_TAGS[locale]} />
        {SUPPORTED_LOCALES.filter((code) => code !== locale).map((code) => (
          <meta
            key={code}
            property="og:locale:alternate"
            content={OG_LOCALE_TAGS[code]}
          />
        ))}
        <link rel="canonical" href="https://a-dark-cave.com/" />
      </Helmet>
      {/* Featured By Section */}
      <div className="absolute bottom-12 right-4 z-20 animate-fade-in-featured">
        <div className="bg-white/25 backdrop-blur-sm rounded-lg px-2 pt-2 pb-2.5 border border-white/25 flex flex-col items-end">
          <p className="text-xs text-gray-300/80 font-medium">{t("startScreen.recommendedBy")}</p>
          <img
            src="/the_hustle_logo.svg"
            alt="The Hustle"
            width={116}
            height={40}
            className="h-8 md:h-10 w-auto opacity-100"
          />
        </div>
      </div>

      <style>{`
        @keyframes fade-in-button {
          0% {
            opacity: 0;
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
          }
        }

        .animate-fade-in-button {
          animation: fade-in-button 1s ease-in 1.5s forwards;
          opacity: 0;
          pointer-events: none;
        }

        @keyframes fade-in-text {
          0% { opacity: 0; filter: blur(10px); }
          100% { opacity: 1; filter: blur(0px); }
        }

        .animate-fade-in-text {
          animation: fade-in-text 1s ease-in 0.5s forwards;
          opacity: 0;
        }

        @keyframes fade-in-featured {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate-fade-in-featured {
          animation: fade-in-featured 3s ease-in 6s forwards;
          opacity: 0;
        }

        @keyframes fire-glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 0 transparent);
          }
          50% {
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.45))
                    drop-shadow(0 0 14px rgba(255, 255, 255, 0.2));
          }
        }

        .fire-glow-hint {
          animation: fire-glow-pulse 2.5s ease-in-out 8.5s infinite;
        }
      `}</style>

      <CloudShader />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-4">
          <h1 className="animate-fade-in-text text-lg text-gray-300/90 leading-relaxed font-normal">
            {isCruelMode ? t("startScreen.titleCruel") : t("startScreen.titleNormal")}
          </h1>
          <p className="animate-fade-in-text text-lg text-gray-300/90 leading-relaxed">
            {isCruelMode
              ? t("startScreen.airCruel")
              : t("startScreen.airNormal")}
            <br />
            {isCruelMode
              ? t("startScreen.seeCruel")
              : t("startScreen.seeNormal")}
          </p>
        </div>

        <div className={showParticles ? undefined : "fire-glow-hint"}>
          <ParticleButton
            ref={buttonRef}
            onClick={handleLightFire}
            autoStart={showParticles}
            className={`bg-transparent border-none text-gray-300/90 hover:bg-transparent text-lg px-8 py-4 fire-hover z-[10000] ${showParticles ? "fire-active" : "animate-fade-in-button"}`}
            data-testid="button-light-fire"
            button_id="light-fire"
          >
            {t("startScreen.makeFire")}
          </ParticleButton>
        </div>
      </main>

      {boostMode && (
        <TooltipWrapper
          tooltip={
            <div className="text-xs whitespace-nowrap">
              {t("startScreen.boostDeactivate")}
            </div>
          }
          tooltipId="boost-indicator"
          disabled={false}
          onClick={() => {
            setBoostMode(false);
          }}
        >
          <div className="absolute bottom-4 right-4 z-20 cursor-pointer">
            <div className="text-green-600 text-xl">↑</div>
          </div>
        </TooltipWrapper>
      )}

      <nav
        className={`absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-muted-foreground ${boostMode ? "pr-8 sm:pr-10" : ""}`}
        aria-label="Site links"
      >
        <LanguageSelector
          buttonClassName={START_FOOTER_LANGUAGE_BTN}
          iconClassName="w-3.5 h-3.5 shrink-0"
          menuAlign="start"
          showTooltip={false}
          showInlineLabel
        />
        <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1.5">
          {GAME_FOOTER_RIGHT_ICON_ORDER.map((platform) => {
            const { href, title } = GAME_FOOTER_RIGHT_ICON_LINKS[platform];
            const linkLabel =
              platform === "contact"
                ? tWithFallback("ui", "footer.contact", title)
                : title;
            const linkContent = (
              <>
                <FooterSocialIcon
                  platform={platform}
                  className="w-3.5 h-3.5 shrink-0"
                />
                <span className="sr-only sm:not-sr-only sm:inline">
                  {linkLabel}
                </span>
              </>
            );
            return href.startsWith("http") ? (
              <a
                key={platform}
                href={href}
                target="_blank"
                rel="noopener noreferrer me"
                className={START_FOOTER_LINK}
                aria-label={linkLabel}
              >
                {linkContent}
              </a>
            ) : (
              <a
                key={platform}
                href={href}
                className={START_FOOTER_LINK}
                aria-label={linkLabel}
              >
                {linkContent}
              </a>
            );
          })}
          <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-x-3">
            <a href="/privacy" className={START_FOOTER_LEGAL_LINK}>
              {t("footer.privacy")}
            </a>
            <a href="/imprint" className={START_FOOTER_LEGAL_LINK}>
              {t("footer.imprint")}
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
