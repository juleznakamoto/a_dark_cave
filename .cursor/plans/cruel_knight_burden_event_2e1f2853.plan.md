---
name: Cruel knight burden event
overview: Add a cruel-mode-only, timed-tab lore event after the Restless Knight joins the fellowship, with timeProbability 30, 5-minute tab duration, and accept/decline madness effects.
todos:
  - id: new-event
    content: "Add `restlessKnightBurden` timed-tab event: cruel + fellowship, timeProbability 30, 5m tab, accept/decline madness + fallback, non-repeatable."
    status: pending
  - id: tests
    content: "Optional: condition unit tests for cruel and fellowship gating."
    status: pending
isProject: false
---

# Cruel-only Restless Knight burden event

## Context (from codebase)

- **Timed tab**: `showAsTimedTab: true`, `timedTabDuration` in **milliseconds** (e.g. [`eventsFellowship.ts`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/eventsFellowship.ts) wizard: `3 * 60 * 1000`). For **5 minutes**: `5 * 60 * 1000`.
- **Cruel gate**: `state.cruelMode` (see [`shared/schema.ts`](c:/Users/bauer/.cursor/a_dark_cave/shared/schema.ts) `cruelMode`, and usage in [`eventsGambler.ts`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/eventsGambler.ts)).
- **Fellowship**: `state.fellowship.restless_knight === true` is set when the player recruits the knight in [`restlessKnightDesert`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/eventsLore.ts) (pay gold/silver/convince paths set `fellowship.restless_knight: true`).
- **Time-based rolls**: `timeProbability: 30` means ~30 **in-game minutes** average between rolls (see probability math in [`EventManager.checkEvents`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/events.ts)).

## Implementation steps

1. **Add a new `GameEvent`** in [`client/src/game/rules/eventsLore.ts`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/eventsLore.ts), exported via existing `loreEvents` / [`gameEvents`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/events.ts) merge (no import list change if the object is only extended in `eventsLore.ts`).

   Suggested shape (align with nearby knight events: priority `3`, timed tab, optional `skipEventLog` if you want parity with the wizard—only add if you need the same log behavior):

   - `id`: e.g. `restlessKnightBurden` (unique string).
   - `condition`: `state.cruelMode` && `state.fellowship.restless_knight`.
   - `timeProbability`: `30`.
   - `repeatable`: **`false`** (one confession; uses persisted `triggeredEvents` when the event **fires** per [`EventManager`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/events.ts)).
   - `showAsTimedTab`: `true`.
   - `timedTabDuration`: `5 * 60 * 1000`.
   - `fallbackChoice`: same mechanical + narrative effect as **decline** (sad knight, `-1` `madnessFromEvents`) so timer expiry is not a third outcome.
   - `choices`:
     - **Accept**: `stats.madnessFromEvents` **+5**; `_logMessage` with the desert collector, skull implants on bought slaves, failed attempts, mass grave (tight, second-person, tone-matched to existing knight lore in the same file).
     - **Decline**: `stats.madnessFromEvents` **-1**; `_logMessage` that he withdraws, burden stays his, sorrow (no extra systems).

2. **Copy** (for implementation, not a separate doc): Keep lines short and cold, like existing `restlessKnight*` strings—setup: he steps close, says he kept one sight to himself; he thinks you can carry it. Accept line: name the desert collector of old devices, forced implants, the pit of dead. Decline line: few words, his silence, your relief at a cost.

3. **Tests (optional but useful)**: Add a small focused test file (pattern from [`eventsTradersSon.test.ts`](c:/Users/bauer/.cursor/a_dark_cave/client/src/game/rules/eventsTradersSon.test.ts)) that builds a minimal `GameState` and asserts the **condition** is false when `cruelMode` is false or `restless_knight` is false, and true when cruel and knight and not already triggered.
