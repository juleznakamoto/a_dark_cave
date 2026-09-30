import { create } from "zustand";
import { bindGameStore } from "@/game/gameStoreHolder";
import { getCurrentPopulation } from "@/game/population";
import { defaultGameState } from "./createInitialState";
import { isModalDialogOpen } from "./dialogScheduling";
import type { GameStore } from "./types";
import { initialRuntimeState } from "./slices/initialRuntimeState";
import { createUiSlice } from "./slices/uiSlice";
import { createActionsSlice } from "./slices/actionsSlice";
import { createLifecycleSlice } from "./slices/lifecycleSlice";
import { createEventsSlice } from "./slices/eventsSlice";
import { createVillagersSlice } from "./slices/villagersSlice";
import { createMerchantSlice } from "./slices/merchantSlice";
import { createDialogsSlice } from "./slices/dialogsSlice";
import { createLoopSlice } from "./slices/loopSlice";

export const useGameStore = create<GameStore>((set, get, store) => {
  const a = [set, get, store] as const;
  return {
    ...defaultGameState,
    ...initialRuntimeState,
    ...createUiSlice(...a),
    ...createActionsSlice(...a),
    ...createLifecycleSlice(...a),
    ...createEventsSlice(...a),
    ...createVillagersSlice(...a),
    ...createMerchantSlice(...a),
    ...createDialogsSlice(...a),
    ...createLoopSlice(...a),
    // Must live on the root object (not a spread slice): object spread invokes
    // getters and would call get() before villagers exist during create().
    get current_population() {
      return getCurrentPopulation(get());
    },
  } as GameStore;
});

bindGameStore({
  getState: () => useGameStore.getState() as unknown as Record<string, unknown>,
  setState: (partial) => {
    useGameStore.setState(
      partial as unknown as Parameters<typeof useGameStore.setState>[0],
    );
  },
  subscribe: (listener) => useGameStore.subscribe(listener),
  isModalDialogOpen: (state) =>
    isModalDialogOpen(state as unknown as GameStore),
});
