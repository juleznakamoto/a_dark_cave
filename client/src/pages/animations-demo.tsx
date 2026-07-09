import { Redirect } from "wouter";
import {
  ButtonParticlesSection,
  EstateBarsSection,
  HoverParticlesSection,
  ImproveButtonSection,
  InsightBadgeSection,
  MiscAnimationsSection,
  ProgressBarsSection,
  TabAnimationsSection,
} from "@/pages/animations-demo/sections";

const NAV_ITEMS = [
  { id: "estate-bars", label: "Estate bars" },
  { id: "improve-button", label: "Improve button" },
  { id: "insight-badge", label: "Insight badge" },
  { id: "button-particles", label: "Click particles" },
  { id: "hover-particles", label: "Hover particles" },
  { id: "progress-bars", label: "Progress bars" },
  { id: "tab-animations", label: "Tab unlock" },
  { id: "misc", label: "Focus & glow" },
] as const;

export default function AnimationsDemo() {
  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-black text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:max-w-5xl lg:flex-row lg:items-start lg:gap-10">
        <header className="space-y-3 lg:sticky lg:top-8 lg:w-52 lg:shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Animation playground</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dev-only sandbox for UI animations used across the game.
            </p>
          </div>
          <nav className="flex flex-wrap gap-1 lg:flex-col">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-neutral-900 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <EstateBarsSection />
          <ImproveButtonSection />
          <InsightBadgeSection />
          <ButtonParticlesSection />
          <HoverParticlesSection />
          <ProgressBarsSection />
          <TabAnimationsSection />
          <MiscAnimationsSection />
        </main>
      </div>
    </div>
  );
}
