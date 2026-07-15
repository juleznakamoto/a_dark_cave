/**
 * Bundle the Electron main + preload TypeScript into CommonJS for packaging.
 *
 * Set `ADC_STEAM_DEMO=1` or `ADC_STEAM_PLAYTEST=1` when packaging those variants
 * (see `package-steam-demo.mjs` / `package-steam-playtest.mjs`).
 */
import { build } from "esbuild";
import { rmSync } from "node:fs";

const OUTDIR = "dist-electron";
const isSteamDemoBuild = process.env.ADC_STEAM_DEMO === "1";
const isSteamPlaytestBuild = process.env.ADC_STEAM_PLAYTEST === "1";

rmSync(OUTDIR, { recursive: true, force: true });

const variantLabel = isSteamDemoBuild
  ? " (Steam demo)"
  : isSteamPlaytestBuild
    ? " (Steam playtest)"
    : "";

const shared = {
  platform: "node",
  format: "cjs",
  bundle: true,
  target: "node20",
  external: ["electron", "steamworks.js"],
  sourcemap: false,
  logLevel: "info",
  define: {
    "process.env.ADC_STEAM_DEMO_BUILD": JSON.stringify(
      isSteamDemoBuild ? "1" : "",
    ),
    "process.env.ADC_STEAM_PLAYTEST_BUILD": JSON.stringify(
      isSteamPlaytestBuild ? "1" : "",
    ),
  },
};

await build({
  ...shared,
  entryPoints: { main: "electron/main.ts" },
  outExtension: { ".js": ".cjs" },
  outdir: OUTDIR,
});

await build({
  ...shared,
  entryPoints: { preload: "electron/preload.ts" },
  outExtension: { ".js": ".cjs" },
  outdir: OUTDIR,
});

// eslint-disable-next-line no-console
console.log(`Electron main + preload bundled to dist-electron/${variantLabel}`);
