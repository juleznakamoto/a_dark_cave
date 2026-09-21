import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { ANIMATION_DEMO_SECTIONS } from "@/pages/animations-demo/catalog";

function currentHashId(): string {
  return window.location.hash.replace(/^#/, "");
}

function scrollDemoSectionIntoView(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const viewport = el.closest("[data-animations-demo-scroll]");
  if (!(viewport instanceof HTMLElement)) {
    el.scrollIntoView({ block: "start" });
    return;
  }
  const top =
    el.getBoundingClientRect().top -
    viewport.getBoundingClientRect().top +
    viewport.scrollTop -
    12;
  viewport.scrollTo({ top: Math.max(0, top), left: 0 });
}

export default function AnimationsDemo() {
  const [hashId, setHashId] = useState(currentHashId);

  useEffect(() => {
    const onHash = () => setHashId(currentHashId());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!hashId) return;
    const frame = window.requestAnimationFrame(() => {
      scrollDemoSectionIntoView(hashId);
    });
    const retry = window.setTimeout(() => {
      scrollDemoSectionIntoView(hashId);
    }, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [hashId]);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div
      data-animations-demo-scroll=""
      className="h-[100dvh] w-full overflow-x-hidden overflow-y-auto bg-black"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-6 px-4 py-8 text-foreground lg:max-w-none lg:flex-row lg:items-start lg:gap-10">
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

        <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-x-hidden">
          {ANIMATION_DEMO_SECTIONS.map(({ id, Section }) => (
            <Section key={id} />
          ))}
        </main>
      </div>
    </div>
  );
}
