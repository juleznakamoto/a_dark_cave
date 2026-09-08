import {
  getActionLabel,
  getActionDescription,
  type ActionLabelOptions,
} from "./resolveGameText";

/** Resolve localized action button label (falls back to rules definition). */
export function resolveActionLabel(
  actionId: string,
  fallback: string,
  options?: ActionLabelOptions,
): string {
  return getActionLabel(actionId, fallback, options);
}

/** Resolve localized action description for tooltips. */
export function resolveActionDescription(
  actionId: string,
  fallback: string | undefined,
): string | undefined {
  return getActionDescription(actionId, fallback);
}
