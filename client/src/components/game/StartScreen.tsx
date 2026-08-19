import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import {
  GAME_FOOTER_RIGHT_ICON_LINKS,
  GAME_FOOTER_RIGHT_ICON_ORDER,
  STEAM_STORE_UTM_CONTENT,
  steamStoreUrl,
} from "@/lib/gameFooterSocialLinks";
import { openGameFeedbackForm } from "@/lib/gameFeedbackForm";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/useLocale";
import { OG_LOCALE_TAGS, SUPPORTED_LOCALES } from "@/i18n/locales";
import { GAME_CHROME_NO_BG_HOVER } from "@/components/game/gameChrome";
import { useFullscreen } from "@/hooks/useFullscreen";
import { clearStaleChunkReloadGuard } from "@/lib/hardReload";
import { mountFiraSansFontFace } from "@/lib/firaSansFontFace";
import { logger } from "@/lib/logger";
import { publicUrl } from "@/lib/publicUrl";
import type LanguageSelector from "@/components/game/LanguageSelector";
import type FooterNetworkMenu from "@/components/game/FooterNetworkMenu";
import type CrazyGamesCornerMenu from "@/components/game/CrazyGamesMenuLinks";
import {
  resolveDeferredStartMenuMount,
  shouldBlockDeferredStartMenuLoad,
  shouldRequestOpenOnInFlightLoad,
  type DeferredStartMenuLoadKind,
} from "@/components/game/startScreenDeferredMenu";

const START_INTRO_VAPORIZE_COLOR = "rgba(209, 213, 219, 0.9)";
const START_INTRO_VAPORIZE_ANIMATION = {
  vaporizeDuration: 1,
  fadeInDuration: 0.3,
  waitDuration: 0,
} as const;
const START_INTRO_VAPORIZE_FONT_FALLBACK = {
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontSize: "18px",
  fontWeight: 400,
} as const;

/** Easter egg: flash eyes at center of the upper-left screen quadrant. */
const EYES_EASTER_EGG_SRC = publicUrl("/images/eyes-easter-egg.png");
const EYES_EASTER_EGG_SOUND = publicUrl("/sounds/monster_start.mp3");
const EYES_EASTER_EGG_DURATION_MS = 250;
/** Defer asset fetch until well after LCP / lab SEO windows. */
const EYES_EASTER_EGG_ASSET_LOAD_MS = 90_000;
/** Hot-zone is armed only after this idle time on the start screen. */
const EYES_EASTER_EGG_ARM_MS = 120_000;
/** Hit radius as a fraction of min(viewport w, h) around the quadrant center. */
const EYES_EASTER_EGG_HOT_ZONE_RATIO = 0.08;

function isInUpperLeftQuadrantHotZone(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  // Four equal rectangles; hot spot is the middle of the upper-left one.
  const centerX = viewportWidth * 0.25;
  const centerY = viewportHeight * 0.25;
  const radius =
    Math.min(viewportWidth, viewportHeight) * EYES_EASTER_EGG_HOT_ZONE_RATIO;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  return dx * dx + dy * dy <= radius * radius;
}

const START_FOOTER_LINK_BASE =
  "inline-flex items-center gap-0 sm:gap-1 font-normal text-muted-foreground hover:text-foreground transition-opacity";
const START_FOOTER_SOCIAL_LINK = `${START_FOOTER_LINK_BASE} text-2xs sm:text-xs opacity-70 hover:opacity-100`;
const START_FOOTER_LEGAL_LINK = `${START_FOOTER_LINK_BASE} opacity-40 hover:opacity-100 text-3xs sm:text-2xs`;
/** Icon controls (language / music / sfx): same color/opacity as social text links; kill ghost Button accent hover. */
const START_FOOTER_ICON_BTN = `${START_FOOTER_SOCIAL_LINK} shrink-0 p-0 w-7 h-7 justify-center bg-transparent ${GAME_CHROME_NO_BG_HOVER} shadow-none`;
const START_FOOTER_ICON = "size-4 shrink-0";
/** Paint original PNG glyphs with currentColor (matches language + social text). */
const START_AUDIO_ICON_MASK = `${START_FOOTER_ICON} bg-current [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center] [mask-mode:alpha] [-webkit-mask-size:contain] [-webkit-mask-repeat:no-repeat] [-webkit-mask-position:center]`;
const START_FULLSCREEN_BTN = `group shrink-0 p-0 w-7 h-7 flex items-center justify-center ${GAME_CHROME_NO_BG_HOVER}`;

const MAKE_FIRE_BUTTON_CLASS =
  "bg-transparent border-none text-gray-300/90 hover:bg-transparent text-lg px-8 py-4 fire-hover z-[10000]";

function isNoindexStartPath(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path === "/galaxy" || path === "/crazygames" || path === "/boost";
}

