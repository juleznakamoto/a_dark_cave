---
name: Cruel knight burden event
overview: Add a cruel-mode-only, timed-tab lore event after the Restless Knight joins the fellowship, with timeProbability 30, 5-minute tab duration. On Accept, grant the blessing Knight's Burden (+5 madness, +5 knowledge, +2.5% combat critical hit chance via generalBonuses—not madnessFromEvents). Decline and fallback still apply -1 madnessFromEvents.
todos:
  - id: blessing-schema-effects
    content: "Add `knights_burden` to `blessings` in shared/schema.ts and clothingEffects (effects.ts): Knight's Burden with madness 5, knowledge 5, criticalChance 2.5 (percentage points, same pattern as blood_baptized in effects.ts)."
    status: completed
  - id: new-event
    content: "Add `restlessKnightBurden` in eventsLore.ts: cruel + fellowship, timeProbability 30, 5m timed tab, non-repeatable, Accept grants blessing only (no +madnessFromEvents), Decline/fallback -1 madnessFromEvents, log copy matches tone."
    status: completed
  - id: tests
    content: "Optional: condition tests for cruel + fellowship; blessing state if tested."
    status: completed
isProject: false
---

# Cruel-only Restless Knight burden event

## Context (from codebase)

- **Timed tab**: `showAsTimedTab: true`, `timedTabDuration` in **milliseconds** (e.g. [`eventsFellowship.ts`](client/src/game/rules/eventsFellowship.ts) wizard: `3 * 60 * 1000`). For **5 minutes**: `5 * 60 * 1000`.
- **Cruel gate**: `state.cruelMode` (see [`shared/schema.ts`](shared/schema.ts) `cruelMode`, and usage in [`eventsGambler.ts`](client/src/game/rules/eventsGambler.ts)).
- **Fellowship**: `state.fellowship.restless_knight === true` is set when the player recruits the knight in [`restlessKnightDesert`](client/src/game/rules/eventsLore.ts) (pay gold/silver/convince paths set `fellowship.restless_knight: true`).
- **Time-based rolls**: `timeProbability: 30` means ~30 **in-game minutes** average between rolls (see [`EventManager.checkEvents`](client/src/game/rules/events.ts)).
- **Blessings**: Persisted booleans under `state.blessings`. [`getActiveEffects`](client/src/game/rules/effectsCalculation.ts) merges active blessings via keys that match definitions in **`clothingEffects`** in [`effects.ts`](client/src/game/rules/effects.ts) (same pattern as `bell_blessing`, `ebon_grace`, etc.). Stat bonuses use `bonuses.generalBonuses` (`madness`, `knowledge`, `criticalChance`, …). **`criticalChance`** is stored as **percentage points** (e.g. `blood_baptized` uses `criticalChance: 5` for 5%; use **`2.5`** for +2.5% combat crit). Total madness blends effect `madness` with `madnessFromEvents` in [`getTotalMadness`](client/src/game/rules/effectsCalculation.ts)—so **+5 madness from this blessing comes from `generalBonuses.madness`, not from incrementing `stats.madnessFromEvents` on Accept.**

## Implementation steps

1. **Schema** — In [`shared/schema.ts`](shared/schema.ts), add a boolean to the `blessings` object, e.g. `knights_burden: z.boolean().default(false)` (snake_case like other keys).

2. **Effect definition** — In [`client/src/game/rules/effects.ts`](client/src/game/rules/effects.ts), add a `clothingEffects` entry with the **same id** as the schema key (e.g. `knights_burden`):
   - **name**: `Knight's Burden` (display name).
   - **description**: Short, dark; ties to the knight’s secret (implants, desert, mass grave) without repeating the full event text; mention sharper strikes / combat edge if you fold in the crit bonus in prose.
   - **bonuses.generalBonuses**: `madness: 5`, `knowledge: 5`, `criticalChance: 2.5` (+2.5% critical hit chance in combat).

3. **Event** — In [`client/src/game/rules/eventsLore.ts`](client/src/game/rules/eventsLore.ts), add `restlessKnightBurden` (merge is already via `loreEvents` / `gameEvents`):
   - `condition`: `state.cruelMode && state.fellowship.restless_knight`.
   - `timeProbability`: `30`, `repeatable`: `false`, `priority`: `3`, `showAsTimedTab`: `true`, `timedTabDuration`: `5 * 60 * 1000`.
   - **Accept** `effect`: set `blessings: { ...state.blessings, knights_burden: true }` (use the chosen key). **Do not** add +5 to `stats.madnessFromEvents`; madness, knowledge, and combat crit chance come only from the blessing’s `generalBonuses`. `_logMessage`: revelation + that the knowledge sits with you like a wound (tone matches other `restlessKnight*` lines).
   - **Decline** and **fallbackChoice**: unchanged mechanic — `stats.madnessFromEvents` **-1** and fitting short log (burden stays his).
4. **Copy**: Setup and accept _logMessage_ stay tight and cold; decline/fallback minimal.

## Tests (optional)

- Condition false without `cruelMode` or without `restless_knight`; true with both (and without prior `triggeredEvents` if asserted in test harness).
- Optionally assert Accept sets `blessings.knights_burden` and does not bump `madnessFromEvents`.
