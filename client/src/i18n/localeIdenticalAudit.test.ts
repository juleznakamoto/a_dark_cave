import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findNewLeaks,
  isInterpolationOnly,
  isLeftoverEnglish,
} from "../../../scripts/audit-locale-identical.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("locale leftover-English audit", () => {
  it("treats interpolation-only templates as not leftover English", () => {
    expect(isInterpolationOnly("{{duration}}")).toBe(true);
    expect(isInterpolationOnly("+{{amount}} {{resource}}")).toBe(true);
    expect(isInterpolationOnly("{{source}}: {{effect}}")).toBe(true);
    expect(isInterpolationOnly("Game Mode")).toBe(false);
    expect(isInterpolationOnly("{{count}} min")).toBe(false);
  });

  it("skips brands and flags leftover English copy", () => {
    expect(isLeftoverEnglish("Steam", "Steam", "ui.feedback.steam")).toBe(
      false,
    );
    expect(
      isLeftoverEnglish("Game Mode", "Game Mode", "ui.settings.gameMode"),
    ).toBe(true);
    expect(
      isLeftoverEnglish("Game Mode", "Modo de juego", "ui.settings.gameMode"),
    ).toBe(false);
    expect(isLeftoverEnglish("Pause", "Pause", "ui.attackWaves.pause")).toBe(
      false,
    );
    expect(
      isLeftoverEnglish("250 Gold", "250 Gold", "events.payGold.cost"),
    ).toBe(false);
  });

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
    expect(stdout).toContain("Leftover English");
    expect(stdout).toContain("No new leftover-English keys");
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
