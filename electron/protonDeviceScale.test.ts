import { describe, expect, it } from "vitest";
import {
  PROTON_DEVICE_SCALE_FACTOR,
  isProtonProcess,
  protonForcedDeviceScale,
} from "./protonDeviceScale";

const protonEnv = { STEAM_COMPAT_DATA_PATH: "/home/play/.steam/steam/steamapps/compatdata/4882240" };

describe("proton device scale", () => {
  it("treats a Windows exe with a Proton prefix as Proton", () => {
    expect(isProtonProcess("win32", protonEnv)).toBe(true);
    expect(isProtonProcess("win32", {})).toBe(false);
    expect(isProtonProcess("win32", { STEAM_COMPAT_DATA_PATH: "  " })).toBe(false);
    expect(isProtonProcess("linux", protonEnv)).toBe(false);
  });

  it("forces 2 only for a Proton launch", () => {
    expect(
      protonForcedDeviceScale({
        platform: "win32",
        env: protonEnv,
        argv: ["game.exe"],
        scaleAlreadySet: false,
      }),
    ).toBe(PROTON_DEVICE_SCALE_FACTOR);

    expect(
      protonForcedDeviceScale({
        platform: "win32",
        env: {},
        argv: ["game.exe"],
        scaleAlreadySet: false,
      }),
    ).toBeNull();
  });

  it("leaves a player launch option and an already set scale alone", () => {
    expect(
      protonForcedDeviceScale({
        platform: "win32",
        env: protonEnv,
        argv: ["game.exe", "--force-device-scale-factor=1.5"],
        scaleAlreadySet: false,
      }),
    ).toBeNull();

    expect(
      protonForcedDeviceScale({
        platform: "win32",
        env: protonEnv,
        argv: ["game.exe", "--force-device-scale-factor"],
        scaleAlreadySet: false,
      }),
    ).toBeNull();

    expect(
      protonForcedDeviceScale({
        platform: "win32",
        env: protonEnv,
        argv: ["game.exe"],
        scaleAlreadySet: true,
      }),
    ).toBeNull();
  });
});
