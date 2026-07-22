import { useEffect, useState, type ComponentType, type ReactNode } from "react";

type TooltipProviderComponent = ComponentType<{ children?: ReactNode }>;
type ToasterComponent = ComponentType;

/**
 * Mount Radix TooltipProvider + Toaster after first paint / idle.
 * Keeps vendor-radix (and toast) off the critical start-screen path.
 * Start screen uses HoverCalloutTooltip only — no global provider needed there.
 */
export default function DeferredAppChrome({ children }: { children: ReactNode }) {
  const [TooltipProvider, setTooltipProvider] =
    useState<TooltipProviderComponent | null>(null);
  const [Toaster, setToaster] = useState<ToasterComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      void Promise.all([
        import("@/components/ui/tooltip"),
        import("@/components/ui/toaster"),
      ]).then(([tooltipMod, toasterMod]) => {
        if (cancelled) return;
        setTooltipProvider(() => tooltipMod.TooltipProvider);
        setToaster(() => toasterMod.Toaster);
      });
    };

    const ric = window.requestIdleCallback;
    if (typeof ric === "function") {
      idleId = ric.call(window, load, { timeout: 2500 });
    } else {
      timeoutId = setTimeout(load, 1);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  if (!TooltipProvider) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      {children}
      {Toaster ? <Toaster /> : null}
    </TooltipProvider>
  );
}
