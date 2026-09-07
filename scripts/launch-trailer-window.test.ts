import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import {
  applyDevSave,
  parseArgs,
  resolveLiveOrigin,
} from "./launch-trailer-window.mjs";

describe("launch-trailer-window parseArgs", () => {
  it("appends --devSave to an explicit URL", () => {
    expect(
      parseArgs(["http://localhost:6000", "--devSave=sleep-active"]).url,
    ).toBe("http://localhost:6000/?devSave=sleep-active");
  });

  it("keeps other query params when adding --devSave", () => {
    expect(
      parseArgs(["http://localhost:6000/?foo=1", "--devSave=village"]).url,
    ).toBe("http://localhost:6000/?foo=1&devSave=village");
  });

  it("lets --devSave replace an existing query value on the URL", () => {
    expect(
      parseArgs([
        "http://localhost:5000/?devSave=village",
        "--devSave=sleep-active",
      ]).url,
    ).toBe("http://localhost:5000/?devSave=sleep-active");
  });

  it("leaves an explicit URL alone when --devSave is omitted", () => {
    expect(parseArgs(["http://localhost:6000/?devSave=village"]).url).toBe(
      "http://localhost:6000/?devSave=village",
    );
  });

  it("still applies --devSave to the constructed local URL", () => {
    expect(parseArgs(["--port=5000", "--devSave=bastion"]).url).toBe(
      "http://127.0.0.1:5000/?devSave=bastion",
    );
  });

  it("marks constructed URLs as not explicit", () => {
    expect(parseArgs(["--port=5173"]).explicitUrl).toBe(false);
    expect(parseArgs(["http://127.0.0.1:5173/"]).explicitUrl).toBe(true);
  });

  it("applyDevSave writes the fixture onto an origin", () => {
    expect(applyDevSave("http://127.0.0.1:5173/", "village")).toBe(
      "http://127.0.0.1:5173/?devSave=village",
    );
  });

  it("resolveLiveOrigin finds a local HTTP 200 on the preferred port", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200);
      res.end("ok");
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      server.close();
      throw new Error("expected tcp address");
    }
    try {
      await expect(resolveLiveOrigin(address.port, 400)).resolves.toBe(
        `http://127.0.0.1:${address.port}/`,
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
