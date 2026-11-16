/** Web / Steam builds never call this. The iOS build uses the real plugin. */
export const Style = { Dark: "DARK", Light: "LIGHT" } as const;

export const StatusBar = {
  setStyle: async (): Promise<void> => {},
  setOverlaysWebView: async (): Promise<void> => {},
  setBackgroundColor: async (): Promise<void> => {},
};
