import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

function source(name: string): string {
  return readFileSync(join(dir, name), "utf8");
}

function staticValueFrom(src: string, spec: string): boolean {
  const escaped = spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    String.raw`^import\s+(?!type\b)[^;]*from\s+["']${escaped}["']`,
    "m",
  ).test(src);
}

describe("start-screen first-load imports", () => {
  it("StartScreen does not statically import radix, framer, or supabase", () => {
    const src = source("StartScreen.tsx");
    expect(staticValueFrom(src, "@radix-ui/react-slot")).toBe(false);
    expect(staticValueFrom(src, "framer-motion")).toBe(false);
    expect(staticValueFrom(src, "@/lib/supabase")).toBe(false);
    expect(staticValueFrom(src, "@/components/ui/button")).toBe(false);
    expect(staticValueFrom(src, "@/components/ui/particle-button")).toBe(false);
    expect(staticValueFrom(src, "@/components/game/LanguageSelector")).toBe(false);
    expect(staticValueFrom(src, "@/components/game/FooterNetworkMenu")).toBe(false);
    expect(staticValueFrom(src, "@/components/game/CrazyGamesMenuLinks")).toBe(false);
    expect(staticValueFrom(src, "@/components/game/FullscreenButton")).toBe(false);
    expect(src).toContain('import("@/components/ui/particle-button")');
    expect(src).toContain('import("@/components/game/LanguageSelector")');
  });

  it("startupCoordinator does not import the Supabase client module", () => {
    const src = readFileSync(
      join(dir, "../../game/startupCoordinator.ts"),
      "utf8",
    );
    expect(staticValueFrom(src, "@/lib/supabase")).toBe(false);
    expect(staticValueFrom(src, "@/lib/authStorageKey")).toBe(true);
  });

  it("start-screen page keeps UTM + Zod off the static graph", () => {
    const src = readFileSync(
      join(dir, "../../pages/start-screen-page.tsx"),
      "utf8",
    );
    expect(staticValueFrom(src, "@/lib/utmLanding")).toBe(false);
    expect(staticValueFrom(src, "@/lib/supabase")).toBe(false);
    expect(staticValueFrom(src, "@shared/utmAttribution")).toBe(false);
    expect(src).toContain('import("@/lib/utmLanding")');
  });

  it("page-load spinner does not import Framer or Radix", () => {
    const src = readFileSync(
      join(dir, "../ui/page-load-spinner.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/framer-motion/);
    expect(src).not.toMatch(/@radix-ui/);
    expect(src).not.toMatch(/bubbly-button/);
    expect(src).not.toMatch(/coin-hover-particles/);
  });

  it("audio does not auto-preload start-screen sounds", () => {
    const src = readFileSync(join(dir, "../../lib/audio.ts"), "utf8");
    expect(src).not.toMatch(/scheduleStartScreenSoundPreloadAfterLcp/);
    expect(src).toContain("registerStartScreenSoundUrls()");
  });

  it("DeferredAppChrome waits for a gesture before loading Radix", () => {
    const src = readFileSync(
      join(dir, "../DeferredAppChrome.tsx"),
      "utf8",
    );
    expect(src).toContain('import("@/components/ui/tooltip")');
    expect(src).toContain("pointerdown");
    expect(src).not.toMatch(/requestIdleCallback/);
  });

  it("utm helpers stay zod-free", () => {
    const src = readFileSync(
      join(dir, "../../../../shared/utmAttribution.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/from ["']zod["']/);
  });
});
