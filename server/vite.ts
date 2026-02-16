import express, { type Express } from "express";
import expressStaticGzip from "express-static-gzip";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();
const logger = console;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  logger.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip Vite middleware for API routes - let Express handle them
    if (url.startsWith('/api/')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with pre-compressed Brotli/gzip (from vite-plugin-compression2)
  app.use(
    expressStaticGzip(distPath, {
      enableBrotli: true,
      orderPreference: ["br", "gz"],
      serveStatic: {
        maxAge: "1y",
        immutable: true,
        setHeaders: (res, filepath) => {
          if (filepath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          }
        },
      },
    })
  );

  // SPA fallback: serve index.html only for route-like requests (no file extension).
  // NEVER serve HTML for asset requests (/assets/*, *.js, *.css) - return 404 instead.
  // Otherwise missing assets (e.g. old cached HTML after deploy) get HTML → MIME type error.
  app.use("*", (req, res) => {
    const reqPath = req.path || req.originalUrl?.split("?")[0] || "";
    const isAssetRequest =
      reqPath.startsWith("/assets/") ||
      /\.[a-f0-9]{8,}\.(js|css|mjs)$/i.test(reqPath) ||
      /\.(js|css|mjs|woff2?|ttf|otf|png|jpg|svg|ico|webp)$/i.test(reqPath);
    if (isAssetRequest) {
      res.status(404).send("Not found");
      return;
    }
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
