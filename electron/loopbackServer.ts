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
  close: () => Promise<void>;
}

/**
 * Serve `rootDir` (the Vite `dist/public` output) on a random loopback port with
 * SPA fallback to `index.html` for unknown non-asset routes.
 */
export async function startLoopbackServer(rootDir: string): Promise<LoopbackServer> {
  const indexPath = join(rootDir, "index.html");

  const server: Server = createServer(async (req, res) => {
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

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
