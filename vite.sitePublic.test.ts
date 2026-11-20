import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isPackagedGameBuild,
  removeSiteOnlyPublic,
} from "./vite.sitePublic";

const tempDirs: string[] = [];

function makeOutDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "adc-site-public-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("isPackagedGameBuild", () => {
  it("treats the website build as the build that keeps site files", () => {
    expect(isPackagedGameBuild({})).toBe(false);
    expect(isPackagedGameBuild({ VITE_STEAM_DEMO: "1" })).toBe(false);
  });

  it("treats Steam, iOS, itch, and CrazyGames as packaged game builds", () => {
    expect(isPackagedGameBuild({ VITE_STEAM_BUILD: "1" })).toBe(true);
    expect(
      isPackagedGameBuild({ VITE_STEAM_BUILD: "1", VITE_STEAM_DEMO: "1" }),
    ).toBe(true);
    expect(isPackagedGameBuild({ VITE_IOS_BUILD: "1" })).toBe(true);
    expect(isPackagedGameBuild({ VITE_ITCH: "1" })).toBe(true);
    expect(isPackagedGameBuild({ VITE_CRAZYGAMES: "1" })).toBe(true);
  });
});

describe("removeSiteOnlyPublic", () => {
  it("drops newsletter, press, and crawler files and leaves game files", () => {
    const outDir = makeOutDir();
    fs.mkdirSync(path.join(outDir, "email", "icons"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "email", "light-fire.gif"), "gif");
    fs.mkdirSync(path.join(outDir, "press-kit", "video"), { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "press-kit", "video", "trailer.mp4"),
      "mp4",
    );
    fs.writeFileSync(path.join(outDir, "robots.txt"), "robots");
    fs.writeFileSync(path.join(outDir, "robots.txt.gz"), "robots-gz");
    fs.writeFileSync(path.join(outDir, "sitemap.xml"), "sitemap");
    fs.writeFileSync(path.join(outDir, "llms.txt"), "llms");
    fs.writeFileSync(path.join(outDir, "llms-full.txt"), "llms-full");
    fs.writeFileSync(path.join(outDir, "og-image.png"), "og");
    fs.writeFileSync(path.join(outDir, "og-image-1200x630.png"), "og-wide");
    fs.mkdirSync(path.join(outDir, "sounds"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "sounds", "hunt.mp3"), "hunt");
    fs.writeFileSync(path.join(outDir, "boot.js"), "boot");

    const removed = removeSiteOnlyPublic(outDir);

    expect(removed).toEqual([
      "email",
      "press-kit",
      "robots.txt",
      "robots.txt.gz",
      "sitemap.xml",
      "llms.txt",
      "llms-full.txt",
      "og-image.png",
      "og-image-1200x630.png",
    ]);
    expect(fs.existsSync(path.join(outDir, "email"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "press-kit"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "robots.txt"))).toBe(false);
    expect(fs.existsSync(path.join(outDir, "robots.txt.gz"))).toBe(false);
    expect(fs.readFileSync(path.join(outDir, "boot.js"), "utf8")).toBe("boot");
    expect(fs.readFileSync(path.join(outDir, "sounds", "hunt.mp3"), "utf8")).toBe(
      "hunt",
    );
  });
});
