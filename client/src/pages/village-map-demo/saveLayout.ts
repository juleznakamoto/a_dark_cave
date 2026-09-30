import type { DemoSnapshot } from "@/pages/village-map-demo/catalog";

export type SavedVillageMapLayout = {
  positions: number;
  pathBends: number | "kept";
  trees: number | "kept";
  drift: number;
};

function countOrKept(value: unknown): value is number | "kept" {
  return typeof value === "number" || value === "kept";
}

function savedLayout(payload: unknown): SavedVillageMapLayout | null {
  if (!payload || typeof payload !== "object") return null;
  const value = payload as Record<string, unknown>;
  if (typeof value.positions !== "number") return null;
  if (!countOrKept(value.pathBends) || !countOrKept(value.trees)) return null;
  if (typeof value.drift !== "number") return null;
  return {
    positions: value.positions,
    pathBends: value.pathBends,
    trees: value.trees,
    drift: value.drift,
  };
}

/** Ask the dev server to freeze this arrangement into the game layout. */
export async function saveVillageMapToGame(snapshot: DemoSnapshot): Promise<SavedVillageMapLayout> {
  const response = await fetch("/api/dev/village-map-layout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Could not save the layout.";
    throw new Error(message);
  }
  const saved = savedLayout(payload);
  if (!saved) throw new Error("Could not save the layout.");
  return saved;
}
