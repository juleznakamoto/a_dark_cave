import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("locale length audit", () => {
  it("locale JSON files have up-to-date length comments for long translations", () => {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    try {
      stdout = execFileSync(
        process.execPath,
        [path.join(ROOT, "scripts/audit-locale-length.mjs"), "--check"],
        { cwd: ROOT, encoding: "utf8" },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 1;
      stdout = e.stdout ?? "";
      stderr = e.stderr ?? "";
    }

    expect(
      { exitCode, stdout, stderr },
      stderr || stdout || "audit-locale-length.mjs --check failed",
    ).toEqual(expect.objectContaining({ exitCode: 0 }));
  });
});
