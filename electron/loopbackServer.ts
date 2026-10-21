import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

/**
 * Minimal loopback static server for the Steam/Electron build.
 *
 * The game relies on absolute-path routing (Wouter routes + hard
 * `window.location.href = "/end-screen"` navigations in CubeDialog), which does
 * NOT work under the `file://` protocol. Serving the built SPA over
 * `http://127.0.0.1:<port>` keeps that routing intact while staying fully
 * offline. The server binds only to the loopback interface.
 *
 * The port stays in a fixed range and is remembered. Chromium stores the
 * chosen language (and text size) under the page origin, and the port is
 * part of that origin. A new random port on every launch looked like a new
 * site, so the game forgot the language and used the OS language instead.
 */

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

function contentTypeFor(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

async function tryReadFile(filePath: string): Promise<Buffer | null> {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return null;
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export interface LoopbackServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

/** Written under Electron userData so the next launch reuses the same origin. */
export const LOOPBACK_PORT_FILE = "loopback-port.txt";

export const STEAM_LOOPBACK_PORT_BASE = 47331;
export const STEAM_LOOPBACK_PORT_SPAN = 20;

export interface LoopbackPortRange {
  base: number;
  span: number;
}

export const STEAM_LOOPBACK_PORTS: LoopbackPortRange = {
  base: STEAM_LOOPBACK_PORT_BASE,
  span: STEAM_LOOPBACK_PORT_SPAN,
};

export function parseStoredLoopbackPort(
  raw: string | null | undefined,
  range: LoopbackPortRange = STEAM_LOOPBACK_PORTS,
): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < range.base || parsed >= range.base + range.span) return null;
  return parsed;
}

/** Saved port first, then the rest of the range, so a busy port does not rotate the origin. */
export function loopbackPortCandidates(
  storedPort: number | null,
  range: LoopbackPortRange = STEAM_LOOPBACK_PORTS,
): number[] {
  const ports: number[] = [];
  const remembered = parseStoredLoopbackPort(
    storedPort === null ? null : String(storedPort),
    range,
  );
  if (remembered !== null) ports.push(remembered);
  for (let offset = 0; offset < range.span; offset += 1) {
    const port = range.base + offset;
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}

function isAddrInUse(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "EADDRINUSE"
  );
}

function listenOn(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}

function createSpaServer(rootDir: string): Server {
  const indexPath = join(rootDir, "index.html");

  return createServer(async (req, res) => {
    try {
      const rawPath = decodeURIComponent((req.url ?? "/").split("?")[0].split("#")[0]);
      // Prevent path traversal: normalize and re-anchor under rootDir.
      const safeRelative = normalize(rawPath).replace(/^(\.\.[/\\])+/, "");
      let candidate = join(rootDir, safeRelative);

      let body = rawPath === "/" ? null : await tryReadFile(candidate);

      // SPA fallback: serve index.html for routes without a file extension.
      if (!body) {
        const looksLikeAsset = extname(candidate) !== "";
        if (looksLikeAsset) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        candidate = indexPath;
        body = await tryReadFile(indexPath);
      }

      if (!body) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", contentTypeFor(candidate));
      res.end(body);
    } catch {
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });
}

/**
 * Serve `rootDir` (the Vite `dist/public` output) on a stable loopback port
 * with SPA fallback to `index.html` for unknown non-asset routes.
 */
export async function startLoopbackServer(
  rootDir: string,
  storedPort: number | null = null,
  range: LoopbackPortRange = STEAM_LOOPBACK_PORTS,
): Promise<LoopbackServer> {
  const candidates = loopbackPortCandidates(storedPort, range);
  let lastError: unknown;
  for (const port of candidates) {
    const server = createSpaServer(rootDir);
    try {
      await listenOn(server, port);
      return {
        url: `http://127.0.0.1:${port}`,
        port,
        close: () =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          }),
      };
    } catch (error) {
      lastError = error;
      if (!isAddrInUse(error)) throw error;
    }
  }

  const end = range.base + range.span - 1;
  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
  throw new Error(`Loopback ports ${range.base}-${end} are all in use (${detail})`);
}
