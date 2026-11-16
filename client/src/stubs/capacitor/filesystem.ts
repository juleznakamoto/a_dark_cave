/** Web / Steam builds never call these. The iOS build uses the real plugin. */
export const Directory = { Data: "DATA" } as const;
export const Encoding = { UTF8: "utf8" } as const;

export const Filesystem = {
  writeFile: async (): Promise<void> => {
    throw new Error("Capacitor filesystem stub");
  },
  readFile: async (): Promise<{ data: string }> => {
    throw new Error("Capacitor filesystem stub");
  },
  deleteFile: async (): Promise<void> => {
    throw new Error("Capacitor filesystem stub");
  },
};
