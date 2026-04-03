/**
 * Writes dist/build-meta.json after the production bundle exists.
 * Enables /api/version to expose the Git commit without manual env updates (e.g. Replit).
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");
const outFile = join(distDir, "build-meta.json");

mkdirSync(distDir, { recursive: true });

const git = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf-8",
});
const sha =
  git.status === 0 && typeof git.stdout === "string"
    ? git.stdout.trim() || null
    : null;

const builtAt = new Date().toISOString();

writeFileSync(outFile, `${JSON.stringify({ sha, builtAt })}\n`, "utf-8");
