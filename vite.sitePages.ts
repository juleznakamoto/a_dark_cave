import { isPackagedGameBuild } from "./vite.sitePublic";

/**
 * Vite still emits a dynamic `import()` that sits in a false branch, so a
 * runtime redirect does not keep the page out of the bundle. These specifiers
 * are aliased to `client/src/stubs/offline/hiddenPage.tsx` instead.
 *
 * The match is exact. `@/pages/village-map-demo` must not swallow
 * `@/pages/village-map-demo/catalog`, which the game itself imports.
 */

/** Website pages. Steam, iOS, itch, and CrazyGames send these routes home. */
export const PACKAGED_HIDDEN_PAGES = [
  "@/pages/admin/dashboard",
  "@/pages/reset-password",
  "@/pages/imprint",
  "@/pages/privacy",
  "@/pages/faq",
  "@/pages/about",
  "@/pages/press",
  "@/pages/terms",
  "@/pages/withdrawal",
  "@/pages/unsubscribe",
] as const;

/** Playgrounds. Production builds redirect them home. The dev server keeps them. */
export const DEV_ONLY_PAGES = [
  "@/pages/dev-dashboard",
  "@/pages/starship-shader-demo",
  "@/pages/animations-demo",
  "@/pages/combat-dialog-demo",
  "@/pages/demo-end-screen-demo",
  "@/pages/sounds-demo",
  "@/pages/production-icons-demo",
  "@/pages/village-map-demo",
  "@/pages/building-shape-demo",
  "@/pages/tooltips-demo",
  "@/pages/dialogs-demo",
] as const;

export function omittedPageSpecs(
  env: NodeJS.ProcessEnv,
  mode: string,
): string[] {
  const specs: string[] = [];
  if (isPackagedGameBuild(env)) specs.push(...PACKAGED_HIDDEN_PAGES);
  if (mode === "production") specs.push(...DEV_ONLY_PAGES);
  return specs;
}

function exactSpecifier(spec: string): RegExp {
  return new RegExp(`^${spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

export function omittedPageAliases(
  specs: readonly string[],
  replacement: string,
): { find: RegExp; replacement: string }[] {
  return specs.map((spec) => ({
    find: exactSpecifier(spec),
    replacement,
  }));
}

/**
 * Homepage links in `index.html` for crawlers. The iOS app has no FAQ, About,
 * Press, or legal pages, so the boot screen must not paint them.
 */
export function stripStaticSiteNav(html: string): string {
  return html.replace(/<nav id="adc-static-nav"[\s\S]*?<\/nav>\s*/, "");
}
