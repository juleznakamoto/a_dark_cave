import { describe, it, expect, vi } from "vitest";
import { apexRedirectLocation, apexRedirectMiddleware } from "./apexRedirect";

describe("apexRedirect", () => {
  it("redirects www host to the apex origin", () => {
    expect(apexRedirectLocation("www.a-dark-cave.com", "/privacy")).toBe(
      "https://a-dark-cave.com/privacy",
    );
    expect(
      apexRedirectLocation("www.a-dark-cave.com:443", "/?ref=1"),
    ).toBe("https://a-dark-cave.com/?ref=1");
    expect(apexRedirectLocation("WWW.A-DARK-CAVE.COM", "/")).toBe(
      "https://a-dark-cave.com/",
    );
  });

  it("leaves apex and other hosts alone", () => {
    expect(apexRedirectLocation("a-dark-cave.com", "/privacy")).toBeNull();
    expect(apexRedirectLocation("localhost", "/")).toBeNull();
    expect(apexRedirectLocation(undefined, "/")).toBeNull();
  });

  it("middleware issues a 301 for www and continues otherwise", () => {
    const redirect = vi.fn();
    const next = vi.fn();
    apexRedirectMiddleware(
      { hostname: "www.a-dark-cave.com", originalUrl: "/terms" } as never,
      { redirect } as never,
      next,
    );
    expect(redirect).toHaveBeenCalledWith(301, "https://a-dark-cave.com/terms");
    expect(next).not.toHaveBeenCalled();

    apexRedirectMiddleware(
      { hostname: "a-dark-cave.com", originalUrl: "/terms" } as never,
      { redirect } as never,
      next,
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
