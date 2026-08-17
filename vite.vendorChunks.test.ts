import { describe, expect, it } from "vitest";
import { packageNameFromId, vendorManualChunk } from "./vite.vendorChunks";

describe("vendorManualChunk", () => {
  const web = { offlineStubs: false };
  const steam = { offlineStubs: true };

  it("keeps React JSX runtime in vendor-react", () => {
    expect(
      vendorManualChunk("/repo/node_modules/react/jsx-runtime.js", web),
    ).toBe("vendor-react");
    expect(
      vendorManualChunk("/repo/node_modules/react-dom/client.js", web),
    ).toBe("vendor-react");
    expect(
      vendorManualChunk("/repo/node_modules/scheduler/index.js", steam),
    ).toBe("vendor-react");
  });

  it("does not create framer, radix, or supabase vendor chunks", () => {
    expect(
      vendorManualChunk(
        "/repo/node_modules/framer-motion/dist/es/index.mjs",
        web,
      ),
    ).toBeUndefined();
    expect(
      vendorManualChunk(
        "/repo/node_modules/@radix-ui/react-dialog/dist/index.mjs",
        web,
      ),
    ).toBeUndefined();
    expect(
      vendorManualChunk(
        "/repo/node_modules/@supabase/supabase-js/dist/module/index.js",
        web,
      ),
    ).toBeUndefined();
    expect(
      vendorManualChunk(
        "/repo/node_modules/@stripe/stripe-js/lib/index.mjs",
        web,
      ),
    ).toBeUndefined();
  });

  it("does not assign app modules or other libraries", () => {
    expect(vendorManualChunk("/repo/client/src/main.tsx", web)).toBeUndefined();
    expect(
      vendorManualChunk(
        "/repo/node_modules/react-i18next/dist/es/index.js",
        web,
      ),
    ).toBeUndefined();
    expect(packageNameFromId("/repo/node_modules/.vite/deps/foo.js")).toBeNull();
  });
});
