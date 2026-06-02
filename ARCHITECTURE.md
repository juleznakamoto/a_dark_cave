# ARCHITECTURE — A Dark Cave

> **Purpose:** This is the code map. Read it FIRST to locate code quickly instead of
> searching blindly. It is kept current automatically: a `stop` hook
> (`.cursor/hooks/architecture-update-check.mjs`) detects when files are added,
> removed, or renamed under `client/`, `server/`, `shared/`, `supabase/`, `scripts/`,
> or `gender-service/` and asks the agent to refresh the relevant section here.
>
> If you change the project structure, update the matching table below in the same change.

A Dark Cave is a text-based incremental browser game (inspired by *A Dark Room*). It is a
single Node package serving an **Express API + Vite React SPA**. Almost all game logic lives
in the client; **Supabase** handles auth/cloud saves and **Stripe** handles payments.

---

## Top-level layout

| Path | What lives here |
|------|-----------------|
| `client/` | React SPA: UI, game engine, i18n, assets. Vite root. |
| `server/` | Express server: API routes, Stripe/referral/marketing, dev Vite middleware, prod static serving. |
| `shared/` | Cross-cutting TypeScript shared by client + server: Zod schemas, shop/referral pricing. |
| `supabase/` | SQL migrations + edge function (`functions/save-game/`) for Postgres/RLS. |
| `scripts/` | Build & i18n tooling (`extract-i18n.mjs`, `write-build-meta.mjs`, locale sync, etc.). |
| `gender-service/` | Internal Python Flask service for first-name gender inference (localhost only). |
| `public/`, `attached_assets/` | Static assets (`@assets` alias → `attached_assets`). |
| `dist/` | Build output (`dist/public` client, `dist/index.js` server). |
| `.cursor/` | Agent config: `rules/`, `hooks.json`, `hooks/`. |

**Root config:** `package.json` (scripts/deps), `vite.config.ts` (client build, aliases, chunks),
`tsconfig.json` (includes `client/src`, `shared`, `server`), `vitest.config.ts` + `vitest.setup.ts`,
`tailwind.config.ts`, `components.json` (shadcn/ui), `drizzle.config.ts`.

**Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets` → `attached_assets`.

---

## Tech stack (quick facts)

- **Language:** TypeScript 5.6 (strict), Node ≥22.
- **Frontend:** React 18, Wouter (routing), TanStack React Query, Framer Motion, Howler (audio), Recharts (admin).
- **State:** **Zustand 5** — single store in `client/src/game/state.ts`.
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix primitives) + `class-variance-authority`.
- **Build:** Vite 5 (client), esbuild (server bundle), terser.
- **Validation:** Zod (`shared/schema.ts` is the schema source of truth).
- **i18n:** i18next + react-i18next, JSON locale shards.
- **Auth/DB:** Supabase. **Payments:** Stripe. **Local saves:** IndexedDB via `idb`.
- **Server:** Express 4. **Tests:** Vitest 4 + Testing Library.

---

## Most important files (start here)

| Path | One-liner |
|------|-----------|
| `client/src/game/state.ts` | Zustand store: game state + UI slice + all gameplay actions. Largest, central file. |
| `client/src/game/loop.ts` | rAF simulation loop (~4 FPS): production, events, autosave, timers, pause gates. |
| `client/src/game/actions.ts` | Action execution dispatch — maps action IDs to handlers, applies costs/effects. |
| `client/src/game/rules/index.ts` | Action visibility/affordability (`shouldShowAction`, `canExecuteAction`) + event aggregation (`allEvents`). |
| `client/src/game/rules/actionsRegistry.ts` | Central `gameActions` map; action modules register via `registerActions()`. |
| `client/src/game/save.ts` | Load/save orchestration: IndexedDB + Supabase cloud diff sync. |
| `client/src/game/stateHelpers.ts` | Pure state mutations + `buildGameState()` + `UI_ONLY_PROPERTIES` (keys excluded from saves). |
| `shared/schema.ts` | Zod `gameStateSchema` / `SaveData` + shared shop constants. |
| `client/src/components/game/GameContainer.tsx` | Main game UI shell: tabs, panel switching, mounts all dialogs, hotkeys. |
| `client/src/pages/game.tsx` | Game page init: auth, loop start/stop, payment return handling. |
| `client/src/i18n/index.ts` | i18next bootstrap (eager-globs locale JSON). |
| `server/index.ts` | Express API + static hosting entry point. |

---

## Client structure (`client/src/`)

| Directory | Role | Key files |
|-----------|------|-----------|
| entry | React root → router | `main.tsx`, `App.tsx`, `index.html`, `index.css` |
| `pages/` | Route-level components (lazy-loaded) | `start-screen-page.tsx`, `game.tsx`, `end-screen.tsx`, `reset-password.tsx`, `withdrawal.tsx`, `not-found.tsx`, `admin/dashboard.tsx` |
| `game/` | **Game engine** (see below) | `state.ts`, `loop.ts`, `actions.ts`, `save.ts`, `saveCodec.ts`, `stateHelpers.ts`, `auth.ts`, `constants.ts`, `rules/` |
| `components/game/` | Game-specific UI | `GameContainer.tsx`, `GameTabs.tsx`, `GameButton.tsx`, `panels/`, `*Dialog.tsx`, `EndScreen.tsx` |
| `components/ui/` | shadcn/ui design system + game visuals | `button.tsx`, `card.tsx`, `dialog`, `toast.tsx`, `mist-background.tsx`, `cloud-shader.tsx`, `limelight-nav.tsx` |
| `hooks/` | React hooks | `use-toast.ts`, `useCooldown.ts`, `use-mobile.tsx` |
| `i18n/` | Localization (see below) | `index.ts`, `locales.ts`, `resolveGameText.ts`, `logDisplay.ts`, `locales/` |
| `lib/` | Cross-cutting utilities | `logger.ts` (always use instead of `console.*`), `queryClient.ts`, `sessionTracker.ts`, `tailwindColors.ts`, Supabase/audio clients |
| `achievements/` | Achievement configs, charts, claim logic | — |

**Lazy-loading:** start screen loads first; the full `Game` chunk loads only after "Light Fire"
or when a saved `gameStarted` flag exists — keeps the initial bundle small.

---

## Game engine (`client/src/game/`)

Data-flow mental model:

```
UI (GameContainer, panels, dialogs)
  ↕ useGameStore (Zustand)
