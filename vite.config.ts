import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "node:child_process";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { compression } from "vite-plugin-compression2";
import { vendorManualChunk } from "./vite.vendorChunks";

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
const isCrazyGamesBuild = process.env.VITE_CRAZYGAMES === "1";
const useOfflineStubs = isSteamBuild || isCrazyGamesBuild;
const clientRoot = path.resolve(import.meta.dirname, "client");

function crazyGamesRelativeHtmlPlugin(): Plugin {
  return {
    name: "crazygames-relative-html",
    transformIndexHtml(html) {
      if (!isCrazyGamesBuild) return html;
      // Absolute SDK URL first so the relative-path rewrite does not touch it.
      const withSdk = html.replace(
        "</head>",
        '  <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>\n</head>',
      );
      return withSdk
        .replaceAll('href="/', 'href="./')
        .replaceAll('src="/', 'src="./');
    },
  };
}

export default defineConfig(async ({ mode }) => ({
  base: isCrazyGamesBuild ? "./" : "/",
  plugins: [
    react(),
    crazyGamesRelativeHtmlPlugin(),
    compression(),
    runtimeErrorOverlay(),
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
    alias: {
      "@": path.resolve(clientRoot, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      ...(useOfflineStubs
        ? {
          "@/lib/supabase": path.resolve(clientRoot, "src/stubs/steam/supabase.ts"),
          "@/lib/playlight": path.resolve(clientRoot, "src/stubs/steam/playlight.ts"),
          "@/lib/stripePaymentReturn": path.resolve(
            clientRoot,
            "src/stubs/steam/stripePaymentReturn.ts",
          ),
        }
        : {}),
    },
  },
  root: clientRoot,
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
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