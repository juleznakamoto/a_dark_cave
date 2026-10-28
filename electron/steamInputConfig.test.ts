import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

describe("Steam Deck input layout", () => {
  const manifest = readFileSync(
    join(root, "steam", "input", "steam_input_manifest.vdf"),
    "utf8",
  );
  const deck = readFileSync(
    join(root, "steam", "input", "controller_neptune.vdf"),
    "utf8",
  );

  it("points Steam Deck controllers at the bundled layout", () => {
    expect(manifest).toContain('"controller_neptune"');
    expect(manifest).toContain('"path"\t\t"controller_neptune.vdf"');
  });

  it("maps trackpads, click, tabs, and pause", () => {
    expect(deck).toContain('"controller_type"\t\t"controller_neptune"');
    expect(deck).toContain('"mode"\t\t"absolute_mouse"');
    expect(deck).toContain('"mode"\t\t"scrollwheel"');
    expect(deck).toContain('"binding"\t\t"mouse_button LEFT"');
    expect(deck).toContain('"binding"\t\t"key_press LEFT_ARROW"');
    expect(deck).toContain('"binding"\t\t"key_press RIGHT_ARROW"');
    expect(deck).toContain('"binding"\t\t"key_press P"');
    expect(deck).toContain('"3"\t\t"right_trackpad active"');
    expect(deck).toContain('"7"\t\t"left_trackpad active"');
    expect(deck).toContain('"5"\t\t"right_trigger active"');
  });

  it("is packed beside the exe for the full game and the demo", () => {
    const builder = readFileSync(join(root, "electron-builder.yml"), "utf8");
    const demo = readFileSync(join(root, "electron-builder.demo.yml"), "utf8");
    expect(builder).toContain("from: steam/input");
    expect(builder).toContain("to: steam_input");
    expect(demo).toMatch(/^extends:\s*electron-builder\.yml/m);
  });
});
