import { describe, it, expect, vi } from "vitest";
import {
  SECURITY_HEADERS,
  applySecurityHeaders,
  securityHeadersMiddleware,
} from "./securityHeaders";

describe("securityHeaders", () => {
  it("applies safety headers via applySecurityHeaders", () => {
    const headers: Record<string, string> = {};
    applySecurityHeaders({
      setHeader: (name, value) => {
        headers[name] = value;
      },
    });
    expect(headers).toEqual({ ...SECURITY_HEADERS });
  });

  it("middleware sets headers and continues", () => {
    const headers: Record<string, string> = {};
    const res = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    };
    const next = vi.fn();
    securityHeadersMiddleware({} as never, res as never, next);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-Frame-Options"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toBe(
      "frame-ancestors 'self' https://slowden.com https://www.slowden.com",
    );
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(next).toHaveBeenCalledOnce();
  });
});
