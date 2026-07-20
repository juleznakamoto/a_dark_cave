import express, { type Express } from "express";
import expressStaticGzip from "express-static-gzip";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { isStaticAssetPath } from "@shared/publicSeo";
import { sendSpaIndexHtml } from "./spaHtml";

const viteLogger = createLogger();
const logger = console;

export type LogLevel = "error" | "warn" | "info";

export interface LogEntry {
  /** ISO timestamp of when the line was logged. */
  time: string;
  source: string;
  message: string;
  level: LogLevel;
}

/**
 * In-memory ring buffer of recent server log lines. Survives only for the life of
 * the process (lost on restart/redeploy) and is per-instance — see `/api/admin/logs`.
 */
const LOG_BUFFER_CAPACITY = 300;
const logBuffer: LogEntry[] = [];

/** Classify a log line by its conventional emoji/word markers (❌ error, ⚠️ warn). */
function detectLogLevel(text: string): LogLevel {
  if (text.includes("❌") || text.includes("FATAL") || /\berror\b/i.test(text)) {
    return "error";
  }
  if (text.includes("⚠️") || /\bwarn/i.test(text)) {
    return "warn";
  }
  return "info";
}

function recordLog(message: string, source: string) {
  const entry: LogEntry = {
    time: new Date().toISOString(),
    source,
    message,
    level: detectLogLevel(`${message} ${source}`),
  };
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_CAPACITY) {
    logBuffer.splice(0, logBuffer.length - LOG_BUFFER_CAPACITY);
  }
}

/**
 * Return the most recent buffered log entries, newest first.
 * @param limit max entries to return (clamped to the buffer capacity).
 * @param level optional level filter ("error" also includes nothing else).
 */
export function getRecentLogs(limit = 100, level?: LogLevel): LogEntry[] {
  const filtered = level
    ? logBuffer.filter((e) => e.level === level)
    : logBuffer;
  const safeLimit = Math.max(0, Math.min(limit, LOG_BUFFER_CAPACITY));
  return filtered.slice(-safeLimit).reverse();
}

export function log(message: string, source = "express") {
  const sourceText = typeof source === "string" ? source : String(source);
  recordLog(message, sourceText);

  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  logger.log(`${formattedTime} [${sourceText}] ${message}`);
}

/** Dev module / asset paths that must never fall through to SPA index.html. */
function isViteDevAssetPath(pathname: string): boolean {
  const reqPath = (pathname.split("?")[0] || "").replace(/\/+$/, "") || "/";
  if (isStaticAssetPath(reqPath)) return true;
  return (
    reqPath.startsWith("/src/") ||
    reqPath.startsWith("/@vite/") ||
    reqPath.startsWith("/@fs/") ||
    reqPath.startsWith("/@id/") ||
    reqPath.startsWith("/@react-refresh") ||
    reqPath.startsWith("/node_modules/") ||
    reqPath.includes("/.vite/") ||
    /\.(tsx?|jsx?|mjs|cjs|css|scss|sass|less)(\?|$)/i.test(reqPath)
  );
}

function isMobileUserAgent(ua: string | undefined): boolean {
  return Boolean(ua && /Mobile|iPhone|iPad|Android/i.test(ua));
}

/**
 * On Replit, phones often fail while loading `/@vite/client` (HMR) over the
 * proxy. Desktop keeps HMR; mobile gets a plain module graph without the
 * Vite client / runtime-error overlay scripts.
 */
function stripViteClientForMobile(html: string, ua: string | undefined): string {
  if (!process.env.REPL_ID || !isMobileUserAgent(ua)) return html;
  return html
    .replace(
      /<script[^>]*\bsrc=["']\/@vite\/client["'][^>]*><\/script>/gi,
      "",
    )
    .replace(
      /<script[^>]*type=["']module["'][^>]*>\s*import\s*\{[\s\S]*?\}\s*from\s*["']\/@vite\/client["'][\s\S]*?<\/script>/gi,
      "",
    );
}

export async function setupVite(app: Express, server: Server) {
  // Replit (and similar HTTPS reverse proxies) terminate TLS at :443. Without
  // clientPort/protocol, the Vite client on phones often opens the wrong WS
  // URL → "Importing a module script failed" while desktop still works.
  const behindReplitProxy = Boolean(process.env.REPL_ID);
  const serverOptions = {
    ...viteConfig.server,
    middlewareMode: true,
    allowedHosts: true as const,
    hmr: behindReplitProxy
      ? { server, protocol: "wss" as const, clientPort: 443 }
      : { server },
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

  // Safari can cache a failed module response and keep failing until cleared.
  if (behindReplitProxy) {
    app.use((req, res, next) => {
      if (isViteDevAssetPath(req.path || "")) {
        res.setHeader("Cache-Control", "no-store");
      }
      next();
    });
  }

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const pathname = req.path || url.split("?")[0] || "/";

    // Skip Vite middleware for API routes - let Express handle them
    if (url.startsWith("/api/")) {
      return next();
    }

    // Never serve index.html for a JS/TS module URL (Safari: "Importing a
    // module script failed" when it gets HTML with the wrong MIME type).
    if (isViteDevAssetPath(pathname)) {
      res.status(404).send("Not found");
      return;
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
      let page = await vite.transformIndexHtml(url, template);
      page = stripViteClientForMobile(page, req.headers["user-agent"]);
      sendSpaIndexHtml(res, page, req.path || "/");
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
    if (isStaticAssetPath(reqPath)) {
      res.status(404).send("Not found");
      return;
    }
    const indexPath = path.resolve(distPath, "index.html");
    sendSpaIndexHtml(res, fs.readFileSync(indexPath, "utf-8"), reqPath);
  });
}
