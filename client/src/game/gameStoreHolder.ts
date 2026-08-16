/**
 * Late-bound Zustand access for modules that must not import `@/game/state`.
 *
 * `state.ts` imports `rules/index` and `events.ts`. Event files that imported
 * the store created a TDZ cycle in Vite:
 * `rules/index` → `eventsAttackWaves` → `state` → `events` → `eventsAttackWaves`
 * (`Cannot access 'attackWaveEvents' before initialization`).
 */

type GameStoreSnapshot = Record<string, unknown> & {
  isPaused?: boolean;
  attackWaveTimers?: Record<string, unknown>;
};

type GameStoreSetState = (
  partial:
    | Record<string, unknown>
    | ((prev: GameStoreSnapshot) => Record<string, unknown>),
) => void;

export type BoundGameStore = {
  getState: () => GameStoreSnapshot;
  setState: GameStoreSetState;
  isModalDialogOpen: (state: GameStoreSnapshot) => boolean;
};

let boundGameStore: BoundGameStore | null = null;

export function bindGameStore(next: BoundGameStore): void {
  boundGameStore = next;
}

export function getBoundGameStore(): BoundGameStore {
  if (!boundGameStore) {
    throw new Error("Game store used before bindGameStore()");
  }
  return boundGameStore;
}
