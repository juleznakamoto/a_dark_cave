import { Component, type ErrorInfo, type ReactNode } from "react";
import PageErrorScreen from "@/components/ui/page-error-screen";
import {
  canAutoReloadForStaleChunk,
  isStaleChunkLoadFailure,
  recoverFromStaleChunkLoad,
} from "@/lib/hardReload";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  /** True while a stale-chunk hardReload navigation is in flight. */
  recovering: boolean;
  error?: unknown;
};

/**
 * Catches render/lifecycle errors in the React tree (including failed lazy()
 * imports that reject into Suspense) and shows the dig-deeper error screen.
 *
 * React.lazy attaches its own promise rejection handler, so stale chunk failures
 * do not become unhandledrejection — recovery must happen here.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, recovering: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Read-only guard check so the first paint stays black instead of flashing dig-deeper.
    const recovering =
      isStaleChunkLoadFailure(error) && canAutoReloadForStaleChunk();
    return { hasError: true, recovering, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isStaleChunkLoadFailure(error)) {
      // Starts hardReload, or mounts dig-deeper if the one-shot guard was already used.
      recoverFromStaleChunkLoad(error);
      return;
    }

    void import("@/lib/logger").then(({ logger }) => {
      logger.error("[AppErrorBoundary]", error, info);
    });
  }

  render() {
    if (this.state.recovering) {
      // Keep the black shell while location.replace runs — avoid flashing dig-deeper.
      return (
        <div
          className="fixed inset-0 z-[2147483646] bg-black"
          role="status"
          aria-live="polite"
          aria-busy="true"
        />
      );
    }

    if (!this.state.hasError) {
      return this.props.children;
    }

    return <PageErrorScreen reason={this.state.error} />;
  }
}
