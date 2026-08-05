import { Redirect } from "wouter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ANIMATION_DEMO_SECTIONS } from "@/pages/animations-demo/catalog";

export default function AnimationsDemo() {
  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <ScrollArea className="h-[100dvh] w-full bg-black">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 text-foreground lg:max-w-5xl lg:flex-row lg:items-start lg:gap-10">
        <header className="space-y-3 lg:sticky lg:top-8 lg:w-52 lg:shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Animation playground</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dev-only sandbox. Sections and particle presets are driven by
              shared catalogs so game source changes show up here.
            </p>
          </div>
          <nav className="flex flex-wrap gap-1 lg:flex-col">
            {ANIMATION_DEMO_SECTIONS.map((item) => (
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
          {ANIMATION_DEMO_SECTIONS.map(({ id, Section }) => (
            <Section key={id} />
          ))}
        </main>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
