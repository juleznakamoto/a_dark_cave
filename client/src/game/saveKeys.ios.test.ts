import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edition", async () => {
  const actual = await vi.importActual<typeof import("@/lib/edition")>(
    "@/lib/edition",
  );
  return {
    ...actual,
    isIosBuild: true,
    isSteamBuild: false,
    isSteamDemoBuild: false,
  };
});

import { getSaveKey } from "./saveKeys";
import { getSaveOriginEdition } from "./saveOrigin";

describe("iOS save identity", () => {
  it("uses its own IndexedDB key and origin stamp", () => {
    expect(getSaveKey()).toBe("iosSave");
    expect(getSaveOriginEdition()).toBe("ios");
  });
});
