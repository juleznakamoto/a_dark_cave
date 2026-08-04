import { readFileSync } from "fs";
import { gameStateSchema } from "../shared/schema";
import {
  PERSISTED_STORE_EXTENSION_KEYS,
  RUNTIME_ONLY_NON_DIALOG_KEYS,
  SCHEMA_KEYS_STRIPPED_ON_SAVE,
  buildPersistedGameState,
} from "../client/src/game/persistedStateBoundary";
import { getDialogRuntimeOnlyKeys } from "../client/src/game/dialogRegistry";

const src = readFileSync("./client/src/game/state.ts", "utf8");
const loadStart = src.indexOf("loadGame:");
const chunk = src.slice(loadStart, loadStart + 80000);
const keys = new Set<string>();
for (const m of chunk.matchAll(
  /savedState(?: as \{ [^}]+ \})?\.([A-Za-z0-9_]+)/g,
)) {
  keys.add(m[1]!);
}
for (const m of chunk.matchAll(/\(([A-Za-z0-9_]+)\?:/g)) {
  keys.add(m[1]!);
}

const schema = new Set(Object.keys(gameStateSchema.shape));
const ext = new Set(PERSISTED_STORE_EXTENSION_KEYS as readonly string[]);
const runtime = new Set([
  ...(RUNTIME_ONLY_NON_DIALOG_KEYS as readonly string[]),
  ...getDialogRuntimeOnlyKeys(),
  ...(SCHEMA_KEYS_STRIPPED_ON_SAVE as readonly string[]),
]);

const noise = new Set(["number", "boolean", "string", "CM"]);
const drops: string[] = [];
for (const key of [...keys].sort()) {
  if (runtime.has(key) || schema.has(key) || ext.has(key) || noise.has(key)) {
    continue;
  }
  const probe: Record<string, unknown> = {
    resources: { wood: 1 },
    playTime: 1,
    [key]: true,
  };
  const persisted = buildPersistedGameState(probe);
  if (!Object.prototype.hasOwnProperty.call(persisted, key)) {
    drops.push(key);
  }
}

console.log(
  "load-hydrated keys missing from allowlist:\n" +
    (drops.length ? drops.join("\n") : "(none)"),
);
