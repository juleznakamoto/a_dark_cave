import { BubblyButton } from "@/components/ui/bubbly-button";

export default function ButtonTest() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-bold text-foreground mb-4">
        Button Animation Test
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Regular Button */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Regular Button</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Stays visible, animations continue
          </p>
          <BubblyButton variant="outline">
            Regular Button (Stays Visible)
          </BubblyButton>
        </div>

        {/* Disappearing Button */}
        <div className="border rounded-lg p-4 text-center">
          <h3 className="text-sm font-semibold mb-2">Disappearing Button</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Disappears for 4 seconds, animations continue
          </p>
          <BubblyButton variant="outline" disappears={true} disappearDuration={4000}>
            Disappearing Button
          </BubblyButton>
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground max-w-2xl text-center space-y-2">
        <p className="font-semibold">BubblyButton Component</p>
        <p>
          Component manages animation state internally, so animations complete
          even when the button disappears from the DOM.
        </p>
      </div>
    </div>
  );
}