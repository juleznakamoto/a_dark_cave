/**
 * Build a Windows Vista+ style .ico that embeds PNGs (no DIB/BMP).
 * Usage: node scripts/pngsToIco.mjs <out.ico> <a.png> [b.png ...]
 */
import fs from "node:fs";

function pngsToIco(pngBuffers) {
  const n = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(n, 4);

  const dataOffset = 6 + n * 16;
  const entries = [];
  let offset = dataOffset;

  for (const png of pngBuffers) {
    if (png.length < 29 || png[0] !== 0x89 || png.toString("ascii", 1, 4) !== "PNG") {
      throw new Error("Each input must be a PNG buffer");
    }
    const w = png.readUInt32BE(16);
    const h = png.readUInt32BE(20);
    const e = Buffer.alloc(16);
    e.writeUInt8(w >= 256 ? 0 : w, 0);
    e.writeUInt8(h >= 256 ? 0 : h, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(0, 4); // planes — 0 with PNG payload (Vista+)
    e.writeUInt16LE(0, 6); // bit count — 0 with PNG payload
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

const [outPath, ...pngPaths] = process.argv.slice(2);
if (!outPath || pngPaths.length === 0) {
  console.error("Usage: node scripts/pngsToIco.mjs <out.ico> <a.png> [b.png ...]");
  process.exit(1);
}

const bufs = pngPaths.map((p) => fs.readFileSync(p));
fs.writeFileSync(outPath, pngsToIco(bufs));
console.log("Wrote", outPath, `(${bufs.length} PNGs)`);
