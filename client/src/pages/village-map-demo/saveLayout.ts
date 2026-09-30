import type { DemoSnapshot } from "@/pages/village-map-demo/catalog";

export type SavedVillageMapLayout = {
  positions: number;
  pathBends: number | "kept";
  trees: number | "kept";
  drift: number;
};

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
  return payload as SavedVillageMapLayout;
}
