import { Component, type ErrorInfo, type ReactNode } from "react";
import { hardReload } from "@/lib/hardReload";

type Props = {
  children: ReactNode;
  /** Shown when a lazy route chunk fails to load (e.g. stale HTML after deploy). */
  label?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
};

/**
 * Recovers from failed dynamic imports instead of leaving a permanent Suspense black screen.
 */
export default class LazyRouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ? String(error.message) : null,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void import("@/lib/logger").then(({ logger }) => {
      logger.error("[LazyRouteErrorBoundary] Chunk load failed:", error, info);
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const label = this.props.label ?? "Something went wrong loading the game.";

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-neutral-400">
        <p className="max-w-md text-sm leading-relaxed">{label}</p>
        {this.state.errorMessage ? (
          <p className="max-w-md break-words font-mono text-xs text-neutral-500">
            {this.state.errorMessage}
          </p>
        ) : null}
        <button
          type="button"
          className="rounded border border-neutral-600 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-400 hover:text-white"
          onClick={() => {
            void hardReload();
          }}
        >
          Reload game
        </button>
      </div>
    );
  }
}
