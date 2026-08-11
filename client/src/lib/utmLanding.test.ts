/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edition", () => ({
  isLocalOnlyEdition: () => false,
}));

describe("reportUtmLanding", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("does not mark sent when sendBeacon refuses to queue", async () => {
    const sendBeacon = vi.fn(() => false);
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon,
    });

    const { reportUtmLanding } = await import("./utmLanding");
    reportUtmLanding({
      pathname: "/",
      search: "?utm_source=x&utm_medium=social&utm_campaign=game",
      hash: "",
    });

    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("utm_landing_sent")).toBeNull();
  });

  it("marks sent only after sendBeacon queues successfully", async () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon,
    });

    const { reportUtmLanding } = await import("./utmLanding");
    reportUtmLanding({
      pathname: "/",
      search: "?utm_source=x&utm_medium=social&utm_campaign=game",
      hash: "",
    });

    expect(sendBeacon).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem("utm_landing_sent")).toBe("1");
    expect(sessionStorage.getItem("st_sid")).toBeTruthy();
  });

  it("reuses the shared analytics session id", async () => {
    sessionStorage.setItem("st_sid", "shared-session-1");
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon,
    });

    const { reportUtmLanding } = await import("./utmLanding");
    reportUtmLanding({
      pathname: "/",
      search: "?utm_source=x&utm_medium=social&utm_campaign=game",
      hash: "",
    });

    const body = sendBeacon.mock.calls[0]?.[1];
    expect(body).toBeInstanceOf(Blob);
    const text = await (body as Blob).text();
    expect(JSON.parse(text).sid).toBe("shared-session-1");
  });

  it("marks sent only after fetch succeeds", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon: undefined,
    });
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const { reportUtmLanding } = await import("./utmLanding");
    reportUtmLanding({
      pathname: "/",
      search: "?utm_source=x&utm_medium=social&utm_campaign=game",
      hash: "",
    });

    expect(sessionStorage.getItem("utm_landing_sent")).toBeNull();
    await vi.waitFor(() => {
      expect(sessionStorage.getItem("utm_landing_sent")).toBe("1");
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("allows retry when fetch fails", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      sendBeacon: undefined,
    });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const { reportUtmLanding } = await import("./utmLanding");
    const location = {
      pathname: "/",
      search: "?utm_source=x&utm_medium=social&utm_campaign=game",
      hash: "",
    };

    reportUtmLanding(location);
    await expect(fetchMock.mock.results[0]?.value).rejects.toThrow("network");
    expect(sessionStorage.getItem("utm_landing_sent")).toBeNull();

    reportUtmLanding(location);
    await expect(fetchMock.mock.results[1]?.value).resolves.toMatchObject({
      ok: true,
    });
    expect(sessionStorage.getItem("utm_landing_sent")).toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
