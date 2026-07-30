import { useLayoutEffect } from "react";
import { mountFatalErrorScreen } from "@/lib/fatalErrorScreen";

/**
 * React entry for the dig-deeper fatal UI.
 * Delegates to the shared DOM mount so markup stays in one place.
 */
export default function PageErrorScreen({ reason }: { reason?: unknown } = {}) {
  useLayoutEffect(() => {
    mountFatalErrorScreen(reason);
  }, [reason]);

  // Opaque backdrop until the shared DOM overlay mounts (same frame via layout effect).
  return (
    <div
      className="fixed inset-0 z-[2147483646] bg-black"
      role="alert"
      aria-live="assertive"
    />
  );
}

export { mountFatalErrorScreen } from "@/lib/fatalErrorScreen";
