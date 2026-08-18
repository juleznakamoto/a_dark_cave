import * as React from "react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

type TooltipProviderComponent = ComponentType<{ children?: ReactNode }>;
type ToasterComponent = ComponentType;

/**
 * Mount Radix TooltipProvider + Toaster after the first user gesture.
 * Start screen uses HoverCalloutTooltip only — no global provider needed there.
 * Idle-loading still pulled vendor-radix during lab first-load traces.
 *
 * Do not wrap `{children}` in the deferred provider. Swapping Fragment →
 * TooltipProvider remounts the whole route tree and replays the start-screen
 * intro on the first click (language, social, or Make Fire).
 */
export default function DeferredAppChrome({ children }: { children: ReactNode }) {
  const [TooltipProvider, setTooltipProvider] =
    useState<TooltipProviderComponent | null>(null);
  const [Toaster, setToaster] = useState<ToasterComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      document.removeEventListener("pointerdown", load);
      document.removeEventListener("keydown", load);
      void Promise.all([
        import("@/components/ui/tooltip"),
        import("@/components/ui/toaster"),
      ]).then(([tooltipMod, toasterMod]) => {
        if (cancelled) return;
        setTooltipProvider(() => tooltipMod.TooltipProvider);
        setToaster(() => toasterMod.Toaster);
      });
    };

    document.addEventListener("pointerdown", load, { once: true });
    document.addEventListener("keydown", load, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener("pointerdown", load);
      document.removeEventListener("keydown", load);
    };
  }, []);

  return (
    <>
      {children}
      {TooltipProvider ? (
        <TooltipProvider>{Toaster ? <Toaster /> : null}</TooltipProvider>
      ) : null}
    </>
  );
}
