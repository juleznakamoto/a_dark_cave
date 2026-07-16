import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { LOOPBACK_PREFERRED_PORT } from "./paths";
import { startLoopbackServer } from "./loopbackServer";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (closers.length > 0) {
    const close = closers.pop();
    await close?.();
  }
});

async function makeStaticRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "adc-loopback-"));
  await writeFile(join(dir, "index.html"), "<!doctype html><title>ok</title>");
  closers.push(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}

describe("startLoopbackServer", () => {
  it("binds the preferred stable port so localStorage origin stays fixed", async () => {
    const root = await makeStaticRoot();
    const server = await startLoopbackServer(root);
    closers.push(server.close);

    expect(server.url).toBe(`http://127.0.0.1:${LOOPBACK_PREFERRED_PORT}`);
  });

  it("falls back to an ephemeral port when the preferred port is busy", async () => {
    const blocker = createServer((_req, res) => res.end("busy"));
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(LOOPBACK_PREFERRED_PORT, "127.0.0.1", () => resolve());
    });
    closers.push(
      () =>
        new Promise<void>((resolve) => {
          blocker.close(() => resolve());
        }),
    );

    const root = await makeStaticRoot();
    const server = await startLoopbackServer(root);
    closers.push(server.close);

    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(server.url).not.toBe(`http://127.0.0.1:${LOOPBACK_PREFERRED_PORT}`);
  });
});
