/** Web / Steam builds never call this. The iOS build uses the real plugin. */
export const App = {
  addListener: async (): Promise<{ remove: () => Promise<void> }> => ({
    remove: async () => {},
  }),
};
