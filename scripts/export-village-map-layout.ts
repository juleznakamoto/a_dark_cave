import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  applyGrowth,
  DEFAULT_TUNING,
  GROWTH_STEPS,
  sanitizeSnapshot,
} from "../client/src/pages/village-map-demo/catalog";
import {
  containSlots,
  layoutWallRadius,
  placedSlots,
  wallStrokeWidth,
  type Point,
} from "../client/src/pages/village-map-demo/geometry";

type MapTree = { id: string; variant: string; x: number; y: number; turn: number; size?: number };

export type VillageMapLayoutWriteResult = {
  positions: number;
  pathBends: number | "kept";
  trees: number | "kept";
  drift: number;
};

const layoutUrl = new URL("../client/src/game/villageMapLayout.ts", import.meta.url);

/** Ids are pasted into a TypeScript file. Keep the token set to letters, digits, and :.+- */
const SAFE_TOKEN = /^[\w:.+-]+$/;

function assertToken(value: string, label: string): string {
  if (!SAFE_TOKEN.test(value)) throw new Error(`unsafe ${label}`);
  return value;
}

function readArrangement(input: unknown): {
  dragged: Record<string, Point>;
  includePaths: boolean;
  includeTrees: boolean;
  pathOverrides: Record<string, Point>;
  trees: MapTree[];
  source: string;
} {
  if (input && typeof input === "object" && "version" in input) {
    const snapshot = sanitizeSnapshot(input);
    if (!snapshot) throw new Error("That JSON does not match this map.");
    return {
      dragged: snapshot.overrides,
      includePaths: true,
      includeTrees: true,
      pathOverrides: snapshot.pathOverrides,
      trees: snapshot.trees,
      source: "the village-map demo arrangement",
    };
  }
  const raw =
    input && typeof input === "object"
      ? (input as {
        overrides?: Record<string, Point>;
        pathOverrides?: Record<string, Point>;
        trees?: MapTree[];
      } & Record<string, Point>)
      : {};
  const dragged: Record<string, Point> =
    raw.overrides ??
    Object.fromEntries(Object.entries(raw).filter(([, point]) => typeof point?.x === "number"));
  return {
    dragged,
    includePaths: Object.prototype.hasOwnProperty.call(raw, "pathOverrides"),
    includeTrees: Object.prototype.hasOwnProperty.call(raw, "trees"),
    pathOverrides: raw.pathOverrides ?? {},
    trees: raw.trees ?? [],
    source: "the unmoved full-village layout",
  };
}

/** Turn a demo snapshot (or a flat point map) into the frozen game layout source. */
export function renderVillageMapLayout(
  input: unknown,
  source?: string,
): { file: string; result: VillageMapLayoutWriteResult } {
  const arrangement = readArrangement(input);
  const tuning = DEFAULT_TUNING;
  const build = applyGrowth(GROWTH_STEPS.length);
  const radius = layoutWallRadius(tuning);
  const thickness = wallStrokeWidth(build.wall, tuning.wallThickness);
  const slots = containSlots(
    placedSlots(build, tuning, arrangement.dragged),
    radius,
    tuning,
    thickness,
    build.wall,
  );
  const again = containSlots(
    placedSlots(
      build,
      tuning,
      Object.fromEntries(slots.map((slot) => [slot.id, { x: slot.x, y: slot.y }])),
    ),
    radius,
    tuning,
    thickness,
    build.wall,
  );
  let drift = 0;
  for (const slot of slots) {
    const next = again.find((item) => item.id === slot.id);
    if (!next) throw new Error(`missing ${slot.id}`);
    drift = Math.max(drift, Math.hypot(next.x - slot.x, next.y - slot.y));
  }
  if (drift > 1e-6) {
    throw new Error(`contained positions drift by ${drift} when reused as overrides`);
  }

  const lines = slots.map(
    (slot) => `  "${assertToken(slot.id, "slot")}": { x: ${Math.round(slot.x)}, y: ${Math.round(slot.y)} },`,
  );
  const previous = readFileSync(layoutUrl, "utf8");
  const kept = (name: string) => {
    const start = previous.indexOf(`export const ${name}`);
    if (start < 0) return "";
    const next = previous.indexOf("\nexport const ", start + 1);
    return previous.slice(start, next < 0 ? undefined : next).trimEnd();
  };
  const pathBlock = arrangement.includePaths
    ? `/** Road bends from the same arrangement. A handle sits on the named path. */
export const VILLAGE_MAP_PATH_OVERRIDES: Record<string, { x: number; y: number }> = {
${Object.entries(arrangement.pathOverrides)
      .map(
        ([id, point]) =>
          `  "${assertToken(id, "path")}": { x: ${Math.round(point.x)}, y: ${Math.round(point.y)} },`,
      )
      .join("\n")}
};`
    : kept("VILLAGE_MAP_PATH_OVERRIDES");
  const treeBlock = arrangement.includeTrees
    ? `/** Crowns from the same arrangement. */
export const VILLAGE_MAP_TREES: { id: string; variant: string; x: number; y: number; turn: number; size?: number }[] = [
${arrangement.trees
      .map((tree) => {
        const size = typeof tree.size === "number" ? `, size: ${Math.round(tree.size)}` : "";
        return `  { id: "${assertToken(tree.id, "tree")}", variant: "${assertToken(tree.variant, "tree variant")}", x: ${Math.round(tree.x)}, y: ${Math.round(tree.y)}, turn: ${Math.round(tree.turn)}${size} },`;
      })
      .join("\n")}
];`
    : kept("VILLAGE_MAP_TREES");
  const file = [
    `/** Full-village map positions, road bends, and trees, frozen for the game. Generated by scripts/export-village-map-layout.ts from ${source ?? arrangement.source}. */
export const VILLAGE_MAP_POSITIONS: Record<string, { x: number; y: number }> = {
${lines.join("\n")}
};`,
    pathBlock,
    treeBlock,
  ]
    .filter((part) => part.length > 0)
    .join("\n\n")
    .concat("\n");
  return {
    file,
    result: {
      positions: slots.length,
      pathBends: arrangement.includePaths ? Object.keys(arrangement.pathOverrides).length : "kept",
      trees: arrangement.includeTrees ? arrangement.trees.length : "kept",
      drift,
    },
  };
}

/** Write the frozen game layout from a demo snapshot or a point map. */
export function writeVillageMapLayout(input: unknown, source?: string): VillageMapLayoutWriteResult {
  const rendered = renderVillageMapLayout(input, source);
  writeFileSync(layoutUrl, rendered.file);
  return rendered.result;
}

function invokedAsCli(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedAsCli()) {
  const overridesPath = process.argv[2];
  const raw = overridesPath ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};
  const source = overridesPath ? "the village-map demo arrangement" : "the unmoved full-village layout";
  const result = writeVillageMapLayout(raw, source);
  const bends = result.pathBends === "kept" ? "kept" : String(result.pathBends);
  const trees = result.trees === "kept" ? "kept" : String(result.trees);
  console.log(
    `wrote ${result.positions} positions, ${bends} path bends, ${trees} trees from ${source}, drift ${result.drift}`,
  );
}
