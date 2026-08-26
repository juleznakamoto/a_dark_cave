import type { Request, Response, NextFunction } from "express";

/**
 * Browser safety headers.
 * X-Frame-Options is omitted on purpose: SAMEORIGIN would still block SlowDen,
 * and that header cannot whitelist a third-party host. CSP frame-ancestors is
 * the replacement (self + SlowDen only).
 */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy":
    "frame-ancestors 'self' https://slowden.com https://www.slowden.com",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;

export function applySecurityHeaders(res: {
  setHeader: (name: string, value: string) => void;
}): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}

/** Express middleware: set browser safety headers on every response. */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  applySecurityHeaders(res);
  next();
}
