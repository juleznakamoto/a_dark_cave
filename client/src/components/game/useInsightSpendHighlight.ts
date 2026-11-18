import { useEffect } from "react";
import { useGameStore } from "@/game/state";

/** Spend animations that still want the insight row lit. */
let insightHighlightOwners = 0;

export function resetInsightHighlightOwnersForTests(): void {
  insightHighlightOwners = 0;
}

function releaseInsightHighlight(
  setHighlightedResources: (resources: string[]) => void,
): void {
  if (insightHighlightOwners > 0) return;
  const current = useGameStore.getState().highlightedResources;
  if (
    Array.isArray(current) &&
    current.length === 1 &&
    current[0] === "insight"
  ) {
    setHighlightedResources([]);
  }
}

function claimInsightHighlight(
  setHighlightedResources: (resources: string[]) => void,
): () => void {
  insightHighlightOwners += 1;
  setHighlightedResources(["insight"]);
  return () => {
    insightHighlightOwners = Math.max(0, insightHighlightOwners - 1);
    releaseInsightHighlight(setHighlightedResources);
  };
}

/**
 * Light the insight row for an insight spend animation, then release it.
 * Mouse leave is ignored while the animation plays, and the button often
 * unmounts when it ends, so nothing else clears the highlight.
 */
export function useInsightSpendHighlight(playing: boolean): void {
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );

  useEffect(() => {
    if (!playing) return;
    return claimInsightHighlight(setHighlightedResources);
  }, [playing, setHighlightedResources]);
}

/**
 * Insight buttons that vanish on click never receive a mouse leave.
 * Drop the insight highlight when this control unmounts.
 */
export function useReleaseInsightHighlightOnUnmount(): void {
  const setHighlightedResources = useGameStore(
    (s) => s.setHighlightedResources,
  );

  useEffect(() => {
    return () => releaseInsightHighlight(setHighlightedResources);
  }, [setHighlightedResources]);
}
