/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useGameStore } from "@/game/state";
import {
  resetInsightHighlightOwnersForTests,
  useInsightSpendHighlight,
  useReleaseInsightHighlightOnUnmount,
} from "@/components/game/useInsightSpendHighlight";

function SpendProbe({ playing }: { playing: boolean }) {
  useInsightSpendHighlight(playing);
  return null;
}

function UnmountProbe() {
  useReleaseInsightHighlightOnUnmount();
  return null;
}

describe("insight spend highlight", () => {
  beforeEach(() => {
    resetInsightHighlightOwnersForTests();
    useGameStore.setState({ highlightedResources: [] });
  });

  afterEach(() => {
    resetInsightHighlightOwnersForTests();
    useGameStore.setState({ highlightedResources: [] });
  });

  it("releases the insight highlight when the spend animation ends", () => {
    const view = render(<SpendProbe playing />);
    expect(useGameStore.getState().highlightedResources).toEqual(["insight"]);

    view.rerender(<SpendProbe playing={false} />);
    expect(useGameStore.getState().highlightedResources).toEqual([]);
  });

  it("releases the insight highlight when the button unmounts mid-animation", () => {
    const view = render(<SpendProbe playing />);
    expect(useGameStore.getState().highlightedResources).toEqual(["insight"]);

    view.unmount();
    expect(useGameStore.getState().highlightedResources).toEqual([]);
  });

  it("leaves a different resource highlight alone when the animation ends", () => {
    const view = render(<SpendProbe playing />);
    useGameStore.setState({ highlightedResources: ["wood"] });

    view.rerender(<SpendProbe playing={false} />);
    expect(useGameStore.getState().highlightedResources).toEqual(["wood"]);
  });

  it("keeps the insight highlight until every overlapping animation ends", () => {
    const first = render(<SpendProbe playing />);
    const second = render(<SpendProbe playing />);

    first.rerender(<SpendProbe playing={false} />);
    expect(useGameStore.getState().highlightedResources).toEqual(["insight"]);

    second.rerender(<SpendProbe playing={false} />);
    expect(useGameStore.getState().highlightedResources).toEqual([]);
  });

  it("releases the insight highlight when a click removes the button", () => {
    useGameStore.setState({ highlightedResources: ["insight"] });
    const view = render(<UnmountProbe />);

    view.unmount();
    expect(useGameStore.getState().highlightedResources).toEqual([]);
  });
});
