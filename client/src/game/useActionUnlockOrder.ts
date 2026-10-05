import { useLayoutEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import {
  listsEqual,
  mergeUnlockOrder,
  orderByUnlock,
  type UnlockOrderOptions,
} from "@/game/actionUnlockOrder";

type UnlockBatch = {
  ids: string[];
  appendLastIds?: readonly string[];
};

/**
 * Orders the buttons on screen by first-seen order and remembers new ones
 * on the save. Call `order` during render for each visible list.
 */
export function useActionUnlockOrder() {
  const remembered = useGameStore((s) => s.actionUnlockOrder ?? []);
  const batchesRef = useRef<UnlockBatch[]>([]);
  batchesRef.current = [];

  useLayoutEffect(() => {
    const batches = batchesRef.current;
    if (batches.length === 0) return;
    useGameStore.setState((state) => {
      let current = state.actionUnlockOrder ?? [];
      for (const batch of batches) {
        current = mergeUnlockOrder(current, batch.ids, {
          appendLastIds: batch.appendLastIds,
        });
      }
      if (listsEqual(current, state.actionUnlockOrder ?? [])) return state;
      return { actionUnlockOrder: current };
    });
  });

  return {
    remembered,
    order<T>(
      visibleInCatalogOrder: readonly T[],
      getId: (item: T) => string,
      options?: UnlockOrderOptions,
    ): T[] {
      const ids = visibleInCatalogOrder.map(getId);
      batchesRef.current.push({
        ids,
        appendLastIds: options?.appendLastIds,
      });
      return orderByUnlock(
        visibleInCatalogOrder,
        remembered,
        getId,
        options,
      );
    },
  };
}