type AudioModule = typeof import("@/lib/audio");
type ParticleButtonComponent =
  typeof import("@/components/ui/particle-button").ParticleButton;
type CloudShaderComponent =
  typeof import("@/components/ui/cloud-shader").default;
type VaporizeTextCycleComponent =
  typeof import("@/components/ui/vapour-text-effect").default;

function StartScreenFullscreenButton() {
  const { isFullscreen, toggleFullscreen, available } = useFullscreen();
  const { t } = useTranslation("ui");
  if (!available) return null;
  const label = isFullscreen
    ? t("profile.exitFullscreen", { defaultValue: "Exit full screen" })
    : t("profile.enterFullscreen", { defaultValue: "Full screen" });
  return (
    <button
      type="button"
      onClick={() => void toggleFullscreen()}
      aria-label={label}
      className={`${START_FULLSCREEN_BTN} group touch-manipulation bg-transparent text-neutral-300`}
      data-testid="button-toggle-fullscreen"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px] opacity-80"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        {isFullscreen ? (
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        ) : (
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        )}
      </svg>
    </button>
  );
}

function StartScreenGlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export interface StartScreenPreferences {
  cruelMode: boolean;
  musicMuted: boolean;
  sfxMuted: boolean;
  musicVolume: number;
  sfxVolume: number;
}

interface StartScreenProps {
  initialPreferences: StartScreenPreferences;
  steamEditionActive: boolean;
  steamDesktopEditionActive: boolean;
  crazyGamesEditionActive: boolean;
  hideSteamStoreLink: boolean;
  onMakeFireStart?: (preferences: StartScreenPreferences) => void;
  onMakeFire: (preferences: StartScreenPreferences) => void | Promise<void>;
}

