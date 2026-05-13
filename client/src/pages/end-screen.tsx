import { Helmet } from "react-helmet-async";
import Hero from "@/components/ui/animated-shader-hero";
import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";

export default function EndScreenPage() {
  const handleMainMenu = async () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
  };

  const handleCruelMode = async () => {
    // Journey-complete promo: open shop with Cruel Mode highlighted + discounted checkout flag.
    window.location.href =
      "/?game=true&openShop=true&cruelHighlight=true&cruelCompletionDiscount=true";
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

  const handleFandomWiki = () => {
    window.open("https://a-dark-cave.fandom.com/wiki/A_Dark_Cave_Wiki", "_blank", "noopener,noreferrer");
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

  return (
    <div className="fixed inset-0 z-[10000] overflow-x-hidden">
      <Helmet>
        <title>Journey Complete - A Dark Cave</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Hero
        trustBadge={{
          text: "Well Done!",
        }}
        headline={{
          line1: "Your Journey",
          line2: "Ends Here",
        }}
        subtitle1="At least for now..."
        subtitle2="Try Cruel Mode for an even bigger challenge with extended gameplay. Because you finished the game you receive a special discount."
        subtitle3=""
        buttons={{
          primary: {
            text: "⛤ Cruel Mode",
            onClick: handleCruelMode,
            buttonId: "end-screen-cruel-mode",
            badge: "Special discount",
          },
          feedback: {
            text: "Feedback",
            onClick: handleFeedback,
            buttonId: "end-screen-feedback",
          },
          secondary: {
            text: "Continue Playing",
            onClick: handleMainMenu,
            buttonId: "end-screen-close",
          },
          secondaryTrailing: {
            text: "More Games",
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
          fandomWiki: {
            onClick: handleFandomWiki,
          },
        }}
      />
    </div>
  );
}
