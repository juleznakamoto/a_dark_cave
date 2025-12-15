
import Hero from "@/components/ui/animated-shader-hero";

export default function EndScreenPage() {
  const handleMainMenu = async () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
  };

  const handleCruelMode = async () => {
    // Navigate back to game with shop open
    window.location.href = "/game?openShop=true";
  };

  const handleFeedback = () => {
    window.location.href = "mailto:support@a-dark-cave.com";
  };

  return (
    <div className="fixed inset-0 z-[99999]">
      <Hero
        trustBadge={{
          text: "Well Done!",
        }}
        headline={{
          line1: "Your Journey",
          line2: "Ends Here",
        }}
        subtitle1="At least for now..."
        subtitle2="Try Cruel Mode for an even bigger challenge with an extended gameplay."
        subtitle3=""
        buttons={{
          primary: {
            text: "⛤ Cruel Mode",
            onClick: handleCruelMode,
            buttonId: "end-screen-cruel-mode",
          },
          feedback: {
            text: "Feedback",
            onClick: handleFeedback,
            buttonId: "end-screen-feedback",
          },
          secondary: {
            text: "Close",
            onClick: handleMainMenu,
            buttonId: "end-screen-close",
          },
        }}
      />
    </div>
  );
}