export default function StartScreen({
  initialPreferences,
  steamEditionActive,
  steamDesktopEditionActive,
  crazyGamesEditionActive,
  hideSteamStoreLink,
  onMakeFireStart,
  onMakeFire,
}: StartScreenProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const executedRef = useRef(false);
  const isCruelMode = initialPreferences.cruelMode;
  const [musicMuted, setMusicMuted] = useState(initialPreferences.musicMuted);
  const [sfxMuted, setSfxMuted] = useState(initialPreferences.sfxMuted);
  const musicVolume = initialPreferences.musicVolume;
  const sfxVolume = initialPreferences.sfxVolume;
  const [showParticles, setShowParticles] = useState(false);
  const [buttonFadeInDone, setButtonFadeInDone] = useState(false);
  const buttonFadeRef = useRef<HTMLDivElement>(null);
  const [ParticleButtonCmp, setParticleButtonCmp] =
    useState<ParticleButtonComponent | null>(null);
  const [CloudShaderCmp, setCloudShaderCmp] =
    useState<CloudShaderComponent | null>(null);
  const [VaporizeTextCycleCmp, setVaporizeTextCycleCmp] =
    useState<VaporizeTextCycleComponent | null>(null);
  const audioRef = useRef<AudioModule | null>(null);
  const [LanguageSelectorCmp, setLanguageSelectorCmp] = useState<
    typeof LanguageSelector | null
  >(null);
  const [FooterNetworkMenuCmp, setFooterNetworkMenuCmp] = useState<
    typeof FooterNetworkMenu | null
  >(null);
  const [CrazyGamesCornerMenuCmp, setCrazyGamesCornerMenuCmp] = useState<
    typeof CrazyGamesCornerMenu | null
  >(null);
  const [languageDefaultOpen, setLanguageDefaultOpen] = useState(false);
  const [networkDefaultOpen, setNetworkDefaultOpen] = useState(false);
  const [crazyGamesDefaultOpen, setCrazyGamesDefaultOpen] = useState(false);
  const [startMenuEpoch, setStartMenuEpoch] = useState(0);
  const deferredMenuGenRef = useRef(0);
  const languageLoadInFlightRef = useRef(false);
  const networkLoadInFlightRef = useRef(false);
  const crazyGamesLoadInFlightRef = useRef(false);
  const languagePendingOpenRef = useRef(false);
  const networkPendingOpenRef = useRef(false);
  const crazyGamesPendingOpenRef = useRef(false);
  const [showEyesEasterEgg, setShowEyesEasterEgg] = useState(false);
  const eyesEasterEggInsideHotZoneRef = useRef(false);
  const eyesEasterEggConsumedRef = useRef(false);
  const eyesEasterEggAssetsReadyRef = useRef(false);
  const eyesEasterEggAssetsLoadingRef = useRef(false);
  const eyesEasterEggHideTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [introFadeInDone, setIntroFadeInDone] = useState(false);
  const [introVaporFont, setIntroVaporFont] = useState<{
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    letterSpacing?: string;
  }>(START_INTRO_VAPORIZE_FONT_FALLBACK);
  const introLineRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const introLineClipRefs = useRef<Array<HTMLElement | null>>([]);
  const { t } = useTranslation("ui");
  const { locale } = useLocale();
  // Steam Game / Playtest / Demo (build or DEV Game Mode) — no social/store links in footer.
  // Galaxy and Normal/web keep Steam / Reddit / Contact.
  const hideStartScreenSocialLinks = steamDesktopEditionActive;

  // Real content mounted — allow a future deploy's one-shot chunk retry again.
  useEffect(() => {
    clearStaleChunkReloadGuard();
  }, []);

  // Start screen only needs 400/500; unicode-range fetches just the scripts on screen
  // (e.g. EN ≈ latin-400 ~24KB). Full game weights mount later in gameplay init.
  useEffect(() => {
    mountFiraSansFontFace({ stage: "start", applyFontLoadedClass: true });
  }, []);

  useEffect(() => {
    if (showParticles) return;
    // Reset wipe clips if start screen is shown again.
    introLineClipRefs.current.forEach((el) => {
      if (el) el.style.clipPath = "";
    });
  }, [showParticles]);

  // Imperative clip updates avoid per-frame React re-renders (mobile layout jitter).
  const handleIntroVaporProgress = useCallback(
    (index: number, progress: number) => {
      const el = introLineClipRefs.current[index];
      if (!el) return;
      el.style.clipPath = `inset(0 0 0 ${progress}%)`;
    },
    [],
  );

  const audioPrefsRef = useRef({
    musicMuted,
    sfxMuted,
    musicVolume,
    sfxVolume,
  });
  audioPrefsRef.current = {
    musicMuted,
    sfxMuted,
    musicVolume,
    sfxVolume,
  };

  const applyAudioPrefs = useCallback((mod: AudioModule) => {
    const prefs = audioPrefsRef.current;
    mod.audioManager.setMusicVolume(prefs.musicVolume ?? 1);
    mod.audioManager.setSfxVolume(prefs.sfxVolume ?? 1);
    // Never resume BGM here. Start screen is wind-only until Make Fire.
    // (musicMute(false) would otherwise restart gameplay music after New Game.)
    mod.audioManager.musicMute(prefs.musicMuted, { resume: false });
    mod.audioManager.sfxMute(prefs.sfxMuted);
  }, []);

  // Howler / motion / shader stay off the first paint. Plain Make Fire is up first.
  useEffect(() => {
    let cancelled = false;
    void import("@/lib/audio").then((mod) => {
      if (cancelled) return;
      audioRef.current = mod;
      // New Game / sign-out can show this screen in-place without a reload.
      mod.audioManager.stopAllSounds();
      applyAudioPrefs(mod);
    });
    void import("@/components/ui/particle-button").then((mod) => {
      if (!cancelled) setParticleButtonCmp(() => mod.ParticleButton);
    });
    void import("@/components/ui/cloud-shader").then((mod) => {
      if (!cancelled) setCloudShaderCmp(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [applyAudioPrefs]);

  useEffect(() => {
    const mod = audioRef.current;
    if (mod) applyAudioPrefs(mod);
  }, [applyAudioPrefs, musicMuted, sfxMuted, musicVolume, sfxVolume]);

  useEffect(() => {
    // Wind plays as soon as the user shows intent (mousemove on desktop, touchstart on mobile).
    // Both events fire before the click event, so executedRef.current is still false
    // even when the user's first action is clicking "Make Fire".
    let cancelled = false;
    let handleInitialGesture: (() => void) | undefined;

    const attachGesture = (mod: AudioModule) => {
      if (cancelled) return;
      const playWind = () => {
        mod.audioManager.playLoopingSound(
          "wind",
          mod.SOUND_VOLUME.wind,
          false,
          1,
        );
      };

      handleInitialGesture = () => {
        if (!executedRef.current) {
          mod.audioManager.preloadMakeFireCue();
          playWind();
        }
        document.removeEventListener("mousemove", handleInitialGesture!);
        document.removeEventListener("touchstart", handleInitialGesture!);
      };
      document.addEventListener("mousemove", handleInitialGesture, {
        once: true,
      });
      document.addEventListener("touchstart", handleInitialGesture, {
        once: true,
      });
    };

    if (audioRef.current) {
      attachGesture(audioRef.current);
    } else {
      void import("@/lib/audio").then((mod) => {
        if (cancelled || executedRef.current) return;
        audioRef.current = mod;
        attachGesture(mod);
      });
    }

    return () => {
      cancelled = true;
      if (handleInitialGesture) {
        document.removeEventListener("mousemove", handleInitialGesture);
        document.removeEventListener("touchstart", handleInitialGesture);
      }
      audioRef.current?.audioManager.stopLoopingSound("wind", 2);
    };
  }, []);

  // Eyes easter egg (SEO-safe): no early network, listeners, or DOM until idle.
  // Assets load at 90s; hot-zone arms at 2 min; once per page load.
  useEffect(() => {
    let cancelled = false;
    let assetLoadTimer: ReturnType<typeof setTimeout> | null = null;
    let armTimer: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const stillOnStartScreen = () => !cancelled && !executedRef.current;

    const preloadEyesImage = (src: string): Promise<void> => {
      const preloadImg = new window.Image();
      preloadImg.decoding = "async";
      preloadImg.src = src;
      // decode() is preferred; fall back to load events when decode rejects
      // (already-complete / unsupported cases).
      return preloadImg.decode().catch(
        () =>
          new Promise<void>((resolve, reject) => {
            if (preloadImg.complete && preloadImg.naturalWidth > 0) {
              resolve();
              return;
            }
            preloadImg.onload = () => resolve();
            preloadImg.onerror = () =>
              reject(new Error(`Failed to load eyes image: ${src}`));
          }),
      );
    };

    const loadEyesAssets = async () => {
      if (
        !stillOnStartScreen() ||
        eyesEasterEggAssetsReadyRef.current ||
        eyesEasterEggAssetsLoadingRef.current
      ) {
        return;
      }
      eyesEasterEggAssetsLoadingRef.current = true;

      try {
        // Prefetch off the critical path; wait until both assets are actually ready.
        const audio = audioRef.current ?? (await import("@/lib/audio"));
        audioRef.current = audio;
        await Promise.all([
          audio.audioManager.loadSound("monsterStart", EYES_EASTER_EGG_SOUND),
          preloadEyesImage(EYES_EASTER_EGG_SRC),
        ]);
        if (stillOnStartScreen()) {
          eyesEasterEggAssetsReadyRef.current = true;
        }
      } catch (error) {
        eyesEasterEggAssetsLoadingRef.current = false;
        logger.warn("Eyes easter egg assets failed to load:", error);
      }
    };

    const scheduleAssetLoad = () => {
      if (!stillOnStartScreen()) return;
      const ric = window.requestIdleCallback;
      if (typeof ric === "function") {
        idleCallbackId = ric(
          () => {
            idleCallbackId = null;
            void loadEyesAssets();
          },
          { timeout: 5_000 },
        );
      } else {
        void loadEyesAssets();
      }
    };

    const triggerEyesFlash = () => {
      eyesEasterEggConsumedRef.current = true;
      window.removeEventListener("mousemove", handlePointerMove);
      setShowEyesEasterEgg(true);
      const audio = audioRef.current;
      if (audio) {
        audio.audioManager.playSound(
          "monsterStart",
          audio.SOUND_VOLUME.monsterStart,
        );
      }
      if (eyesEasterEggHideTimeoutRef.current) {
        clearTimeout(eyesEasterEggHideTimeoutRef.current);
      }
      eyesEasterEggHideTimeoutRef.current = setTimeout(() => {
        setShowEyesEasterEgg(false);
        eyesEasterEggHideTimeoutRef.current = null;
      }, EYES_EASTER_EGG_DURATION_MS);
    };

    const handlePointerMove = (event: MouseEvent) => {
      const inHotZone = isInUpperLeftQuadrantHotZone(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );

      // Always track hot-zone occupancy so a later "assets ready" state does not
      // look like a fresh enter while the pointer was already inside.
      if (
        executedRef.current ||
        eyesEasterEggConsumedRef.current ||
        !eyesEasterEggAssetsReadyRef.current
      ) {
        eyesEasterEggInsideHotZoneRef.current = inHotZone;
        return;
      }

      if (inHotZone && !eyesEasterEggInsideHotZoneRef.current) {
        triggerEyesFlash();
      }
      eyesEasterEggInsideHotZoneRef.current = inHotZone;
    };

    const armHotZone = () => {
      if (!stillOnStartScreen() || eyesEasterEggConsumedRef.current) return;
      window.addEventListener("mousemove", handlePointerMove);
    };

    assetLoadTimer = setTimeout(
      scheduleAssetLoad,
      EYES_EASTER_EGG_ASSET_LOAD_MS,
    );
    armTimer = setTimeout(armHotZone, EYES_EASTER_EGG_ARM_MS);

    return () => {
      cancelled = true;
      if (assetLoadTimer) clearTimeout(assetLoadTimer);
      if (armTimer) clearTimeout(armTimer);
      if (
        idleCallbackId !== null &&
        typeof window.cancelIdleCallback === "function"
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
      window.removeEventListener("mousemove", handlePointerMove);
      if (eyesEasterEggHideTimeoutRef.current) {
        clearTimeout(eyesEasterEggHideTimeoutRef.current);
        eyesEasterEggHideTimeoutRef.current = null;
      }
    };
  }, []);

  // Keep fade-in off React className after it finishes. Re-applying the class
  // on any re-render restarts the blur (and pointer-events: none on the button).
  useEffect(() => {
    if (buttonFadeInDone) return;
    const wrap = buttonFadeRef.current;
    const markDone = (event?: AnimationEvent) => {
      if (event?.animationName && event.animationName !== "fade-in-button") {
        return;
      }
      setButtonFadeInDone(true);
    };
    wrap?.addEventListener("animationend", markDone);
    const fallbackId = window.setTimeout(markDone, 2600);
    return () => {
      wrap?.removeEventListener("animationend", markDone);
      window.clearTimeout(fallbackId);
    };
  }, [buttonFadeInDone]);

  // Drop intro fade-in class after it finishes so Make Fire does not restart
  // the blur (filter containing-block) or look like the three lines replayed.
  useEffect(() => {
    if (introFadeInDone) return;
    const firstLine = introLineRefs.current[0]?.parentElement;
    const handleIntroAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== "fade-in-text") return;
      setIntroFadeInDone(true);
    };
    firstLine?.addEventListener("animationend", handleIntroAnimationEnd);
    const fallbackId = window.setTimeout(() => setIntroFadeInDone(true), 1100);
    return () => {
      firstLine?.removeEventListener("animationend", handleIntroAnimationEnd);
      window.clearTimeout(fallbackId);
    };
  }, [introFadeInDone]);

  const handleMakeFire = () => {
    if (executedRef.current) return;
    executedRef.current = true;

    // Match canvas type to the live DOM line (includes --adc-text-scale).
    const sampleLine = introLineRefs.current.find(Boolean);
    if (sampleLine) {
      const style = window.getComputedStyle(sampleLine);
      setIntroVaporFont({
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: parseInt(style.fontWeight, 10) || 400,
        letterSpacing: style.letterSpacing,
      });
    }

    const playMakeFireAudio = (mod: AudioModule) => {
      // Fire one-shot first so it is not delayed by the wind fade setup.
      mod.audioManager.playSound("makeFire", mod.SOUND_VOLUME.makeFire);
      mod.audioManager.stopLoopingSound("wind", 1);

      // After Make Fire one-shot: load core pack (BGM + early cave), start music,
      // then deferred sounds continue in the background.
      window.setTimeout(() => {
        void mod.audioManager.loadGameSounds().then(() => {
          if (!musicMuted) {
            void mod.audioManager.startBackgroundMusic();
          }
        });
      }, 200);
    };
    if (audioRef.current) {
      playMakeFireAudio(audioRef.current);
    } else {
      void import("@/lib/audio").then((mod) => {
        audioRef.current = mod;
        playMakeFireAudio(mod);
      });
    }

    if (!VaporizeTextCycleCmp) {
      void import("@/components/ui/vapour-text-effect").then((mod) => {
        setVaporizeTextCycleCmp(() => mod.default);
      });
    }
    if (!ParticleButtonCmp) {
      void import("@/components/ui/particle-button").then((mod) => {
        setParticleButtonCmp(() => mod.ParticleButton);
      });
    }

    const preferences = {
      cruelMode: isCruelMode,
      musicMuted,
      sfxMuted,
      musicVolume,
      sfxVolume,
    };
    onMakeFireStart?.(preferences);

    deferredMenuGenRef.current += 1;
    languagePendingOpenRef.current = false;
    networkPendingOpenRef.current = false;
    crazyGamesPendingOpenRef.current = false;
    setLanguageDefaultOpen(false);
    setNetworkDefaultOpen(false);
    setCrazyGamesDefaultOpen(false);
    setStartMenuEpoch((epoch) => epoch + 1);

    // Show button effect for 3 seconds on both mobile and desktop
    setShowParticles(true);
    setTimeout(() => {
      void onMakeFire(preferences);
    }, 3000);
  };

  const toggleMusic = () => {
    const next = !musicMuted;
    setMusicMuted(next);
    // Start screen must not start BGM on unmute; Make Fire starts it explicitly.
    audioRef.current?.audioManager.musicMute(next, { resume: false });
  };

  const toggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    const audio = audioRef.current;
    if (!audio) return;
    audio.audioManager.sfxMute(next);
    if (!next && !executedRef.current) {
      audio.audioManager.preloadMakeFireCue();
      audio.audioManager.playLoopingSound(
        "wind",
        audio.SOUND_VOLUME.wind,
        false,
        1,
      );
    }
  };

  const finishDeferredMenuLoad = <T,>(
    requestGen: number,
    setCmp: (component: T) => void,
    setDefaultOpen: (open: boolean) => void,
    pendingOpenRef: { current: boolean },
    component: T,
  ) => {
    const { apply, open } = resolveDeferredStartMenuMount(
      executedRef.current,
      requestGen,
      deferredMenuGenRef.current,
      pendingOpenRef.current,
    );
    pendingOpenRef.current = false;
    if (!apply) return;
    setCmp(component);
    setDefaultOpen(open);
  };

  const queueDeferredMenuImport = <T,>(
    alreadyLoaded: T | null,
    inFlightRef: { current: boolean },
    pendingOpenRef: { current: boolean },
    kind: DeferredStartMenuLoadKind,
    importer: () => Promise<{ default: T }>,
    setCmp: (component: T) => void,
    setDefaultOpen: (open: boolean) => void,
  ) => {
    const loaded = Boolean(alreadyLoaded);
    if (
      shouldRequestOpenOnInFlightLoad(loaded, inFlightRef.current) &&
      kind === "open"
    ) {
      pendingOpenRef.current = true;
      return;
    }
    if (shouldBlockDeferredStartMenuLoad(loaded, inFlightRef.current)) {
      return;
    }
    pendingOpenRef.current = kind === "open";
    inFlightRef.current = true;
    const requestGen = ++deferredMenuGenRef.current;
    void importer()
      .then((mod) => {
        finishDeferredMenuLoad(
          requestGen,
          setCmp,
          setDefaultOpen,
          pendingOpenRef,
          mod.default,
        );
      })
      .catch((error: unknown) => {
        logger.error("Failed to load start-screen menu", error);
      })
      .finally(() => {
        // Stale/Make Fire skips must not latch this guard, or the placeholder dies.
        inFlightRef.current = false;
      });
  };

  const loadLanguageSelector = (kind: DeferredStartMenuLoadKind) => {
    queueDeferredMenuImport(
      LanguageSelectorCmp,
      languageLoadInFlightRef,
      languagePendingOpenRef,
      kind,
      () => import("@/components/game/LanguageSelector"),
      (component) => setLanguageSelectorCmp(() => component),
      setLanguageDefaultOpen,
    );
  };

  const loadFooterNetworkMenu = (kind: DeferredStartMenuLoadKind) => {
    queueDeferredMenuImport(
      FooterNetworkMenuCmp,
      networkLoadInFlightRef,
      networkPendingOpenRef,
      kind,
      () => import("@/components/game/FooterNetworkMenu"),
      (component) => setFooterNetworkMenuCmp(() => component),
      setNetworkDefaultOpen,
    );
  };

  const loadCrazyGamesCornerMenu = (kind: DeferredStartMenuLoadKind) => {
    queueDeferredMenuImport(
      CrazyGamesCornerMenuCmp,
      crazyGamesLoadInFlightRef,
      crazyGamesPendingOpenRef,
      kind,
      () => import("@/components/game/CrazyGamesMenuLinks"),
      (component) => setCrazyGamesCornerMenuCmp(() => component),
      setCrazyGamesDefaultOpen,
    );
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
        {isNoindexStartPath() && (
          <meta name="robots" content="noindex, follow" />
        )}
      </Helmet>
      {!steamEditionActive && (
        <div className="absolute bottom-12 right-4 z-20 animate-fade-in-featured">
          <div className="bg-white/25 backdrop-blur-sm rounded-lg px-2 pt-2 pb-2.5 border border-white/25 flex flex-col items-end">
            <p className="text-xs text-gray-300/80 font-medium">
              {t("startScreen.recommendedBy")}
            </p>
            <img
              src={publicUrl("/the_hustle_logo.svg")}
              alt="The Hustle"
              width={116}
              height={40}
              className="h-8 md:h-10 w-auto opacity-100"
            />
          </div>
        </div>
      )}

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

        /* Opacity stays 1 so LCP can fire on first paint; only un-blur for atmosphere. */
        @keyframes fade-in-text {
          0% { filter: blur(10px); }
          100% { filter: blur(0px); }
        }

        .animate-fade-in-text {
          animation: fade-in-text 1s ease-in forwards;
          opacity: 1;
          filter: blur(10px);
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

      {CloudShaderCmp ? <CloudShaderCmp /> : null}

      {showEyesEasterEgg && (
        <img
          src={EYES_EASTER_EGG_SRC}
          alt=""
          aria-hidden
          draggable={false}
          decoding="async"
          fetchPriority="low"
          className="pointer-events-none absolute z-30 w-[min(14vw,110px)] h-auto select-none opacity-50"
          style={{
            left: "25%",
            top: "25%",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {(steamEditionActive || crazyGamesEditionActive) && (
        <div className="absolute top-2 right-2 z-20">
          {crazyGamesEditionActive ? (
            CrazyGamesCornerMenuCmp ? (
              <CrazyGamesCornerMenuCmp
                key={startMenuEpoch}
                steamUtmContent={STEAM_STORE_UTM_CONTENT.startScreenMenu}
                defaultOpen={crazyGamesDefaultOpen}
              />
            ) : (
              <button
                type="button"
                onPointerEnter={() => loadCrazyGamesCornerMenu("prefetch")}
                onFocus={() => loadCrazyGamesCornerMenu("prefetch")}
                onClick={() => loadCrazyGamesCornerMenu("open")}
                aria-label={t("profile.title", { defaultValue: "Menu" })}
                data-testid="button-crazygames-corner-menu"
                className={`${START_FULLSCREEN_BTN} group touch-manipulation bg-transparent text-neutral-300`}
              >
                <GameUiIcon
                  name="menu"
                  sizeClassName="game-header-accent-icon"
                  className="text-neutral-300 opacity-80"
                />
              </button>
            )
          ) : (
            <StartScreenFullscreenButton />
          )}
        </div>
      )}

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-4 w-full max-w-xl px-4">
          {(isCruelMode
            ? [
              t("startScreen.titleCruel", { defaultValue: "A very dark cave." }),
              t("startScreen.airCruel", {
                defaultValue: "The air is freezing and damp.",
              }),
              t("startScreen.seeCruel", {
                defaultValue: "You barely see anything around you.",
              }),
            ]
            : [
              t("startScreen.titleNormal", { defaultValue: "A dark cave." }),
              t("startScreen.airNormal", {
                defaultValue: "The air is cold and damp.",
              }),
              t("startScreen.seeNormal", {
                defaultValue: "You barely see the shapes around you.",
              }),
            ]
          ).map((line, index) => {
            const LineTag = index === 0 ? "h1" : "p";
            return (
              <div
                key={`${index}-${line}`}
                className="relative mx-auto w-fit text-lg leading-relaxed text-gray-300/90 font-normal"
              >
                {showParticles && VaporizeTextCycleCmp && (
                  <div className="pointer-events-none absolute inset-0 z-10">
                    <VaporizeTextCycleCmp
                      texts={[line]}
                      loop={false}
                      play={showParticles}
                      overlayParticlesOnly
                      matchSource={introLineRefs.current[index]}
                      onProgress={(progress) =>
                        handleIntroVaporProgress(index, progress)
                      }
                      font={introVaporFont}
                      color={START_INTRO_VAPORIZE_COLOR}
                      spread={10}
                      density={5}
                      animation={START_INTRO_VAPORIZE_ANIMATION}
                      direction="left-to-right"
                      alignment="left"
                      tag={index === 0 ? "h1" : "p"}
                    />
                  </div>
                )}
                <LineTag
                  ref={(
                    el: HTMLHeadingElement | HTMLParagraphElement | null,
                  ) => {
                    introLineClipRefs.current[index] = el;
                  }}
                  className={`relative z-0 m-0 text-lg leading-relaxed font-normal ${introFadeInDone ? "" : "animate-fade-in-text"
                    }`}
                >
                  <span
                    ref={(el) => {
                      introLineRefs.current[index] = el;
                    }}
                  >
                    {line}
                  </span>
                </LineTag>
              </div>
            );
          })}
        </div>

        <div className={showParticles ? undefined : "fire-glow-hint"}>
          <div
            ref={buttonFadeRef}
            className={
              showParticles || buttonFadeInDone
                ? undefined
                : "animate-fade-in-button"
            }
          >
            {ParticleButtonCmp ? (
              <ParticleButtonCmp
                ref={buttonRef}
                onClick={handleMakeFire}
                autoStart={showParticles}
                className={`${MAKE_FIRE_BUTTON_CLASS} ${showParticles ? "fire-active" : ""}`}
                data-testid="button-make-fire"
              >
                {t("startScreen.makeFire", { defaultValue: "Make Fire" })}
              </ParticleButtonCmp>
            ) : (
              <Button
                ref={buttonRef}
                onClick={handleMakeFire}
                className={MAKE_FIRE_BUTTON_CLASS}
                data-testid="button-make-fire"
              >
                {t("startScreen.makeFire", { defaultValue: "Make Fire" })}
              </Button>
            )}
          </div>
        </div>
      </main>

      <nav
        className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-2xs sm:text-xs text-muted-foreground"
        aria-label="Site links"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {LanguageSelectorCmp ? (
            <LanguageSelectorCmp
              key={startMenuEpoch}
              buttonClassName={START_FOOTER_ICON_BTN}
              iconClassName={START_FOOTER_ICON}
              iconVariant="globe"
              menuAlign="start"
              showTooltip={false}
              defaultOpen={languageDefaultOpen}
            />
          ) : (
            <button
              type="button"
              onPointerEnter={() => loadLanguageSelector("prefetch")}
              onFocus={() => loadLanguageSelector("prefetch")}
              onClick={() => loadLanguageSelector("open")}
              className={START_FOOTER_ICON_BTN}
              aria-label={t("languageSelector.ariaLabel")}
            >
              <StartScreenGlobeIcon className={START_FOOTER_ICON} />
            </button>
          )}
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleMusic}
            data-testid="button-start-toggle-music"
            className={START_FOOTER_ICON_BTN}
            aria-label={
              musicMuted ? t("footer.unmuteMusic") : t("footer.muteMusic")
            }
          >
            <span
              aria-hidden
              className={START_AUDIO_ICON_MASK}
              style={{
                maskImage: `url(${publicUrl(musicMuted ? "/music_off.png" : "/music_on.png")})`,
                WebkitMaskImage: `url(${publicUrl(musicMuted ? "/music_off.png" : "/music_on.png")})`,
              }}
            />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleSfx}
            data-testid="button-start-toggle-sfx"
            className={START_FOOTER_ICON_BTN}
            aria-label={sfxMuted ? t("footer.unmuteSfx") : t("footer.muteSfx")}
          >
            <span
              aria-hidden
              className={START_AUDIO_ICON_MASK}
              style={{
                maskImage: `url(${publicUrl(sfxMuted ? "/sound_off.png" : "/sound_on.png")})`,
                WebkitMaskImage: `url(${publicUrl(sfxMuted ? "/sound_off.png" : "/sound_on.png")})`,
              }}
            />
          </Button>
        </div>
        <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1.5">
          {steamDesktopEditionActive && (
            <button
              type="button"
              onClick={() => openGameFeedbackForm("footer")}
              data-testid="button-start-footer-feedback"
              className={START_FOOTER_SOCIAL_LINK}
              aria-label={t("footer.openFeedback", {
                defaultValue: "Open feedback form",
              })}
            >
              <GameUiIcon
                name="feedback"
                sizeClassName="w-3.5 h-3.5"
                className="shrink-0 opacity-100"
              />
              <span className="sr-only sm:not-sr-only sm:inline">
                {t("footer.feedback", { defaultValue: "Feedback" })}
              </span>
            </button>
          )}
          {!hideSteamStoreLink &&
            !crazyGamesEditionActive &&
            GAME_FOOTER_RIGHT_ICON_ORDER.map((platform) => {
              const { href: defaultHref, title } =
                GAME_FOOTER_RIGHT_ICON_LINKS[platform];
              const href =
                platform === "steam"
                  ? steamStoreUrl(STEAM_STORE_UTM_CONTENT.startScreenFooter)
                  : defaultHref;
              const linkLabel =
                platform === "contact"
                  ? t("footer.contact", { defaultValue: title })
                  : title;
              /** Steam keeps a desktop label. */
              const showSocialLabel = platform === "steam";
              const linkContent = (
                <>
                  <FooterSocialIcon
                    platform={platform}
                    className="w-3.5 h-3.5 shrink-0"
                  />
                  {showSocialLabel ? (
                    <span className="sr-only sm:not-sr-only sm:inline">
                      {linkLabel}
                    </span>
                  ) : (
                    <span className="sr-only">{linkLabel}</span>
                  )}
                </>
              );
              return href.startsWith("http") ? (
                <a
                  key={platform}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className={START_FOOTER_SOCIAL_LINK}
                  aria-label={linkLabel}
                >
                  {linkContent}
                </a>
              ) : (
                <a
                  key={platform}
                  href={href}
                  className={START_FOOTER_SOCIAL_LINK}
                  aria-label={linkLabel}
                >
                  {linkContent}
                </a>
              );
            })}
          {!hideStartScreenSocialLinks &&
            (FooterNetworkMenuCmp ? (
              <FooterNetworkMenuCmp
                key={startMenuEpoch}
                side="top"
                align="end"
                unstyledTrigger
                triggerClassName={START_FOOTER_SOCIAL_LINK}
                iconClassName="opacity-100"
                iconSizeClassName="w-3.5 h-3.5"
                labelClassName="sr-only sm:not-sr-only sm:inline"
                defaultOpen={networkDefaultOpen}
              />
            ) : (
              <button
                type="button"
                onPointerEnter={() => loadFooterNetworkMenu("prefetch")}
                onFocus={() => loadFooterNetworkMenu("prefetch")}
                onClick={() => loadFooterNetworkMenu("open")}
                data-testid="button-footer-social"
                className={START_FOOTER_SOCIAL_LINK}
                aria-label={t("footer.social", { defaultValue: "Social" })}
              >
                <GameUiIcon
                  name="network"
                  sizeClassName="w-3.5 h-3.5"
                  className="opacity-100"
                />
                <span className="sr-only sm:not-sr-only sm:inline">
                  {t("footer.social", { defaultValue: "Social" })}
                </span>
              </button>
            ))}
          {!steamEditionActive && (
            <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-x-3">
              {!crazyGamesEditionActive && (
                <>
                  <a
                    href="/faq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={START_FOOTER_LEGAL_LINK}
                  >
                    {t("footer.faq")}
                  </a>
                  <a
                    href="/about"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={START_FOOTER_LEGAL_LINK}
                  >
                    {t("footer.about")}
                  </a>
                </>
              )}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={START_FOOTER_LEGAL_LINK}
              >
                {t("footer.privacy")}
              </a>
              <a
                href="/imprint"
                target="_blank"
                rel="noopener noreferrer"
                className={START_FOOTER_LEGAL_LINK}
              >
                {t("footer.imprint")}
              </a>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
