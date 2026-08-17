import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Hero from "@/components/ui/animated-shader-hero";
import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import { useGameStore } from "@/game/state";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { isSteamBuild } from "@/lib/edition";
import {
  useSteamDesktopEditionActive,
  useSteamEditionActive,
} from "@/hooks/useSteamEditionActive";
import { logger } from "@/lib/logger";
import { openGameFeedbackForm } from "@/lib/gameFeedbackForm";
import { navigateSpa } from "@/lib/spaNavigate";
import { ITCH_URL } from "@shared/publicPages";

export default function EndScreenPage() {
  const { t } = useUiTranslation();
  const steamEditionActive = useSteamEditionActive();
  const steamDesktopEditionActive = useSteamDesktopEditionActive();
  const [isCruelModeRun, setIsCruelModeRun] = useState<boolean | null>(null);

  useEffect(() => {
    mountNotoSansSymbols2FontFace();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await Promise.all([
          ensureGameplayLocalesLoaded(),
          useGameStore.getState().loadGame(),
        ]);
        setIsCruelModeRun(Boolean(useGameStore.getState().cruelMode));
      } catch {
        setIsCruelModeRun(false);
      }
    })();
  }, []);

  const isCruelModeCompletion = isCruelModeRun === true;

  const handleMainMenu = async () => {
    navigateSpa("/");
  };

  const handleCruelMode = async () => {
    if (isSteamBuild || steamEditionActive) {
      try {
        const store = useGameStore.getState();
        useGameStore.setState({
          activatedPurchases: {
            ...store.activatedPurchases,
            cruel_mode: true,
          },
        });
        await useGameStore.getState().restartGame();
        const { saveGame } = await import("@/game/save");
        await saveGame(useGameStore.getState(), false);
      } catch (error) {
        logger.error("[END SCREEN] Failed to start Cruel Mode:", error);
      }
      navigateSpa("/?game=true");
      return;
    }
    navigateSpa("/?game=true&openShop=true&cruelHighlight=true");
  };

  const handleFeedback = () => {
    openGameFeedbackForm("end");
  };

  const handleRateItch = () => {
    window.open(ITCH_URL, "_blank", "noopener,noreferrer");
  };

  const handleMoreGames = async () => {
    let playlightSDK: { setDiscovery?: (open?: boolean) => void } | undefined =
      (window as typeof window & { playlightSDK?: typeof playlightSDK }).playlightSDK;
    if (!playlightSDK) {
      try {
        await initPlaylight();
      } catch {
        return;
      }
      playlightSDK = (window as typeof window & { playlightSDK?: typeof playlightSDK }).playlightSDK;
    }
    if (playlightSDK && typeof playlightSDK.setDiscovery === "function") {
      markPlaylightDiscoveryUserInitiated();
      playlightSDK.setDiscovery();
    }
  };

  if (isCruelModeRun === null) {
    return <div className="fixed inset-0 z-[10000] bg-black" aria-busy="true" />;
  }

  return (
    <div className="fixed inset-0 z-[10000] overflow-x-hidden">
      <Helmet>
        <title>{t("endScreen.pageTitle")}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Hero
        backgroundVariant={isCruelModeCompletion ? "starship" : "default"}
        hideSteamWishlist={steamDesktopEditionActive}
        trustBadge={{
          text: t("endScreen.trustBadge"),
        }}
        headline={{
          line1: t("endScreen.headline1"),
          line2: t("endScreen.headline2"),
        }}
        subtitle1={isCruelModeCompletion ? "" : t("endScreen.subtitle1")}
        subtitle2={isCruelModeCompletion ? "" : t("endScreen.subtitle2")}
        subtitle3=""
        buttons={{
          ...(!isCruelModeCompletion
            ? {
              primary: {
                text: t("endScreen.cruelMode"),
                onClick: handleCruelMode,
                buttonId: "end-screen-cruel-mode",
                badge: t("endScreen.cruelModeBadge"),
              },
            }
            : {}),
          feedback: {
            text: t("endScreen.feedback"),
            onClick: handleFeedback,
          },
          secondary: {
            text: t("endScreen.continuePlaying"),
            onClick: handleMainMenu,
            buttonId: "end-screen-close",
          },
          ...(steamEditionActive
            ? {}
            : {
              secondaryTrailing: {
                text: t("endScreen.moreGames"),
                onClick: handleMoreGames,
                buttonId: "end-screen-more-games",
              },
              rateItch: {
                text: t("endScreen.rateOnItch"),
                onClick: handleRateItch,
                buttonId: "end-screen-rate-itch",
              },
            }),
        }}
      />
    </div>
  );
}
