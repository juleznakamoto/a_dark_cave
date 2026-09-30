import fs from "node:fs";
import { analyzeSource } from "./split-village-modules.mjs";
import { createRequire } from "node:module";

const src = fs.readFileSync("tmp/geometry-orig.ts", "utf8");
const { lines, decls } = analyzeSource(src);
const index = decls.findIndex((decl) => decl.name === "mapFramePoints");
const chunk = decls.slice(index);
const text = chunk.map((decl) => lines.slice(decl.start - 1, decl.end).join("\n")).join("\n");
console.log("raw ringPoints", text.includes("ringPoints"), "decls", chunk.length);

const emit = fs.readFileSync("tmp/emit-splits.mjs", "utf8");
const start = emit.indexOf("function maskNonCode");
const end = emit.indexOf("function eagerNames");
const maskNonCode = eval(`${emit.slice(start, end)}\nmaskNonCode`);
const masked = maskNonCode(text);
console.log("masked ringPoints", masked.includes("ringPoints"));
const at = text.indexOf("ringPoints");
console.log(JSON.stringify(text.slice(at - 30, at + 24)));
console.log("--- masked slice ---");
console.log(JSON.stringify(masked.slice(at - 30, at + 24)));
