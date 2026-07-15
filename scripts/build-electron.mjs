/**
 * Bundle the Electron main + preload TypeScript into CommonJS for packaging.
 *
 * Output goes to `dist-electron/` as `.cjs` so it loads as CommonJS regardless of
 * the package's `"type": "module"`. `electron` and `steamworks.js` (native) are
 * kept external and resolved from node_modules at runtime.
 *
 * Set `ADC_STEAM_DEMO=1` when packaging the Steam demo (see `package-steam-demo.mjs`).
 */
import { build } from "esbuild";
import { rmSync } from "node:fs";

const OUTDIR = "dist-electron";
const isSteamDemoBuild = process.env.ADC_STEAM_DEMO === "1";

rmSync(OUTDIR, { recursive: true, force: true });

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
console.log(
  `Electron main + preload bundled to dist-electron/${isSteamDemoBuild ? " (Steam demo)" : ""}`,
);
