import { afterEach, describe, expect, it, vi } from "vitest";
import type { DemoSnapshot } from "@/pages/village-map-demo/catalog";
import { saveVillageMapToGame } from "@/pages/village-map-demo/saveLayout";

const snapshot = { version: 1 } as DemoSnapshot;

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}

describe("saveVillageMapToGame", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the layout counts from a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(JSON.stringify({ positions: 4, pathBends: "kept", trees: 2, drift: 0 })),
      ),
    );

    await expect(saveVillageMapToGame(snapshot)).resolves.toEqual({
      positions: 4,
      pathBends: "kept",
      trees: 2,
      drift: 0,
    });
  });

  it("throws when a successful response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse("not-json")));

    await expect(saveVillageMapToGame(snapshot)).rejects.toThrow("Could not save the layout.");
  });

  it("uses the server error message when the save is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(JSON.stringify({ error: "That JSON does not match this map." }), 400)),
    );

    await expect(saveVillageMapToGame(snapshot)).rejects.toThrow("That JSON does not match this map.");
  });
});
