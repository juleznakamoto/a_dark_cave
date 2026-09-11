# ARCHITECTURE - A Dark Cave

> **Purpose:** This is the code map. Read it first to locate code, then search.
> It is a map of *shape*, not an inventory of every helper.
>
> **Update this file only when the project shape changes:** a new or removed
> directory, a new subsystem, a rename/move of a file in [Most important
> files](#most-important-files-start-here), or a real change to the loop, save
> path, routing, or i18n bootstrap. Do not add leaf helpers, event files,
> migrations, or one-off scripts.
>
> A `stop` hook (`.cursor/hooks/architecture-update-check.mjs`) nags only on
> those structural changes. Style and coding rules live in `.cursorrules`.

A Dark Cave is a text-based incremental browser game (inspired by *A Dark Room*).
It is a single Node package serving an **Express API + Vite React SPA**. Almost
all game logic lives in the client. **Supabase** handles auth/cloud saves.
**Stripe** handles payments.

---

## Top-level layout

| Path | What lives here |
|------|-----------------|
| `client/` | React SPA: UI, game engine, i18n, assets. Vite root. |
| `electron/` | Steam desktop shell (main/preload, loopback static server, steamworks.js). |
| `server/` | Express API, Stripe/referral/marketing, Vite middleware, prod static serving. |
| `shared/` | Zod schemas and other TS shared by client + server. |
| `supabase/` | SQL migrations + `functions/save-game/` edge function. |
| `scripts/` | Build, i18n, Steam, and marketing tooling. |
| `services/` | Aux services (`gender-service/`, localhost only). |
| `steam/` | Steamworks partner pack, achievement loc, upload config templates. |
| `CANONICAL_FACTS.md` | First-party marketing/SEO claims (price, genre, platforms). |
| `public/`, `attached_assets/` | Static assets (`@assets` → `attached_assets`). |
| `dist/` | Build output (`dist/public` client, `dist/index.js` server). |
| `build-resources/` | Electron/Windows packaging icons. |
| `.cursor/` | Agent config: `rules/`, `hooks.json`, `hooks/`. |

**Root config:** `package.json`, `vite.config.ts` (+ `vite.vendorChunks.ts`),
`tsconfig.json`, `vitest.config.ts`, `tailwind.config.ts`, `components.json`,
`drizzle.config.ts`, `electron-builder.yml` (+ `.demo.yml` / `.playtest.yml`),
`steam_appid.txt` (full **4882240**), `steam_appid_demo.txt` (**4971800**),
`steam_appid_playtest.txt` (**4972040**).

**Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets` → `attached_assets`.

---

## Tech stack (quick facts)

- **Language:** TypeScript 5.6 (strict), Node ≥22.
- **Frontend:** React 18, Wouter, TanStack React Query, Framer Motion, Howler, Recharts (admin), WebGL2 shader backgrounds.
- **State:** Zustand 5, single store in `client/src/game/state.ts`.
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix) + `class-variance-authority`.
- **Build:** Vite 5 (client), esbuild (server), terser.
- **Validation:** Zod (`shared/schema.ts` is the persisted-shape source of truth).
- **i18n:** i18next + react-i18next, JSON locale shards.
- **Auth/DB:** Supabase. **Payments:** Stripe. **Local saves:** IndexedDB via `idb`.
- **Server:** Express 4. **Tests:** Vitest 4 + Testing Library.

---

## Most important files (start here)

| Path | One-liner |
|------|-----------|
| `client/src/main.tsx` | React boot: text scale, tab-hidden CSS, save-on-exit, locale seed, root mount. |
| `client/src/App.tsx` | Routes. `/` paints the start screen first; Game mounts after Make Fire (unless `shouldBootGameSurface`). |
| `client/src/game/state.ts` | Zustand store: persisted game state + UI slice + gameplay actions. |
| `client/src/game/loop.ts` | rAF simulation (~4 FPS): production, events, autosave, timers, pause gates. |
| `client/src/game/actions.ts` | Action dispatch: ID → handler, costs/effects. |
| `client/src/game/rules/index.ts` | Action visibility/affordability. |
| `client/src/game/rules/actionsRegistry.ts` | Central `gameActions` map; modules register via `registerActions()`. |
| `client/src/game/gameStoreHolder.ts` | Late-bound store access so event modules do not import `state.ts`. |
| `client/src/game/save.ts` | IndexedDB + Supabase cloud sync (full-document replace by default). |
| `client/src/game/saveConflict.ts` | Local-vs-cloud preference. |
| `client/src/game/dialogRegistry.ts` | Transient dialog SSOT: blocking pause, save exclusion, reset-on-load. |
| `client/src/game/persistedStateBoundary.ts` | Schema-driven save allowlist; strips runtime/dialog keys. |
| `client/src/game/gameplayInitOrchestrator.ts` | Local hydrate + loop, then auth/cloud/Stripe/audio in background. |
| `client/src/i18n/index.ts` | i18next bootstrap (English `ui/shell` + `ui/seo` seeded at init). |
| `client/src/i18n/loadLocaleResources.ts` | Lazy locale shard loading by surface (start / public docs / gameplay). |
| `client/src/lib/edition.ts` | Steam / Galaxy / CrazyGames / demo flags (plus DEV Game Mode). |
| `client/src/components/game/GameContainer.tsx` | Game UI shell: tabs, panels, dialogs, hotkeys. |
| `client/src/pages/game.tsx` | Thin game route; paints after local hydrate; stops the loop on unmount. |
| `shared/schema.ts` | Zod `gameStateSchema` / `SaveData` + shared shop constants. |
| `server/index.ts` | Express API + static hosting. |

---

## Client structure (`client/src/`)

| Directory | Role |
|-----------|------|
| entry | `main.tsx`, `App.tsx`, `index.css`. Boot chrome: `index.html` + `public/boot.js`. |
| `pages/` | Route-level screens (lazy). `pages/admin/` is the dashboard. `/dev/*` playgrounds sit beside them. |
| `game/` | Game engine (see below). `game/rules/` is actions + events. |
| `components/game/` | Game UI: shell, panels, dialogs, header/footer. |
| `components/ui/` | shadcn/ui + shared visuals (shaders, progress, buttons). |
| `hooks/` | React hooks. |
| `i18n/` | Bootstrap, resolvers, `locales/{lang}/`. |
| `lib/` | Cross-cutting: logger, edition, audio, Supabase, fonts, reload. |
| `achievements/` | Ring configs, progress, Steam unlock mapping. |
| `stubs/steam/` | Vite aliases that drop web-only chunks from the Steam build. |

**Boot:** web `/` always paints the start screen first (including returning
saves). The Game chunk prefetches after first paint + first input, then mounts
after Make Fire. `shouldBootGameSurface` skips the start-screen chunk for
`forceGame`, in-game resume reloads, and Steam / Galaxy / CrazyGames started
saves.

---

## Game engine (`client/src/game/`)

```
startupIntent / startupCoordinator / startupBootSurface
  → StartScreen or Game
gameplayInitOrchestrator
  → loadGame() hydrates once; background auth/cloud/audio
UI (GameContainer, panels, dialogs)
  ↔ useGameStore (Zustand)
state.ts        - persisted GameState + UI slice + store methods
  ↔
loop.ts         - rAF ~4 FPS: production, events, autosave, pause gates
  ↔
rules/          - declarative actions + events
actions.ts      - dispatch action ID → handler
dialogRegistry.ts + persistedStateBoundary.ts
  - dialog pause/reset + save allowlist
save.ts         - IndexedDB + Supabase
shared/schema.ts - Zod persisted shape
```

- **Store:** `state.ts` exports `useGameStore`, `createInitialState()`,
  `isModalDialogOpen()` (sim freeze, including `dialogHandoffPending`).
- **Loop:** ~4 FPS. Production cycle, attack-wave timer, play-time, autosave
  (15s local / 60s cloud). Pause gates: manual pause, idle, inactivity, modal
  dialogs, demo-hut freeze. Started from `gameplayInitOrchestrator.ts`;
  stopped on `pages/game.tsx` unmount.
- **Actions:** UI → `useGameStore.executeAction(id)` → `actions.ts` → `handle*`
  in a `rules/` module → derived-stat recompute.
- **Events:** `loop.ts` / store → `checkEvents()` → `EventManager`. Timed-tab
  events do not spawn while the tab is hidden. Unresolved `EventDialog`s persist
  as `pendingModalEvent`.
- **DEV fixtures:** `/?devSave=<id>` hydrates from `devSaves.ts` and skips cloud.

---

## State persistence

- **Allowlist:** `persistedStateBoundary.ts` + `dialogRegistry.ts`. Dialog and
  runtime keys are stripped. `pendingModalEvent` is a schema field so a refresh
  cannot dismiss a choice.
- **Local:** IndexedDB (`save.ts` + `saveCodec.ts`). `flushSaveOnExit.ts` writes
  on `pagehide` and Steam will-quit.
- **Cloud:** signed-in V1 `save-game` edge function. **Full-document replace**
  by default (`p_full_replace`). Kill switch: `VITE_SAVE_FULL_REPLACE=0`.
  Referral / Book of Absolution fields are union-merged so a stale client cannot
  wipe server-written progress. Schema: `shared/schema.ts`.
- **Editions:** Steam Cloud files via `steamSaveAdapter.ts`. CrazyGames also
  mirrors to the SDK Data module + `localStorage`. Isolated IndexedDB keys per
  edition (`mainSave`, `steamDemoSave`, `galaxySave`, `crazyGamesSave`, …).

---

## i18n (`client/src/i18n/`)

- **Locales:** en, de, fr, es, it, pt-BR, zh-CN, ja, pl, ru.
- **Namespaces:** `common`, `ui`, `shop`, `actions`, `effects`, `events`, `achievements`.
  UI is sharded under `locales/{lang}/ui/`.
- **Load:** English `ui/shell` + `ui/seo` seed at init. `loadLocaleResources.ts`
  pulls the rest by surface (start screen, public docs, full gameplay).
- **Pattern:** logic stores English fallback + `logKey` / `i18nKey`; UI resolves
  at display time (`resolveGameText.ts`, `logDisplay.ts`). Parity: `npm run i18n:verify`.

---

## Scripts (`scripts/`)

| Area | Where to look |
|------|----------------|
| Client/server build | `write-build-meta.mjs` (`__BUILD_SHA__` / `/api/version`) |
| i18n | `i18n:*` npm scripts (`extract`, `sync`, `verify`, `translate`) |
| Steam package/upload | `package-steam-*.mjs`, `steam-upload*.ps1`, `build-electron.mjs` |
| CrazyGames folder | `package-crazygames.mjs` |
| Press / icons / fonts | `build-press-kit-assets.mjs`, `generate-logo-assets.py` |
| Marketing CSVs | `*resend*` + `resendScriptEnv.ts` |

---

## Editions

Same client, switched by build/URL flags in `client/src/lib/edition.ts`.
Steam/Galaxy/CrazyGames are local-only (no Supabase, Stripe, shop, Playlight,
leaderboard, or marketing). Demo editions cap at 8 wooden huts
(`client/src/game/demoLimit.ts`) and share demo-end chrome.

| Edition | How it is selected | Save isolation | Package |
|---------|--------------------|----------------|---------|
| Web (full) | default | `mainSave` + optional Supabase | `npm run build` |
| Steam full | `VITE_STEAM_BUILD=1` | IndexedDB + `%APPDATA%\A Dark Cave\adc-steam-save.dat` | `electron:package` |
| Steam demo | `VITE_STEAM_DEMO=1` | Demo IndexedDB + `adc-steam-demo-save.dat` (shared folder, different file) | `electron:package:demo` |
| Steam playtest | `VITE_STEAM_PLAYTEST=1` | Playtest IndexedDB + `adc-steam-playtest-save.dat` | `electron:package:playtest` |
| Galaxy | URL `/galaxy` | `galaxySave` | hosted at `/galaxy` |
| CrazyGames | `VITE_CRAZYGAMES=1` or `/crazygames` | `crazyGamesSave` + SDK Data + `localStorage` | `package:crazygames` |

**Steam shell:** `electron/main.ts`, `preload.ts`, `loopbackServer.ts`, `steam.ts`,
`paths.ts`. Renderer talks through `client/src/lib/steam.ts`. Steam Vite build
aliases web-only modules to `client/src/stubs/steam/`.

**Steam Cloud (Auto-Cloud, Windows):** root `WinAppDataRoaming`, subdirectory
`A Dark Cave`, files `adc-steam-save.dat` / `adc-steam-demo-save.dat`. Full and
demo share the folder but not the filename. Upload scripts live under `scripts/`.

---

## Server (`server/`)

`server/index.ts` serves the SPA (Vite in dev, precompressed static in prod)
and rate-limited `/api/*`. HTML head + first-HTML body come from
`server/spaHtml.ts` + `shared/publicSeo.ts` / `publicPages.ts`.

| Route group | Module | Purpose |
|-------------|--------|---------|
| `/api/payment/*` | `stripe.ts`, `stripeWebhook.ts` | Checkout + webhook fulfill |
| `/api/referral/*` | `referral.ts` | Invite codes; `claim_referral` |
| `/api/marketing/*` | `marketing.ts` | Email prefs, unsubscribe |
| `/api/leaderboard/*`, `/api/account/*`, `/api/session/ping`, `/api/utm/landing` | inline + Supabase | Leaderboard, account, session, UTM |
| `/api/gender` | `services/gender-service/` | First-name gender proxy |
| `/api/admin/*` | `adminDashboardData.ts` | Admin metrics, saves, UTM, Resend |
| `/api/config` | inline | Public Supabase keys |
| `/api/version` | inline | Deploy sha + semver (`no-store`) |

Also: `server/vite.ts` (hosting + SPA fallback), `apexRedirect.ts`,
`securityHeaders.ts`, `supabaseServerClient.ts`. GEO files (`llms.txt`,
`robots.txt`, `sitemap.xml`) are served before the SPA fallback.

---

## Testing

- **Runner:** Vitest 4 (`vitest.config.ts`). Tests sit next to source as `*.test.ts`.
- **Run:** `npm test` (watch) or `npm run i18n:verify`.
- **DEV saves:** browser `/?devSave=<id>`; unit tests `buildDevSave()` from `devSaves.ts`.

---

## Conventions

1. **Single game store** - gameplay reads/writes go through `useGameStore`.
2. **Declarative actions/events** - data in `rules/`, not a runtime VM.
3. **Handler dispatch** - `actions.ts` maps IDs to `handle*` in rule modules.
4. **Modal-pause SSOT** - `dialogRegistry.ts` → `isModalDialogOpen` in `state.ts`.
5. **Log entries carry i18n keys** - resolved by `i18n/logDisplay.ts`.
6. **Shared Zod schema** - `shared/schema.ts`; defaults flow into `createInitialState()`.
7. **Logging** - `client/src/lib/logger.ts`, never `console.*`.
8. **Backward-compatible saves** - new fields get `z.default()`; do not rename stored IDs.
9. **Tooltips** - `TooltipWrapper` + `useGlobalTooltip`. See `.cursorrules`.
10. **Dual persistence** - IndexedDB always; Supabase when authenticated (web).