state.ts        — GameStore = persisted GameState + UI slice + store methods
  ↕
loop.ts         — rAF ~4 FPS: production cycle, events, autosave, timers, pause gates
  ↕
rules/          — declarative actions + events (data-driven, not a runtime VM)
actions.ts      — dispatch action ID → handler, deduct costs, run effects
stateHelpers.ts — pure mutations + buildGameState() / UI_ONLY_PROPERTIES
save.ts         — IndexedDB + Supabase cloud sync
shared/schema.ts— Zod GameState schema (source of truth for persisted shape)
```

- **`state.ts`** — central Zustand store. Exports `useGameStore`, `createInitialState()`,
  `StateManager` (batched derived-stat recompute), `isModalDialogOpen()` (sim freeze gate),
  `shouldBlockGameHotkeys()`, `detectRewards()`.
- **`loop.ts`** — `TARGET_FPS = 4`. ~15s production cycle (`PRODUCTION_INTERVAL`), fixed tick
  (`TICK_INTERVAL` from `constants.ts`), pause gates (manual pause, idle, inactivity,
  `isModalDialogOpen`, full-game purchase gate), autosave (15s guest / 60s signed-in cloud diff),
  attack-wave timer, play-time accumulation. Started/stopped from `pages/game.tsx` via
  `startGameLoop()` / `stopGameLoop()`.
- **`rules/`** — `actionsRegistry.ts` (central `gameActions`), per-area action modules
  (`caveExploreActions.ts`, `villageBuildActions.ts`, `forestSacrificeActions.ts`,
  `bastionActions.ts`, …), `index.ts` (visibility/affordability + `allEvents`), effects
  (`actionEffects.ts`, `effectsCalculation.ts`, `costCalculation.ts`), events (`events.ts`
  → `EventManager`, `LogEntry`, plus topic files `events*.ts`), `insightReveal.ts`, tooltips.
- **Action path:** UI → `useGameStore.executeAction(id)` → `actions.ts` maps ID → `handle*`
  function in a rule module → `StateManager.scheduleEffectsUpdate()` recomputes derived stats.
- **Event path:** `loop.ts`/store → `checkEvents()` → `EventManager` evaluates `allEvents`
  → opens `EventDialog` or `timedEventTab`.

---

## State persistence

- **`stateHelpers.ts`** — `UI_ONLY_PROPERTIES` lists store keys excluded from saves (dialog
  flags, `activeTab`, transient timers). `buildGameState(state)` strips UI keys + functions and
  forces `isPaused: false` on save.
- **`save.ts`** — IndexedDB (`ADarkCaveDB`); guest saves encode via `saveCodec.ts`
  (XOR+Base64, `ADC2:` prefix); signed-in saves diff against last cloud state → Supabase.
  Load applies migrations (e.g. `migrateTraderShopUnlockOnLoad`).
- **`auth.ts`** — Supabase auth, `saveGameToSupabase`/`loadGameFromSupabase`, referral metadata.
- **`shared/schema.ts`** — Zod schema = source of truth; `createInitialState()` derives defaults from it.

> **Modal-pause convention:** blocking dialogs must be added to `isNonRewardBlockingModalOpen`
> in `state.ts`, and UI-only dialog flags must be listed in `UI_ONLY_PROPERTIES`
> (`stateHelpers.ts`). See `.cursor/rules/modal-dialog-pause.mdc`.

---

## i18n (`client/src/i18n/`)

- **`index.ts`** — i18next bootstrap; eager `import.meta.glob` of `locales/*/*.json` and
  `locales/*/ui/*.json`. UI namespace assembled from shards under `locales/{lang}/ui/`.
- **`locales.ts`** — supported: **en, de, fr, es, zh-CN, ru**. Namespaces: `common`, `ui`,
  `shop`, `actions`, `effects`, `events`, `achievements`.
- **Resolution:** `resolveGameText.ts` (`tWithFallback`, resource/log names), `eventText.ts`,
  `eventDisplay.ts`, `logDisplay.ts`, `actionLabels.ts`, `tooltipLabels.ts`.
- **Pattern:** game logic stores English fallback + optional `logKey`/`i18nKey`; UI resolves at
  display time. Parity maintained by `scripts/` (`i18n:verify`, `sync-locale-keys.mjs`).

---

## Server (`server/`)

`server/index.ts` serves the SPA (Vite dev middleware or precompressed static in prod) and
rate-limited `/api/*` routes.

| Route group | Module | Purpose |
|-------------|--------|---------|
| `/api/payment/*` | `stripe.ts` | Stripe checkout intents + verification |
| `/api/referral/*` | `referral.ts`, `referralCodes.ts` | Referral codes & rewards |
| `/api/marketing/*` | `marketing.ts` | Email prefs, unsubscribe |
| `/api/leaderboard/*`, `/api/account/*`, `/api/session/ping` | inline + Supabase | Leaderboard, account deletion, session heartbeat |
| `/api/gender` | proxies `gender-service/app.py` | First-name gender for marketing CSVs |
| `/api/admin/*` | inline | Admin dashboard metrics (DAU/sessions/purchases) |
| `/api/version`, `/api/config` | build meta | Version + public Supabase keys |

Support: `server/vite.ts` (dev/prod hosting), `server/supabaseServerClient.ts` (service-role client),
`server/stripeFxQuote.ts`, `server/resendContactCsv.ts`.

---

## Testing

- **Runner:** Vitest 4 (`vitest.config.ts`, env `node`, aliases `@`/`@shared`; `vitest.setup.ts`
  adds jest-dom + `ResizeObserver` polyfill).
- **Layout:** `*.test.ts` / `*.test.tsx` co-located with source.
- **Coverage:** engine (`state.test.ts`, `loop.test.ts`, `save*.test.ts`, `rules/*.test.ts`),
  i18n (`i18n/*.test.ts`), server (`stripe*.test.ts`, `referral*.test.ts`), shared, components.
- **Run:** `npm test` (watch) or `npm run i18n:verify` (i18n subset + audits).

---

## Conventions

1. **Single game store** — all gameplay reads/writes go through `useGameStore`; UI state is mixed
   in but stripped on save via `UI_ONLY_PROPERTIES`.
2. **Declarative actions/events** — actions are objects (`show_when`, `cost`, `effects`,
   optional `executionTime`); events are records merged into `allEvents`.
3. **Handler dispatch table** — `actions.ts` maps action IDs to `handle*` functions in rule modules.
4. **Modal-pause SSOT** — `isNonRewardBlockingModalOpen` / `isModalDialogOpen` in `state.ts`.
5. **Log entries carry i18n keys** — `{ logKey, logVars }` resolved by `i18n/logDisplay.ts`.
6. **Shared Zod schema** — `shared/schema.ts` is authoritative; defaults flow into `createInitialState()`.
7. **Logging** — use `client/src/lib/logger.ts`, never `console.*`.
8. **Backward-compatible saves** — add new fields with `z.default()`; don't rename stored IDs.
9. **Tooltips** — use the centralized system (`TooltipWrapper` + `useGlobalTooltip`).
10. **Dual persistence** — IndexedDB always; Supabase when authenticated (optimistic diff saves).

> See `.cursorrules` for the full coding-style/philosophy guide; this file is the navigational map.
