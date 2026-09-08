import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findNewLeaks } from "../../../scripts/audit-locale-identical.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("locale leftover-English audit", () => {
  it("does not introduce new locale strings that still match English", () => {
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    try {
      stdout = execFileSync(
        process.execPath,
        [path.join(ROOT, "scripts/audit-locale-identical.mjs"), "--check"],
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
      stderr || stdout || "audit-locale-identical.mjs --check failed",
    ).toEqual(expect.objectContaining({ exitCode: 0 }));
  });

  it("treats a new identical key as a leak", () => {
    expect(
      findNewLeaks(
        { de: ["ui.shell.play"], fr: ["ui.shell.newLeak"] },
        { de: ["ui.shell.play"], fr: [] },
      ),
    ).toEqual(["fr\tui.shell.newLeak"]);
  });
});
