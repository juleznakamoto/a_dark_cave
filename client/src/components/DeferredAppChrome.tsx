import { useEffect, useState, type ComponentType, type ReactNode } from "react";

type TooltipProviderComponent = ComponentType<{ children?: ReactNode }>;
type ToasterComponent = ComponentType;

/**
 * Mount Radix TooltipProvider + Toaster after the first user gesture.
 * Start screen uses HoverCalloutTooltip only — no global provider needed there.
 * Idle-loading still pulled vendor-radix during lab first-load traces.
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
