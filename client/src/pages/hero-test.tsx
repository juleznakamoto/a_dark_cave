
import Hero from "@/components/ui/animated-shader-hero";

export default function HeroTest() {
  const handlePrimaryClick = () => {
    console.log('Get Started clicked!');
    alert('Get Started clicked! You can add your own logic here.');
  };

  const handleSecondaryClick = () => {
    console.log('Explore Features clicked!');
    alert('Explore Features clicked! You can add your own logic here.');
  };

  return (
    <div className="w-full">
      <Hero
        trustBadge={{
          text: "Trusted by forward-thinking teams.",
          icons: ["✨"]
        }}
        headline={{
          line1: "Launch Your",
          line2: "Workflow Into Orbit"
        }}
        subtitle="Supercharge productivity with AI-powered automation and integrations built for the next generation of teams — fast, seamless, and limitless."
        buttons={{
          primary: {
            text: "Get Started for Free",
            onClick: handlePrimaryClick
          },
          secondary: {
            text: "Explore Features",
            onClick: handleSecondaryClick
          }
        }}
      />
      
      {/* Additional content below hero */}
      <div className="bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            How to Use the Hero Component
          </h2>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <pre className="text-sm text-gray-600 overflow-x-auto">
{`<Hero
  trustBadge={{
    text: "Your trust badge text",
    icons: ["🚀", "⭐", "✨"] // optional
  }}
  headline={{
    line1: "Your First Line",
    line2: "Your Second Line"
  }}
  subtitle="Your compelling subtitle text goes here..."
  buttons={{
    primary: {
      text: "Primary CTA",
      onClick: handlePrimaryClick
    },
    secondary: {
      text: "Secondary CTA", 
      onClick: handleSecondaryClick
    }
  }}
  className="custom-classes" // optional
/>`}
            </pre>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Features:</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Interactive WebGL shader background with animated effects</li>
              <li>Smooth fade-in animations for all content</li>
              <li>Responsive design that works on all screen sizes</li>
              <li>Customizable trust badge, headline, subtitle, and buttons</li>
              <li>Interactive pointer/touch support on the shader background</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
