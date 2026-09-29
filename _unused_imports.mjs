import fs from "fs";

const files = [
  "client/src/pages/village-map-demo/geometry.test.ts",
  "client/src/pages/village-map-demo/pathways.test.ts",
  "client/src/pages/village-map-demo/trees.test.ts",
  "client/src/pages/village-map-demo.tsx",
  "client/src/pages/building-shape-demo.tsx",
  "client/src/pages/dev-dashboard.tsx",
  "client/src/components/game/VillageMapOverlay.tsx",
  "client/src/game/villageMapEdit.test.ts",
];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const names = [];
  const importRe = /import\s+(type\s+)?(?:\{([^}]+)\}|([A-Za-z0-9_]+))/g;
  let m;
  while ((m = importRe.exec(text))) {
    if (m[2]) {
      for (const part of m[2].split(",")) {
        const bit = part.trim();
        if (!bit) continue;
        const name = bit.split(/\s+as\s+/).pop().replace(/^type\s+/, "").trim();
        if (name) names.push(name);
      }
    } else if (m[3] && m[3] !== "type") {
      names.push(m[3]);
    }
  }
  const unused = [];
  for (const name of names) {
    const hits = text.match(new RegExp(`\\b${name}\\b`, "g")) ?? [];
    if (hits.length <= 1) unused.push(name);
  }
  if (unused.length) console.log(file + "\n  " + unused.join(", "));
}
console.log("done");
