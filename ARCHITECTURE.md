# ARCHITECTURE — A Dark Cave

> **Purpose:** This is the code map. Read it FIRST to locate code quickly instead of
> searching blindly. It is kept current automatically: a `stop` hook
> (`.cursor/hooks/architecture-update-check.mjs`) detects when files are added,
> removed, or renamed under `client/`, `server/`, `shared/`, `supabase/`, `scripts/`,
> or `services/` and asks the agent to refresh the relevant section here.
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
| `electron/` | Steam desktop shell (Electron `main`/`preload` + loopback static server + steamworks.js). See [Steam edition](#steam-edition-electron) below. |
| `server/` | Express server: API routes, Stripe/referral/marketing, dev Vite middleware, prod static serving. |
| `shared/` | Cross-cutting TypeScript shared by client + server: Zod schemas, shop/referral pricing, admin dashboard aggregates (`gameCompletionAdminStats.ts`, `socialPromptAdminStats.ts`). |
| `supabase/` | SQL migrations + edge function (`functions/save-game/`) for Postgres/RLS. |
| `scripts/` | Build & i18n tooling — see [Scripts](#scripts-scripts) below. |
| `services/` | Internal auxiliary services (currently `gender-service/` — first-name gender inference, localhost only). |
| `public/`, `attached_assets/` | Static assets (`@assets` alias → `attached_assets`). |
| `dist/` | Build output (`dist/public` client, `dist/index.js` server). |
| `build-resources/` | Electron/Windows packaging assets (`icon.ico` for taskbar/installer). |
| `.cursor/` | Agent config: `rules/`, `hooks.json`, `hooks/`. |

**Root config:** `package.json` (scripts/deps), `vite.config.ts` (client build, aliases, chunks),
`tsconfig.json` (includes `client/src`, `shared`, `server`), `vitest.config.ts` + `vitest.setup.ts`,
`tailwind.config.ts`, `components.json` (shadcn/ui), `drizzle.config.ts`,
`electron-builder.yml` (Steam Windows packaging), `steam_appid.txt` (Steam App ID **4882240**).

**Path aliases:** `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets` → `attached_assets`.

---

## Tech stack (quick facts)

- **Language:** TypeScript 5.6 (strict), Node ≥22.
- **Frontend:** React 18, Wouter (routing), TanStack React Query, Framer Motion, Howler (audio), Recharts (admin), WebGL2 shader backgrounds (`cloud-shader.tsx`, `starship-shader.tsx`, `spooky-smoke-animation.tsx`).
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
| `client/src/game/rules/executionTime.ts` | `getExecutionTime()` — action duration lookup without importing `rules/index` (avoids registration cycles). |
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
| entry | React root → router | `main.tsx` (bootstraps text scale from `lib/textScale.ts`, tab-hidden CSS flag from `lib/tabVisibility.ts`), `App.tsx`, `index.html`, `index.css` (`--adc-text-scale` scaled Tailwind text utilities) |
| `pages/` | Route-level components (lazy-loaded) | `start-screen-page.tsx`, `game.tsx`, `end-screen.tsx`, `reset-password.tsx`, `withdrawal.tsx`, `not-found.tsx`, `admin/dashboard.tsx`, `starship-shader-demo.tsx` (dev-only `/dev/starship-shader` preview) |
| `game/` | **Game engine** (see below) | `state.ts`, `loop.ts`, `playTimeAutoPrompts.ts` (play-time rewards/feedback auto-open; one blocking modal per tick), `actions.ts`, `save.ts`, `saveCodec.ts`, `stateHelpers.ts`, `boost.ts`, `villagerCapUpgrades.ts`, `villagerJobPresets.ts`, `constructionQueueSlots.ts`, `weaponEnchantments.ts`, `villageEffectThemes.ts` (symbol/border themes for village timed-effect outcome dialogs), `auth.ts`, `shopPurchases.ts`, `socialTaskRewards.ts`, `socialTasksGold.ts`, `authNotificationAuto.ts`, `playlightExitIntent.ts`, `tabUnlockBlink.ts`, `achievementTabPulse.ts`, `bloodMoonOverlay.ts` (blood moon background/smoke overlay visibility + dev preview flag), `constants.ts`, `rules/` |
| `components/game/` | Game-specific UI | `GameContainer.tsx`, `GameActionButtonStack.tsx` (fixed z-index slot for particle-enabled action buttons), `GameHeader.tsx` (title + profile/playlight/leaderboard shortcuts; footer-matched chrome), `FullscreenButton.tsx` (Steam shell full-screen toggle in header/start screen), `gameChrome.ts` (header/footer inset constant), `panelResize.ts` (`usePanelResize` — drag limits, refs/styles, persists `panelSizes` desktop/mobile), `PanelResizeHandle.tsx` (separator grab handle on side-panel/log dividers), `TraderTabButton.tsx` (shop tab ◬ + lime hover particles; periodic 15m hover hint), `GameTabs.tsx`, `GameButton.tsx`, `panels/`, `*Dialog.tsx`, `VillageEffectDialog.tsx` (themed feast/curse/frostfall/etc. announcement modal via `OutcomeDialog`), `ConstructionBoostBadge.tsx` (⏩ Insight badge on in-progress builds — one-time 50% time skip via Builder's Lodge tier 2+), `ShareDialog.tsx` (1080×1350 social share image: title + resource column + 2×2 achievement rings + overall % via `html-to-image`; header Share button in `ProfileMenu`), `SettingsDialog.tsx` (Profile→Settings: music/sfx volume sliders + mute, text size + language selectors, and web-only email opt-in + delete-account; non-blocking, opened from `ProfileMenu`), `TextScaleSelector.tsx` (Normal/Large text size dropdown for Settings; persists via `lib/textScale.ts`), `EndScreen.tsx`, `StatEffectsTooltip.tsx` (per-stat luck/strength/knowledge/madness effect breakdown in side-panel tooltips), `StripePoweredBy.tsx` (checkout Stripe + payment-methods footer), `paymentMethodLogos.tsx` (Visa/MC/PayPal/Apple Pay/Google Pay SVG marks) |
| `components/ui/` | shadcn/ui design system + game visuals | `button.tsx`, `card.tsx`, `dialog`, `toast.tsx`, `button-particle-portal.tsx` (body-portal click bursts between tab bar and fixed action buttons), `mist-background.tsx`, `cloud-shader.tsx`, `starship-shader.tsx` (WebGL2 fullscreen starship fragment shader), `spooky-smoke-animation.tsx` (WebGL2 blood moon smoke overlay), `limelight-nav.tsx` |
| `hooks/` | React hooks | `use-toast.ts`, `useCooldown.ts`, `use-mobile.tsx`, `useFullscreen.ts` (Steam `steamBridge` full-screen state + toggle), `useSteamEditionActive.ts` (reactive `isSteamBuild || dev Steam Mode` for Steam UI in components), `useIOSChromeViewportShell.ts` (CriOS: pin `GameContainer` shell to `visualViewport`), `useNewItemPulseTooltip.ts` (first-time `new-item-pulse` on tooltip triggers until hover/open; persisted in `hoveredTooltips`; `VillagePanel` indicators) |
| `i18n/` | Localization (see below) | `index.ts`, `locales.ts`, `useTextScale.ts` (text size hook; `localStorage` + DOM sync), `resolveGameText.ts`, `logDisplay.ts`, `locales/` |
| `lib/` | Cross-cutting utilities | `logger.ts` (always use instead of `console.*`), `queryClient.ts`, `sessionTracker.ts`, `textScale.ts` (Normal/Large readable text preference; `--adc-text-scale` on `<html>`, `localStorage`), `tabVisibility.ts` (`data-tab-hidden` on `<html>` while tab backgrounded — pauses decorative CSS animations), `viewportSize.ts` (layout viewport size + resize/full-screen subscriptions for shader canvases), `tailwindColors.ts`, Supabase/audio clients; `playlight.ts` (Playlight SDK init, exit-intent sync from store, discovery pause); `playlightExitIntentClose.ts` (injected red close on SDK exit-intent bar); `notoSansSymbols2FontFace.ts` (same-origin Noto symbols `@font-face` loader); `shareImageFonts.ts` (base64-inlined `@font-face` CSS for the share-image PNG export); `exclusivePromoShockwave.ts` (CSS class toggles for rewards-task shockwave hover/ping + donate-heart pump) |
| `achievements/` | Achievement configs, charts, claim logic | `AchievementMiniRingChart.tsx` (sizeable ring donut), `achievementProgress.ts` (overall/per-category % complete), `configs/` |

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
  (`caveLogFallbacks.ts`, `caveExploreActions.ts`, `villageBuildActions.ts`, `forestSacrificeActions.ts`,
  `forestResearchActions.ts`, `bastionActions.ts`, …), `index.ts` (visibility/affordability + `allEvents`), effects
  (`actionEffects.ts`, `effectsCalculation.ts`, `costCalculation.ts`), events (`events.ts`
  → `EventManager`, `LogEntry`, plus topic files `events*.ts` incl. `eventsChainmaster.ts` — Leatherbound Book discovery + collector timed tab), `insightReveal.ts` /
  `insightRevealTooltip.tsx`, `actionTooltipLayout.tsx` (`composeActionTooltip` — cost,
  description, revealed effects), `focusTooltipIndicator.tsx` (focus `☩` icon on eligible action
  tooltips while focus is active), `buildingUpgradeTooltipIndicator.tsx` (upgrade `🠕` icon on
  construction tooltips for buildings that replace earlier tiers), `tooltips.tsx` / `itemTooltips.tsx`.
- **Action path:** UI → `useGameStore.executeAction(id)` → `actions.ts` maps ID → `handle*`
  function in a rule module → `StateManager.scheduleEffectsUpdate()` recomputes derived stats.
- **Event path:** `loop.ts`/store → `checkEvents()` → `EventManager` evaluates `allEvents`
  → opens `EventDialog`, `VillageEffectDialog` (themed village timed-effect outcomes), or `timedEventTab`.
- **`villageEffectThemes.ts`** — maps event outcomes to produce-header symbols/colors; `resolveVillageEffectAnnouncementTheme()` in `applyEventChoice` (`state.ts`) schedules `VillageEffectDialog`.
- **`playlightExitIntent.ts`** — play-time exit-intent milestones (90m/150m/210m/270m/330m);
  skips 150m and 270m when Playlight discover social task is fulfilled;
  `getActivePlaylightExitMilestone()`; consumed count persisted as `playlightExitIntentMilestoneIndex`
  in save (read/written by `lib/playlight.ts` on SDK `exitIntent`).
- **`boost.ts`** — one-time `/boost` URL resource bonus for started saves; gated by persisted
  `boostApplied` (`shared/schema.ts`, migrated from legacy `boostMode`); applied on load in
  `pages/game.tsx` via `canApplySaveBoost` / `applySaveBoost`.
- **`tabUnlockBlink.ts`** — one-time tab unlock blink (`story.seen` `tabUnlockBlinkSeen_*`);
- **`achievementTabPulse.ts`** — achievements tab pulse until opened (`story.seen` `achievementTabPulseSeen_*`);
- **`authNotificationAuto.ts`** — guest Profile sign-in dot schedule (`lastAuthNotificationPlayTime` + 15m / 60m play time);
  written when the blink is shown/dismissed; UI in `GameContainer.tsx`.
- **`villagerCapUpgrades.ts`** — per-profession villager caps via Insight upgrades (group/building mapping,
  cap/cost tables, `flags.villagerCapsEnabled` new-games gate + `import.meta.env.DEV` until shipped); enforced in
  `assignVillagerToJob`, `upgradeVillagerCap` in `state.ts`, UI in `VillagePanel` / `SidePanelSection` /
  `itemTooltips.tsx`.
- **`villagerJobPresets.ts`** — villager job presets unlocked by the Scribe's Office → Records Hall → Grand Archive
  building chain (one slot each, 5 shown / 4-5 reserved). Snapshot/apply helpers (proportional shrink, surplus →
  free, cap-clamped); persisted in `villagerJobPresets` / `activePresetSlot` (`shared/schema.ts`). Store methods
  `saveVillagerJobPreset` / `applyVillagerJobPreset` / `setActivePresetSlot` / `grantAdditionalPresetSlots` (`state.ts`), UI row in the
  `VillagePanel` "Produce" header; paid extra slots (`additional_preset_slots`) via the shop's existing checkout, opened
  directly through `shopCheckoutItemId` on the store (the item is hidden from the shop grid).
- **`constructionQueueSlots.ts`** — parallel construction queue (base 1 slot; Builder's Lodge/Guild unlock purchasable
  extras via Insight), build-time/cost reductions from Builder building tiers, and Construction Boost (Insight skip
  50% of build time). Gated by `flags.constructionQueueEnabled` (set `true` on light fire). UI in `VillagePanel` "Build" header.
- **`constructionQueueSlots.ts`** — parallel building queue after lighting fire (`flags.constructionQueueEnabled`);
  Builder's Lodge tier bonuses (build time/cost reduction), slot caps (base 1 + Insight purchases + building tiers),
  Construction Boost (Insight skip 50% of remaining build time, once per build). Enforced in `canExecuteAction`,
  `getExecutionTime`, `getTotalBuildingCostReduction`; persisted in `constructionQueueSlotsPurchased` /
  `constructionBoostsUsed` (`shared/schema.ts`); store methods `purchaseConstructionQueueSlot` / `boostConstruction`
  (`state.ts`); UI queue indicators + `ConstructionBoostBadge` on build buttons in `VillagePanel`.
- **`weaponEnchantments.ts`** — weapon enchantment via Insight, unlocked by Tomewarden Academy
  (`buildings.inkwardenAcademy`). Tiered bow/sword chains: only `blacksteel_bow` / `blacksteel_sword` are
  enchantable; other weapons enchant once (+`1 + floor(stat/10)` Strength/Knowledge each, cost `(added) × 250`);
  Nightshade Bow has a 2-level table (+base/enchant Strength, +1 poison DoT round).
  Levels persist in `weaponEnchantments` (`shared/schema.ts`); bonuses applied in `calculateTotalEffects`,
  spent via `enchantWeapon` (`state.ts`), UI badge + blue tooltip stats in `SidePanelSection` / `itemTooltips.tsx`,
  combat poison rounds via `getPoisonArrowsDotFightRounds` (`CombatDialog`, `tooltips.tsx`).

---

## State persistence

- **`stateHelpers.ts`** — `UI_ONLY_PROPERTIES` lists store keys excluded from saves (dialog
  flags, `activeTab`, transient timers). `buildGameState(state)` strips UI keys + functions and
  forces `isPaused: false` on save.
- **`save.ts`** — IndexedDB (`ADarkCaveDB`); guest saves encode via `saveCodec.ts`
  (XOR+Base64, `ADC2:` prefix); signed-in saves diff against last cloud state → Supabase
  (`omitPlayTimeFromDiffIfUnchanged` drops unchanged `playTime` so the server skips OCC).
  Load applies migrations (e.g. `migrateTraderShopUnlockOnLoad`).
- **`auth.ts`** — Supabase auth (incl. anonymous guest-checkout via `ensureAnonymousSession`),
  `saveGameToSupabase`/`loadGameFromSupabase`, referral metadata.
- **`shopPurchases.ts`** — Supabase `purchases` fetch/rehydrate, feast-activation merge, purchase ID helpers (used by `ShopDialog`, payment return).
- **`shared/schema.ts`** — Zod schema = source of truth; `createInitialState()` derives defaults from it.
  Playlight exit-intent quota: `playlightExitIntentMilestoneIndex` (load floor from `playTime` in `state.ts` `loadGame`, same pattern as `socialPromptMilestoneIndex`).
- **`socialTaskRewards.ts`** — `isSocialRewardFulfilled()` / `isSocialRewardClaimed()`: shared helpers for rewards-dialog tasks where action completion (`fulfilled`) and gold grant (`claimed`) are separate (legacy saves treat `claimed` as fulfilled).
- **`socialTasksGold.ts`** — `computePersistedSocialTasksGold()`: re-applies one-time rewards-task gold on `restartGame()` when claim flags persist (sign-up welcome, email, social follows, Playlight discover, claimed referrals).

> **Modal-pause convention:** blocking dialogs must be added to `isNonRewardBlockingModalOpen`
> in `state.ts`, and UI-only dialog flags must be listed in `UI_ONLY_PROPERTIES`
> (`stateHelpers.ts`). See `.cursor/rules/modal-dialog-pause.mdc`.

---

## i18n (`client/src/i18n/`)

- **`index.ts`** — i18next bootstrap; eager `import.meta.glob` of `locales/*/*.json` and
  `locales/*/ui/*.json`. UI namespace assembled from shards under `locales/{lang}/ui/`.
- **`locales.ts`** — supported: **en, de, fr, es, it, pt-BR, zh-CN, ru**. Namespaces: `common`, `ui`,
  `shop`, `actions`, `effects`, `events`, `achievements`.
- **Resolution:** `resolveGameText.ts` (`tWithFallback`, resource/log names), `useUiTranslation.ts`
  (panel hooks with English catalog fallback), `useTextScale.ts` (Settings text size state),
  `enUiCatalog.ts` (eager `en/ui/*.json` lookup for dev HMR),
  `eventText.ts`,
  `eventDisplay.ts`, `logDisplay.ts`, `actionLabels.ts`, `tooltipLabels.ts`.
- **Pattern:** game logic stores English fallback + optional `logKey`/`i18nKey`; UI resolves at
  display time. Parity maintained by `scripts/` (`i18n:verify`, `sync-locale-keys.mjs`).

---

## Scripts (`scripts/`)

Node `.mjs` / `.ts` utilities (not imported at runtime). Invoked via `package.json` npm scripts or
run ad hoc for locale maintenance.

| npm script | Key files | Purpose |
|------------|-----------|---------|
| `build` | Vite + esbuild | Client bundle + server bundle. |
| `i18n:extract` | `extract-i18n.mjs` | Scan client strings → locale JSON. |
| `i18n:translate` | `translate-locales.mjs` | Machine-translate missing locale keys. |
| `i18n:events:extract` / `i18n:events:migrate` | `extract-events-i18n.mjs`, `migrate-events-i18n.mjs` | Events namespace extraction + migration. |
| `i18n:verify` | `list-unmigrated-events.mjs`, `check-event-coverage.mjs`, `audit-i18n-ui.mjs`, `audit-locale-length.mjs` | CI-style i18n parity checks (+ Vitest i18n tests). |
| `i18n:sync` | `sync-locale-keys.mjs`, `fill-identical-locale-strings.mjs` | Align locale key sets across languages. |
| `export:resend-csvs` | `export-resend-contact-csvs.ts` | Marketing contact CSV export (uses gender proxy). |
| `test:gender` | `test-gender-service.js` | Smoke-test `services/gender-service/`. |

Support modules (not always npm-wired): `locale-catalog.mjs`, `parse-locale-json.mjs`,
`i18n-ui-shards.mjs`, `audit-locale-translations.mjs`, `audit-timed-tab-i18n.mjs`,
`apply-*-fix-translations.mjs`, `apply-cube-translations.mjs`, `restore-ok-comments.mjs`,
`fix-es-locale-encoding.mjs`, plus `*-fix-translations.json` / `cube-events-translations.json`
data files for batch locale fixes.

---

## Steam edition (`electron/`)

The same client codebase ships two editions, switched by the build-time flag
**`isSteamBuild`** (`client/src/lib/edition.ts`, reads `import.meta.env.VITE_STEAM_BUILD === "1"`).
The Steam build is a Windows desktop app with no online services (Supabase, Stripe,
leaderboard, social, referral, marketing, Playlight, session pings), no real-money
shop, the whole game unlocked, merchant-sold dark artifacts, and local + Steam Cloud saves.

| Path | Responsibility |
|------|----------------|
| `electron/main.ts` | Electron main process: Steamworks init + overlay, loopback server, save-file IPC, full-screen/layout IPC, window icon/title, single-instance, external-link handling. |
| `electron/paths.ts` | `APP_USER_DATA_NAME` + `STEAM_CLOUD_SAVE_FILE` — must match Steamworks Auto-Cloud config. |
| `electron/preload.ts` | `contextBridge` exposing `window.steamBridge` (achievements, Cloud save, full-screen toggle/events) to the sandboxed renderer. |
| `electron/loopbackServer.ts` | Serves built `dist/public` over `http://127.0.0.1:<port>` (absolute-path routing needs HTTP, not `file://`). |
| `electron/steam.ts` | Defensive `steamworks.js` wrapper (degrades to no-ops when Steam absent). |
| `client/src/lib/edition.ts` | `isSteamBuild` compile-time flag; `isSteamEditionActive()` (+ dev `devSteamMode` override from Settings). |
| `client/src/lib/steam.ts` | Renderer-side safe wrapper over `window.steamBridge` (achievements, saves, full-screen; no-ops on web). |
| `client/src/game/steamSaveAdapter.ts` | Mirrors the encoded `ADC2:` save blob to the Steam Cloud file; reconciles with IndexedDB by `playTime`. |
| `client/src/achievements/steamAchievements.ts` | Maps the 62 ring achievements to Steam API names (`ACH_*`); unlocks on criteria-met (loop + load backfill). |
| `scripts/build-electron.mjs` | esbuild bundles `main`/`preload` to `dist-electron/*.cjs`. |
| `scripts/steam-upload.ps1` | Uploads `release/win-unpacked` to SteamPipe via `steamcmd` (`npm run steam:upload`). |

**Edition seams (guarded by `isSteamBuild`):** Supabase short-circuits in `lib/supabase.ts`;
`App.tsx` skips Playlight; `pages/game.tsx` skips session tracker, auth, purchase rehydrate,
and Stripe return; `game/save.ts` takes the local-only path + Steam Cloud mirror; `game/loop.ts`
syncs Steam achievements; `state.ts` `createInitialState`/`restartGame`
set `BTP=1` and grant `full_game` (merchant artifacts, no paywall); `GameContainer`/`ProfileMenu`
hide shop/leaderboard/share/invite/auth; `pages/end-screen.tsx` unlocks Cruel Mode free once
`hasWonAnyGame` is set.

**Scripts:** `build:steam` (Vite client build with the flag), `electron:build` (bundle shell),
`electron:dev` (build + run), `electron:package` (electron-builder Windows installer → `release/`).

The Steam Vite build omits web-only chunks (Stripe, Supabase, admin dashboard, shop/leaderboard
dialogs, legal pages) via `vite.config.ts` aliases to `client/src/stubs/steam/` and build-time
lazy-import guards in `App.tsx` / `WebOnlyDialogs.tsx`.

**Steamworks Auto-Cloud** (partner backend → app → Technical Settings → Steam Cloud): enable
Steam Cloud, then add one Auto-Cloud row (Windows-only build):

| Field (DE / EN) | Value |
|-----------------|-------|
| Stammverzeichnis / Root | `WinAppDataRoaming` |
| Unterverzeichnis / Subdirectory | `A Dark Cave` (`electron/paths.ts` → `APP_USER_DATA_NAME`) |
| Muster / Pattern | `adc-steam-save.dat` (`STEAM_CLOUD_SAVE_FILE`) |
| Betriebssystem / OS | Windows |
| Rekursiv / Recursive | off |

On disk: `%APPDATA%\A Dark Cave\adc-steam-save.dat`. Root overrides empty (Windows-only).
App ID **4882240** in `steam_appid.txt`.

**SteamPipe upload** (partner backend → SteamPipe → Builds):

1. **Depot anlegen** (falls noch keiner da): SteamPipe → *Depots* → Windows-Depot. Depot-ID in `steam/config.local.json` eintragen (Vorlage: `steam/config.example.json`).
2. **Lokal bauen:** `npm run electron:package` → erzeugt `release/win-unpacked/` (Spieldateien) und `release/A Dark Cave-*-setup.exe` (Installer, **nicht** zu Steam hochladen).
3. **Steamworks SDK** von der Partner-Seite laden, Pfad in `config.local.json` → `steamworksSdk`.
4. **Hochladen:** `npm run steam:upload` (baut bei Bedarf, lädt `release/win-unpacked/` direkt hoch). `SetLive` bleibt leer — Steam erlaubt kein automatisches Setzen von Branch `default` per steamcmd; Build danach manuell in SteamPipe → Builds auf `default` setzen (optional `setLiveBranch` in `config.local.json` für Beta-Branches).
5. **Installation** (SteamPipe → Installation): Startprogramm = `A Dark Cave.exe` im Installationsverzeichnis.
6. **Testen:** Paket *developer comp* muss das Depot enthalten → Build-Branch `default` in der Steam-Bibliothek testen.
7. **Veröffentlichen** (Tab *Veröffentlichen*): Cloud-, Build- und Store-Änderungen live schalten.

---

## Server (`server/`)

`server/index.ts` serves the SPA (Vite dev middleware or precompressed static in prod) and
rate-limited `/api/*` routes.

| Route group | Module | Purpose |
|-------------|--------|---------|
| `/api/payment/*` | `stripe.ts`, `stripeWebhook.ts`, `paymentVerifyAuth.ts` | Stripe checkout intents + verification; `payment_intent.succeeded` webhook fulfills via same `verifyPayment()` as client; guest PayPal email backfilled to PaymentIntent `metadata.userEmail` from charge |
| `/api/referral/*` | `referral.ts`, `referralCodes.ts` | Referral codes & rewards |
| `/api/marketing/*` | `marketing.ts` | Email prefs, unsubscribe |
| `/api/leaderboard/*`, `/api/account/*`, `/api/session/ping` | inline + Supabase | Leaderboard, account deletion, session heartbeat |
| `/api/gender` | proxies `services/gender-service/app.py` | First-name gender for marketing CSVs |
| `/api/admin/*` | inline + `server/adminDashboardData.ts` | Admin dashboard: split endpoints (`metrics`, `dau`, `saves`, `clicks`, `purchases`); saves return slim `game_state` projection |
| `/api/config` | inline | Public Supabase keys |

Support: `server/vite.ts` (dev/prod hosting), `server/supabaseServerClient.ts` (service-role client),
`server/paymentVerifyAuth.ts` (payment-verify session/body user match), `server/stripeFxQuote.ts`,
`server/stripeWebhook.ts` (`POST /api/payment/webhook`, raw body + `STRIPE_WEBHOOK_SECRET_DEV` / `_PROD`),
`server/resendContactCsv.ts`.

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
9. **Tooltips** — `TooltipWrapper` + `useGlobalTooltip` on item/action triggers; side-panel
   section titles are plain labels (no separate info-glyph component). Panel action buttons
   compose layout via `rules/actionTooltipLayout.tsx` (`composeActionTooltip`); focus glow
   actions add `☩` via `rules/focusTooltipIndicator.tsx` while focus is active; building
   upgrade construction tooltips add `🠕` via `rules/buildingUpgradeTooltipIndicator.tsx`.
10. **Dual persistence** — IndexedDB always; Supabase when authenticated (optimistic diff saves).

> See `.cursorrules` for the full coding-style/philosophy guide; this file is the navigational map.
