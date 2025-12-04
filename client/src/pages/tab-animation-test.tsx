import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function TabAnimationTest() {
  const [animatingTabs, setAnimatingTabs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("cave");
  const [animationDuration, setAnimationDuration] = useState(1000);
  const [animationDelay, setAnimationDelay] = useState(0);

  // Tabs to test
  const tabs = [
    { id: "cave", label: "The Cave", unlocked: true },
    { id: "village", label: "Village", unlocked: false },
    { id: "forest", label: "Forest", unlocked: false },
    { id: "estate", label: "Estate", unlocked: false },
    { id: "bastion", label: "Bastion", unlocked: false },
  ];

  const [unlockedTabs, setUnlockedTabs] = useState<Set<string>>(
    new Set(["cave"]),
  );

  const unlockTab = (tabId: string) => {
    if (!unlockedTabs.has(tabId)) {
      // Add to unlocked tabs
      setUnlockedTabs((prev) => new Set([...prev, tabId]));

      // Trigger animation
      setAnimatingTabs(new Set([tabId]));

      // Remove animation class after duration
      setTimeout(() => {
        setAnimatingTabs(new Set());
      }, animationDuration + animationDelay);
    }
  };

  const resetAll = () => {
    setUnlockedTabs(new Set(["cave"]));
    setAnimatingTabs(new Set());
    setActiveTab("cave");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <style>{`
        @keyframes tab-fade-in {
          0% {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(-2px);
          }

          100% {
            opacity: 1;
            filter: blur(0px);
            transform: translateY(0);
          }
        }

        .tab-fade-in {
          animation: tab-fade-in ${animationDuration}ms ease-out ${animationDelay}ms forwards;
          opacity: 0;
        }

        .tab-button {
          transition: all 0.2s ease;
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Tab Animation Test</h1>
          <p className="text-muted-foreground">
            Test and fine-tune the tab unlock animation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview Area */}
          <Card>
            <CardHeader>
              <CardTitle>Tab Preview</CardTitle>
              <CardDescription>
                This simulates the game's tab navigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4">
                <div className="flex gap-4 justify-center">
                  {tabs.map(
                    (tab) =>
                      unlockedTabs.has(tab.id) && (
                        <button
                          key={tab.id}
                          className={`tab-button py-2 px-4 text-sm bg-transparent rounded ${
                            activeTab === tab.id
                              ? "font-bold opacity-100 bg-background"
                              : "opacity-60"
                          } ${animatingTabs.has(tab.id) ? "tab-fade-in" : ""}`}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ),
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Animation Controls</CardTitle>
              <CardDescription>Adjust the animation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Duration: {animationDuration}ms</Label>
                <Slider
                  value={[animationDuration]}
                  onValueChange={([value]) => setAnimationDuration(value)}
                  min={100}
                  max={3000}
                  step={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Delay: {animationDelay}ms</Label>
                <Slider
                  value={[animationDelay]}
                  onValueChange={([value]) => setAnimationDelay(value)}
                  min={0}
                  max={2000}
                  step={100}
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Unlock Tabs:</p>
                <div className="grid grid-cols-2 gap-2">
                  {tabs
                    .filter((tab) => tab.id !== "cave")
                    .map((tab) => (
                      <Button
                        key={tab.id}
                        onClick={() => unlockTab(tab.id)}
                        disabled={unlockedTabs.has(tab.id)}
                        variant="outline"
                        size="sm"
                      >
                        {unlockedTabs.has(tab.id) ? "✓ " : ""}
                        {tab.label}
                      </Button>
                    ))}
                </div>
              </div>

              <Button
                onClick={resetAll}
                variant="destructive"
                className="w-full"
              >
                Reset All
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Code Display */}
        <Card>
          <CardHeader>
            <CardTitle>Current Animation CSS</CardTitle>
            <CardDescription>Copy this to your main CSS file</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
              {`@keyframes tab-fade-in {
  0% {
    opacity: 0;
    filter: blur(5px);
    transform: translateY(-2px);
  }
  100% {
    opacity: 1;
    filter: blur(0px);
    transform: translateY(0);
  }
}

.tab-fade-in {
  animation: tab-fade-in ${animationDuration}ms ease-out ${animationDelay}ms forwards;
  opacity: 0;
}`}
            </pre>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>1. Use the sliders to adjust animation duration and delay</p>
            <p>2. Click the tab buttons to unlock them and see the animation</p>
            <p>3. Click "Reset All" to start over</p>
            <p>
              4. Once you're happy with the animation, update the values in
              GameContainer.tsx
            </p>
            <p className="pt-2 text-muted-foreground">
              Current GameContainer animation timeout: 1000ms (line 52)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
