import { Component, type ErrorInfo, type ReactNode } from "react";
import { hardReload } from "@/lib/hardReload";
import {
  buildingsDebugSnapshot,
  debugAgentLog,
  formatStoredDebugAgentLogs,
} from "@/lib/debugAgentLog";
import { useGameStore } from "@/game/state";

type Props = {
  children: ReactNode;
  /** Shown when a lazy route chunk fails to load (e.g. stale HTML after deploy). */
  label?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
  componentStack: string | null;
  debugDump: string | null;
};

/**
 * Recovers from failed dynamic imports instead of leaving a permanent Suspense black screen.
 */
export default class LazyRouteErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: null,
    componentStack: null,
    debugDump: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorMessage: error?.message ? String(error.message) : null,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const snap = useGameStore.getState();
    const buildingsSnap = buildingsDebugSnapshot(snap);
    // #region agent log
    debugAgentLog(
      "LazyRouteErrorBoundary.tsx:componentDidCatch",
      "Caught render/chunk error",
      {
        errorMessage: error?.message ?? String(error),
        componentStack: (info.componentStack ?? "").slice(0, 800),
        ...buildingsSnap,
      },
      "A",
    );
    // #endregion
    const trail = formatStoredDebugAgentLogs(15);
    this.setState({
      componentStack: info.componentStack
        ? String(info.componentStack).slice(0, 600)
        : null,
      debugDump: `buildings=${JSON.stringify(buildingsSnap)}\n${trail}`,
    });
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
        {this.state.componentStack ? (
          <pre className="max-h-32 max-w-md overflow-auto whitespace-pre-wrap break-words text-left font-mono text-[10px] text-neutral-600">
            {this.state.componentStack}
          </pre>
        ) : null}
        {this.state.debugDump ? (
          <pre className="max-h-48 max-w-md overflow-auto whitespace-pre-wrap break-words text-left font-mono text-[10px] text-amber-700/90">
            {this.state.debugDump}
          </pre>
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
