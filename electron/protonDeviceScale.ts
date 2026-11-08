/**
 * Proton launches the Windows exe at 96 DPI, so a DPI-aware Electron window
 * ignores the Linux desktop scale. 2 matches a 200% desktop, which is the
 * scale players asked for. A launch option still wins.
 */
export const PROTON_DEVICE_SCALE_FACTOR = "2";

const DEVICE_SCALE_SWITCH = "--force-device-scale-factor";

/** Steam sets this for the Proton prefix. It is empty on a normal Windows launch. */
export function isProtonProcess(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): boolean {
  if (platform !== "win32") return false;
  const compat = env.STEAM_COMPAT_DATA_PATH;
  return typeof compat === "string" && compat.trim() !== "";
}

export function argvAlreadySetsDeviceScale(argv: readonly string[]): boolean {
  return argv.some((arg) => arg.split("=", 1)[0] === DEVICE_SCALE_SWITCH);
}

/**
 * Scale to force before the app is ready, or null when this launch should
 * keep Chromium's own scale (Windows, trailer capture, or a player switch).
 */
export function protonForcedDeviceScale(input: {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  argv: readonly string[];
  scaleAlreadySet: boolean;
}): string | null {
  if (input.scaleAlreadySet || argvAlreadySetsDeviceScale(input.argv)) return null;
  if (!isProtonProcess(input.platform, input.env)) return null;
  return PROTON_DEVICE_SCALE_FACTOR;
}
