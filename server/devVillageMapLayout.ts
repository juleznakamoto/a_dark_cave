import type { Express, Request, Response } from "express";

/** Dev only. The village-map demo posts its arrangement here and the game layout file is rewritten. */
export function registerDevVillageMapLayout(app: Express): void {
  if (process.env.NODE_ENV === "production") return;
  app.post("/api/dev/village-map-layout", async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object" || (req.body as { version?: unknown }).version !== 1) {
        res.status(400).json({ error: "That JSON does not match this map." });
        return;
      }
      const modulePath = new URL("../scripts/export-village-map-layout.ts", import.meta.url);
      const { writeVillageMapLayout } = await import(modulePath.href);
      const result = writeVillageMapLayout(req.body);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not write the village map layout";
      res.status(400).json({ error: message });
    }
  });
}
