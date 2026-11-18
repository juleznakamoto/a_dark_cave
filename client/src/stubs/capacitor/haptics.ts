/** Web / Steam builds never call this. The iOS build uses the real plugin. */

export const ImpactStyle = {
  Heavy: "HEAVY",
  Medium: "MEDIUM",
  Light: "LIGHT",
} as const;

export const NotificationType = {
  Success: "SUCCESS",
  Warning: "WARNING",
  Error: "ERROR",
} as const;

export const Haptics = {
  impact: async (): Promise<void> => {},
  notification: async (): Promise<void> => {},
  vibrate: async (): Promise<void> => {},
  selectionStart: async (): Promise<void> => {},
  selectionChanged: async (): Promise<void> => {},
  selectionEnd: async (): Promise<void> => {},
};
