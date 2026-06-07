import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Hero from "@/components/ui/animated-shader-hero";
import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import { useGameStore } from "@/game/state";
import { useTranslation } from "react-i18next";

export default function EndScreenPage() {
  const { t } = useTranslation("ui");
  const [isCruelModeRun, setIsCruelModeRun] = useState<boolean | null>(null);

  useEffect(() => {
    mountNotoSansSymbols2FontFace();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await useGameStore.getState().loadGame();
        setIsCruelModeRun(Boolean(useGameStore.getState().cruelMode));
      } catch {
        setIsCruelModeRun(false);
      }
    })();
  }, []);

  const showCruelModePromo = isCruelModeRun !== true;
  const handleMainMenu = async () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
  };

  const handleCruelMode = async () => {
    window.location.href = "/?game=true&openShop=true&cruelHighlight=true";
  };

  const handleFeedback = () => {
    window.location.href = "mailto:support@a-dark-cave.com";
  };

  const handleInstagram = () => {
    window.open("https://www.instagram.com/a_dark_cave/", "_blank", "noopener,noreferrer");
  };

  const handleReddit = () => {
    window.open("https://www.reddit.com/r/aDarkCave/", "_blank", "noopener,noreferrer");
  };

  const handleMoreGames = async () => {
    // Mirror ProfileMenu discovery: load Playlight SDK if needed, then open discovery.
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
        trustBadge={{
          text: t("endScreen.trustBadge"),
        }}
        headline={{
          line1: t("endScreen.headline1"),
          line2: t("endScreen.headline2"),
        }}
        subtitle1={showCruelModePromo ? t("endScreen.subtitle1") : ""}
        subtitle2={showCruelModePromo ? t("endScreen.subtitle2") : ""}
        subtitle3=""
        buttons={{
          ...(showCruelModePromo
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
            buttonId: "end-screen-feedback",
          },
          secondary: {
            text: t("endScreen.continuePlaying"),
            onClick: handleMainMenu,
            buttonId: "end-screen-close",
          },
          secondaryTrailing: {
            text: t("endScreen.moreGames"),
            onClick: handleMoreGames,
            buttonId: "end-screen-more-games",
          },
        }}
        socialButtons={{
          instagram: {
            onClick: handleInstagram,
          },
          reddit: {
            onClick: handleReddit,
          },
        }}
      />
    </div>
  );
}
