import { Component, type ErrorInfo, type ReactNode } from "react";
import PageErrorScreen from "@/components/ui/page-error-screen";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

/**
 * Catches render/lifecycle errors in the React tree (including failed lazy()
 * imports that reject into Suspense) and shows the dig-deeper error screen.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    void import("@/lib/logger").then(({ logger }) => {
      logger.error("[AppErrorBoundary]", error, info);
    });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return <PageErrorScreen reason={this.state.error} />;
  }
}
