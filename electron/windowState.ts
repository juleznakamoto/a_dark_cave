/**
 * Steam shell window mode remembered across launches.
 * Missing or unreadable data means fullscreen, which is the first-launch default.
 */
export const WINDOW_STATE_FILE = "window-state.json";

export function parseWindowFullscreenPreference(
  raw: string | null | undefined,
): boolean {
  if (!raw) return true;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "fullscreen" in parsed &&
      typeof (parsed as { fullscreen: unknown }).fullscreen === "boolean"
    ) {
      return (parsed as { fullscreen: boolean }).fullscreen;
    }
  } catch {
    /* corrupt file: keep the first-launch default */
  }
  return true;
}

export function serializeWindowFullscreenPreference(fullscreen: boolean): string {
  return `${JSON.stringify({ fullscreen })}\n`;
}
