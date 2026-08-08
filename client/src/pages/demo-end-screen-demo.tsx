import { useEffect } from "react";
import { Redirect } from "wouter";
import DemoTimeUpDialog from "@/components/game/DemoTimeUpDialog";
import { useGameStore } from "@/game/state";

/**
 * Dev-only preview of the Galaxy / Steam demo end modal
 * (`DemoTimeUpDialog` — wooden-hut cap reached).
 */
export default function DemoEndScreenDemo() {
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    if (!isDev) return;
    useGameStore.setState({ galaxyTimeUpDialogOpen: true });
    return () => {
      useGameStore.setState({ galaxyTimeUpDialogOpen: false });
    };
  }, [isDev]);

  if (!isDev) {
    return <Redirect to="/" />;
  }

  return (
    // Keep page chrome below Radix Dialog (z-50); a high z-index shell hid the modal.
    <div className="min-h-[100dvh] bg-black">
      <div className="absolute left-3 top-3 z-10 rounded bg-neutral-900/90 px-2 py-1 text-2xs text-neutral-400">
        /dev/demo-end | Steam / Galaxy demo end dialog
      </div>
      <DemoTimeUpDialog preview />
    </div>
  );
}
