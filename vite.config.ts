import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "node:child_process";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { compression } from "vite-plugin-compression2";

/** Baked into the client bundle; compared against `/api/version` at runtime. */
function resolveBuildSha(): string {
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
const clientRoot = path.resolve(import.meta.dirname, "client");

export default defineConfig({
  plugins: [
    react(),
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
    __BUILD_SHA__: JSON.stringify(resolveBuildSha()),
  },
  resolve: {
    alias: {
      "@": path.resolve(clientRoot, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      ...(isSteamBuild
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
    rollupOptions: {
      output: {
        manualChunks: isSteamBuild
          ? {
            "vendor-react": ["react", "react-dom"],
            "vendor-framer": ["framer-motion"],
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip",
            ],
          }
          : {
            "vendor-react": ["react", "react-dom"],
            "vendor-framer": ["framer-motion"],
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip",
            ],
            "vendor-stripe": ["@stripe/stripe-js", "@stripe/react-stripe-js"],
            "vendor-supabase": ["@supabase/supabase-js"],
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
});