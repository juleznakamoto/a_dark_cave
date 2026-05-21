/**
 * Helpers for split ui/*.json locale shards (merged at runtime into ui namespace).
 */
import fs from "node:fs";
import path from "node:path";

export function listUiShards(localeDir) {
  const uiDir = path.join(localeDir, "ui");
  if (!fs.existsSync(uiDir)) return [];
  return fs
    .readdirSync(uiDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
}

export function loadUiMerged(localeDir) {
  const merged = {};
  for (const file of listUiShards(localeDir)) {
    const data = JSON.parse(
      fs.readFileSync(path.join(localeDir, "ui", file), "utf8"),
    );
    Object.assign(merged, data);
  }
  return merged;
}

export function flatten(obj, p = "") {
  const r = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const key = p ? `${p}.${k}` : k;
    if (typeof v === "string") r.push([key, v]);
    else if (v && typeof v === "object") r.push(...flatten(v, key));
  }
  return r;
}

export function setDeep(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Find which ui shard file owns a top-level key (e.g. auth -> auth.json). */
export function findUiShardForKey(localeDir, topKey) {
  const uiDir = path.join(localeDir, "ui");
  for (const file of listUiShards(localeDir)) {
    const data = JSON.parse(fs.readFileSync(path.join(uiDir, file), "utf8"));
    if (Object.prototype.hasOwnProperty.call(data, topKey)) return file;
  }
  return null;
}

export function loadNamespace(localeDir, ns) {
  if (ns === "ui") {
    const uiDir = path.join(localeDir, "ui");
    if (fs.existsSync(uiDir) && listUiShards(localeDir).length > 0) {
      return loadUiMerged(localeDir);
    }
    const monolith = path.join(localeDir, "ui.json");
    if (fs.existsSync(monolith)) {
      return JSON.parse(fs.readFileSync(monolith, "utf8"));
    }
    return {};
  }
  return JSON.parse(
    fs.readFileSync(path.join(localeDir, `${ns}.json`), "utf8"),
  );
}

export function writeUiKey(localeDir, keyPath, value) {
  const topKey = keyPath.split(".")[0];
  const shard = findUiShardForKey(localeDir, topKey);
  if (!shard) {
    throw new Error(`No ui shard owns top-level key "${topKey}" for ${keyPath}`);
  }
  const shardPath = path.join(localeDir, "ui", shard);
  const data = JSON.parse(fs.readFileSync(shardPath, "utf8"));
  setDeep(data, keyPath, value);
  fs.writeFileSync(shardPath, JSON.stringify(data, null, 2) + "\n");
}

export function writeNamespace(localeDir, ns, data) {
  if (ns === "ui") {
    const uiDir = path.join(localeDir, "ui");
    if (!fs.existsSync(uiDir)) {
      fs.writeFileSync(
        path.join(localeDir, "ui.json"),
        JSON.stringify(data, null, 2) + "\n",
      );
      return;
    }
    for (const file of listUiShards(localeDir)) {
      const shardPath = path.join(uiDir, file);
      const enShardPath = shardPath.replace(
        `${path.sep}de${path.sep}`,
        `${path.sep}en${path.sep}`,
      );
      const enShard = fs.existsSync(enShardPath)
        ? JSON.parse(fs.readFileSync(enShardPath, "utf8"))
        : {};
      const out = {};
      for (const topKey of Object.keys(enShard)) {
        if (data[topKey] !== undefined) out[topKey] = data[topKey];
      }
      if (Object.keys(out).length > 0) {
        fs.writeFileSync(shardPath, JSON.stringify(out, null, 2) + "\n");
      }
    }
    return;
  }
  fs.writeFileSync(
    path.join(localeDir, `${ns}.json`),
    JSON.stringify(data, null, 2) + "\n",
  );
}
