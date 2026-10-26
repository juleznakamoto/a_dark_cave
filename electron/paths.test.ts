import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const APP_DATA = join("Users", "x", "AppData", "Roaming");

describe("electron/paths Steam Cloud locations", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.ADC_STEAM_DEMO_BUILD;
  });

  it("full build writes the shared Auto-Cloud path", async () => {
    const { resolveSteamCloudSavePath, STEAM_CLOUD_SAVE_FILE, APP_USER_DATA_NAME } =
      await import("./paths");
    expect(APP_USER_DATA_NAME).toBe("A Dark Cave");
    expect(STEAM_CLOUD_SAVE_FILE).toBe("adc-steam-save.dat");
    expect(resolveSteamCloudSavePath(APP_DATA)).toBe(
      join(APP_DATA, "A Dark Cave", "adc-steam-save.dat"),
    );
  });

  it("demo build keeps Electron userData isolated and writes its own cloud file", async () => {
    process.env.ADC_STEAM_DEMO_BUILD = "1";
    const {
      resolveSteamCloudSavePath,
      resolveSteamDemoCloudSavePath,
      resolveLegacyDemoSavePath,
      STEAM_CLOUD_SAVE_FILE,
      STEAM_FULL_CLOUD_SAVE_FILE,
      APP_USER_DATA_NAME,
    } = await import("./paths");
    expect(APP_USER_DATA_NAME).toBe("A Dark Cave Demo");
    expect(STEAM_CLOUD_SAVE_FILE).toBe("adc-steam-demo-save.dat");
    expect(STEAM_FULL_CLOUD_SAVE_FILE).toBe("adc-steam-save.dat");
    expect(
      resolveSteamCloudSavePath(APP_DATA),
    ).toBe(join(APP_DATA, "A Dark Cave", "adc-steam-demo-save.dat"));
    expect(resolveSteamDemoCloudSavePath(APP_DATA)).toBe(
      join(APP_DATA, "A Dark Cave", "adc-steam-demo-save.dat"),
    );
    expect(resolveLegacyDemoSavePath(APP_DATA)).toBe(
      join(APP_DATA, "A Dark Cave Demo", "adc-steam-demo-save.dat"),
    );
  });

});
