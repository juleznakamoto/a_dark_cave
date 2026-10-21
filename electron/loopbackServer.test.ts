import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  STEAM_LOOPBACK_PORT_BASE,
  STEAM_LOOPBACK_PORT_SPAN,
  loopbackPortCandidates,
  parseStoredLoopbackPort,
  startLoopbackServer,
  type LoopbackServer,
} from "./loopbackServer";

const openServers: Array<Server | LoopbackServer> = [];

afterEach(async () => {
  await Promise.all(
    openServers.splice(0).map(async (server) => {
      if ("url" in server) {
        await server.close();
        return;
      }
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }),
  );
});

function holdPort(port: number): Promise<Server> {
  const server = createServer();
  openServers.push(server);
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function ephemeralPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  return port;
}

describe("loopback port memory", () => {
  it("keeps a saved port inside the Steam range", () => {
    expect(parseStoredLoopbackPort(`${STEAM_LOOPBACK_PORT_BASE}\n`)).toBe(
      STEAM_LOOPBACK_PORT_BASE,
    );
    expect(parseStoredLoopbackPort(String(STEAM_LOOPBACK_PORT_BASE + STEAM_LOOPBACK_PORT_SPAN - 1))).toBe(
      STEAM_LOOPBACK_PORT_BASE + STEAM_LOOPBACK_PORT_SPAN - 1,
    );
  });

  it("ignores empty, junk, and out-of-range ports", () => {
    expect(parseStoredLoopbackPort(null)).toBeNull();
    expect(parseStoredLoopbackPort("")).toBeNull();
    expect(parseStoredLoopbackPort("nope")).toBeNull();
    expect(parseStoredLoopbackPort(String(STEAM_LOOPBACK_PORT_BASE - 1))).toBeNull();
    expect(parseStoredLoopbackPort(String(STEAM_LOOPBACK_PORT_BASE + STEAM_LOOPBACK_PORT_SPAN))).toBeNull();
  });

  it("tries the saved port before the rest of the range", () => {
    const saved = STEAM_LOOPBACK_PORT_BASE + 4;
    const candidates = loopbackPortCandidates(saved);
    expect(candidates[0]).toBe(saved);
    expect(candidates).toHaveLength(STEAM_LOOPBACK_PORT_SPAN);
    expect(new Set(candidates).size).toBe(STEAM_LOOPBACK_PORT_SPAN);
  });
});

describe("startLoopbackServer", () => {
  it("reuses the saved port so the page origin stays put", async () => {
    const base = await ephemeralPort();
    const range = { base, span: 4 };
    const root = await mkdtemp(join(tmpdir(), "adc-loopback-"));
    await writeFile(join(root, "index.html"), "<p>cave</p>", "utf-8");

    try {
      const first = await startLoopbackServer(root, null, range);
      openServers.push(first);
      expect(first.url).toBe(`http://127.0.0.1:${base}`);
      expect(first.port).toBe(base);

      const again = await startLoopbackServer(root, first.port, range);
      openServers.push(again);
      expect(again.port).not.toBe(first.port);

      await first.close();
      openServers.splice(openServers.indexOf(first), 1);
      const restored = await startLoopbackServer(root, base, range);
      openServers.push(restored);
      expect(restored.url).toBe(`http://127.0.0.1:${base}`);

      const response = await fetch(`${restored.url}/village`);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("cave");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("steps to the next port when the saved one is taken", async () => {
    const base = await ephemeralPort();
    const range = { base, span: 3 };
    await holdPort(base);
    const root = await mkdtemp(join(tmpdir(), "adc-loopback-"));

    try {
      const server = await startLoopbackServer(root, base, range);
      openServers.push(server);
      expect(server.port).toBe(base + 1);
      expect(server.url).toBe(`http://127.0.0.1:${base + 1}`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
