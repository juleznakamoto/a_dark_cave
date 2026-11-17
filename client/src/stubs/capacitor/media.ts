/** Web / Steam builds never call this. The iOS build uses the real plugin. */
export const Media = {
  savePhoto: async (): Promise<void> => {
    throw new Error("Capacitor media stub");
  },
};
