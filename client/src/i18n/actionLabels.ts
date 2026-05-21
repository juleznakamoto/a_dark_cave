import { getActionLabel, getActionDescription } from "./resolveGameText";

/** Resolve localized action button label (falls back to rules definition). */
export function resolveActionLabel(
  actionId: string,
  fallback: string,
): string {
  return getActionLabel(actionId, fallback);
}

/** Resolve localized action description for tooltips. */
export function resolveActionDescription(
  actionId: string,
  fallback: string | undefined,
): string | undefined {
  return getActionDescription(actionId, fallback);
}
