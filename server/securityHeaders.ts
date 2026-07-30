import type { Request, Response, NextFunction } from "express";

/** Phase A browser safety headers (no CSP). */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
} as const;

export function applySecurityHeaders(res: {
  setHeader: (name: string, value: string) => void;
}): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(name, value);
  }
}

/** Express middleware: set Phase A security headers on every response. */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  applySecurityHeaders(res);
  next();
}
