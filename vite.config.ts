import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "node:child_process";
import { compression } from "vite-plugin-compression2";
import { vendorManualChunk } from "./vite.vendorChunks";
import {
  isPackagedGameBuild,
  removeSiteOnlyPublic,
} from "./vite.sitePublic";
import { omittedPageAliases, omittedPageSpecs } from "./vite.sitePages";

/**
 * Baked into the client bundle; compared against `/api/version` at runtime.
 * Dev/serve always uses `"dev"` so versionCheck skips (avoids loops against a
 * stale `dist/build-meta.json` from a previous production build).
 */
function resolveBuildSha(mode: string): string {
  if (mode !== "production") return "dev";
  const envSha =
    process.env.GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.RAILWAY_GIT_COMMIT_SHA;
  if (envSha && envSha.trim()) return envSha.trim();
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim() || "dev";
  } catch {
    return "dev";
  }
}

const isSteamBuild = process.env.VITE_STEAM_BUILD === "1";
const isIosBuild = process.env.VITE_IOS_BUILD === "1";
const isCrazyGamesBuild = process.env.VITE_CRAZYGAMES === "1";
const isItchBuild = process.env.VITE_ITCH === "1";
const isRelativeHtmlBuild = isCrazyGamesBuild || isItchBuild || isIosBuild;
const useOfflineStubs = isSteamBuild || isCrazyGamesBuild || isItchBuild || isIosBuild;
const clientRoot = path.resolve(import.meta.dirname, "client");
const repoRoot = path.resolve(import.meta.dirname);

/** Steam packagers set this so each edition has its own Vite output. */
function resolveWebOutDir(): string {
  const override = process.env.ADC_WEB_OUT_DIR;
  if (!override) return path.resolve(repoRoot, "dist/public");
  const resolved = path.resolve(repoRoot, override);
  if (resolved !== repoRoot && !resolved.startsWith(repoRoot + path.sep)) {
    throw new Error("ADC_WEB_OUT_DIR must stay inside the repo");
  }
  return resolved;
}

function omitSiteOnlyPublicPlugin(outDir: string): Plugin {
  return {
    name: "omit-site-only-public",
    apply: "build",
    enforce: "post",
    closeBundle() {
      if (!isPackagedGameBuild()) return;
      const removed = removeSiteOnlyPublic(outDir);
      if (removed.length > 0) {
        console.log(`Omitted site-only public files: ${removed.join(", ")}`);
      }
    },
  };
}

function relativePortalHtmlPlugin(): Plugin {
  return {
    name: "relative-portal-html",
    transformIndexHtml(html) {
      if (!isRelativeHtmlBuild) return html;
      let next = html;
      if (isCrazyGamesBuild) {
        // Absolute SDK URL first so the relative-path rewrite does not touch it.
        // defer keeps document order (SDK before the module) without blocking
        // the body, so the boot spinner can paint while the file downloads.
        next = next.replace(
          "</head>",
          '  <script defer src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n</head>',
        );
      }
      next = next
        .replaceAll('href="/', 'href="./')
        .replaceAll('src="/', 'src="./');
      if (isItchBuild) {
        next = next.replaceAll("utm_source=a_dark_cave", "utm_source=itch");
      }
      return next;
    },
  };
}

export default defineConfig(async ({ mode }) => ({
  base: isRelativeHtmlBuild ? "./" : "/",
  plugins: [
    react(),
    relativePortalHtmlPlugin(),
    compression(),
    omitSiteOnlyPublicPlugin(resolveWebOutDir()),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
      ]
      : []),
  ],
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify(resolveBuildSha(mode)),
  },
  resolve: {
    alias: [
      // Exact page matches before the "@" prefix, or the real files still ship.
      ...omittedPageAliases(
        omittedPageSpecs(process.env, mode),
        path.resolve(clientRoot, "src/stubs/offline/hiddenPage.tsx"),
      ),
      {
        find: "@shared",
        replacement: path.resolve(import.meta.dirname, "shared"),
      },
      {
        find: "@assets",
        replacement: path.resolve(import.meta.dirname, "attached_assets"),
      },
      ...(useOfflineStubs
        ? [
            {
              find: "@/lib/supabase",
              replacement: path.resolve(clientRoot, "src/stubs/steam/supabase.ts"),
            },
            {
              find: "@/lib/playlight",
              replacement: path.resolve(clientRoot, "src/stubs/steam/playlight.ts"),
            },
            {
              find: "@/lib/stripePaymentReturn",
              replacement: path.resolve(
                clientRoot,
                "src/stubs/steam/stripePaymentReturn.ts",
              ),
            },
          ]
        : []),
      ...(!isIosBuild
        ? [
            {
              find: "@capacitor/filesystem",
              replacement: path.resolve(
                clientRoot,
                "src/stubs/capacitor/filesystem.ts",
              ),
            },
            {
              find: "@capacitor/app",
              replacement: path.resolve(clientRoot, "src/stubs/capacitor/app.ts"),
            },
            {
              find: "@capacitor/status-bar",
              replacement: path.resolve(
                clientRoot,
                "src/stubs/capacitor/statusBar.ts",
              ),
            },
            {
              find: "@capacitor-community/media",
              replacement: path.resolve(
                clientRoot,
                "src/stubs/capacitor/media.ts",
              ),
            },
            {
              find: "@capacitor/haptics",
              replacement: path.resolve(
                clientRoot,
                "src/stubs/capacitor/haptics.ts",
              ),
            },
          ]
        : []),
      { find: "@", replacement: path.resolve(clientRoot, "src") },
    ],
  },
  root: clientRoot,
  build: {
    outDir: resolveWebOutDir(),
    emptyOutDir: true,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Keep leftover named vendor files off the HTML preload list. React is
    // the only forced vendor chunk; framer/radix/supabase follow importers.
    modulePreload: {
      resolveDependencies: (_filename, deps, { hostType }) => {
        if (hostType !== "html") return deps;
        return deps.filter(
          (dep) =>
            !dep.includes("vendor-framer") &&
            !dep.includes("vendor-radix") &&
            !dep.includes("vendor-supabase") &&
            !dep.includes("vendor-stripe"),
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          return vendorManualChunk(id, { offlineStubs: useOfflineStubs });
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      // Do not use `**/.*` — it blocks Vite's dep cache (`node_modules/.vite/deps/*`)
      // and breaks lazy-loaded routes with 404s on pre-bundled chunks (Replit dev).
      deny: [".env", ".env.*", "**/.git/**"],
    },
  },
}));