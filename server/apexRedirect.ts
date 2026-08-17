import type { Request, Response, NextFunction } from "express";
import { SITE_ORIGIN } from "@shared/publicSeo";

const WWW_HOST = "www.a-dark-cave.com";

/** Return the apex URL when `host` is www; otherwise null. */
export function apexRedirectLocation(
  host: string | undefined,
  originalUrl: string,
): string | null {
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (hostname !== WWW_HOST) return null;
  const path = originalUrl.startsWith("/") ? originalUrl : `/${originalUrl}`;
  return `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
}

/** 301 www.a-dark-cave.com → https://a-dark-cave.com (path and query preserved). */
export function apexRedirectMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const location = apexRedirectLocation(req.hostname, req.originalUrl || "/");
  if (!location) {
    next();
    return;
  }
  res.redirect(301, location);
}
