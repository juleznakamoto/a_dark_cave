/**
 * Bundle the Electron main + preload TypeScript into CommonJS for packaging.
 *
 * Set `ADC_STEAM_DEMO=1` when packaging the demo
 * (see `package-steam-demo.mjs`).
 */
import { build } from "esbuild";
import { rmSync } from "node:fs";
import { join, resolve, sep } from "node:path";

const repoRoot = import.meta.dirname
  ? join(import.meta.dirname, "..")
  : process.cwd();
const override = process.env.ADC_ELECTRON_OUT_DIR;
const OUTDIR = override
  ? resolve(repoRoot, override)
  : join(repoRoot, "dist-electron");
if (OUTDIR !== repoRoot && !OUTDIR.startsWith(repoRoot + sep)) {
  throw new Error("ADC_ELECTRON_OUT_DIR must stay inside the repo");
}
const isSteamDemoBuild = process.env.ADC_STEAM_DEMO === "1";

rmSync(OUTDIR, { recursive: true, force: true });

const variantLabel = isSteamDemoBuild ? " (Steam demo)" : "";

const shared = {
  platform: "node",
  format: "cjs",
  bundle: true,
  target: "node20",
  absWorkingDir: repoRoot,
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
console.log(`Electron main + preload bundled to ${OUTDIR}${variantLabel}`);
