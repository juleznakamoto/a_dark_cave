# ARCHITECTURE â€” A Dark Cave

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
| `shared/` | Cross-cutting TypeScript shared by client + server: Zod schemas, shop/referral pricing, referral list union-merge (`referralMerge.ts`), admin dashboard aggregates (`gameCompletionAdminStats.ts`, `socialPromptAdminStats.ts`, `hutLadderAdminStats.ts`), save integrity + client-build version checks (`saveGameAnalysis.ts`), tool rebuild from story flags (`rebuildToolsFromStorySeen.ts`), tab-unlock flag repair from progression evidence (`repairUnlockFlags.ts`), boss-wave insert migration for `story.seen` / attack timers (`bossWaveMigration.ts`), public SEO route metadata (`publicSeo.ts`). |
| `supabase/` | SQL migrations + edge function (`functions/save-game/`) for Postgres/RLS. Notable: `024` deep-merge saves, `025` permanent tools/weapons/books protection, `030` flagged full-document replace on V1 (`p_full_replace`; old clients keep deep-merge), `034` admin session intra-day stats RPC, `035` drop abandoned `game_state_v2` dual-write sidecar (historical `028`/`029`), `036` raise per-save gold/silver delta caps (5000 / 10000), `037` referral union-merge + row lock on full-replace (prevents wiping server-written invite rewards), `038` intraday session RPC excludes 24h duration-capped rows (avoids left-edge spike from `updated_at - duration`). |
| `scripts/` | Build & i18n tooling â€” see [Scripts](#scripts-scripts) below. |
| `services/` | Internal auxiliary services (currently `gender-service/` â€” first-name gender inference, localhost only). |
| `public/`, `attached_assets/` | Static assets (`@assets` alias â†’ `attached_assets`). |
| `dist/` | Build output (`dist/public` client, `dist/index.js` server). |
| `build-resources/` | Electron/Windows packaging assets (`logo-source.png` master, `icon.ico`/`icon.png` for taskbar/installer). |
| `.cursor/` | Agent config: `rules/`, `hooks.json`, `hooks/`. |

**Root config:** `package.json` (scripts/deps), `vite.config.ts` (client build, aliases, chunks; HTML `modulePreload` skips framer/radix/supabase/stripe so start screen stays light),
`tsconfig.json` (includes `client/src`, `shared`, `server`), `vitest.config.ts` + `vitest.setup.ts`,
`tailwind.config.ts`, `components.json` (shadcn/ui), `drizzle.config.ts`,
`electron-builder.yml` (Steam Windows packaging), `electron-builder.demo.yml` (Steam demo packaging),
`electron-builder.playtest.yml` (Steam playtest packaging),
`steam_appid.txt` (full game App ID **4882240**), `steam_appid_demo.txt` (demo App ID **4971800**),
`steam_appid_playtest.txt` (playtest App ID **4972040**).

**Path aliases:** `@/*` â†’ `client/src/*`, `@shared/*` â†’ `shared/*`, `@assets` â†’ `attached_assets`.

---

## Tech stack (quick facts)

- **Language:** TypeScript 5.6 (strict), Node â‰¥22.
- **Frontend:** React 18, Wouter (routing), TanStack React Query, Framer Motion, Howler (audio), Recharts (admin), WebGL2 shader backgrounds (`cloud-shader.tsx`, `starship-shader.tsx`, `spooky-smoke-animation.tsx`).
- **State:** **Zustand 5** â€” single store in `client/src/game/state.ts`.
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
| `client/src/game/actions.ts` | Action execution dispatch â€” maps action IDs to handlers, applies costs/effects. |
| `client/src/game/rules/index.ts` | Action visibility/affordability (`shouldShowAction`, `canExecuteAction`) + event aggregation (`allEvents`). |
| `client/src/game/rules/actionsRegistry.ts` | Central `gameActions` map; action modules register via `registerActions()`. |
| `client/src/game/rules/executionTime.ts` | `getExecutionTime()` â€” action duration lookup without importing `rules/index` (avoids registration cycles). |
| `client/src/game/save.ts` | Load/save orchestration: IndexedDB + Supabase cloud diff sync (`LoadGameResult` distinguishes loaded / not-found / error; `SaveGameResult` reports local/cloud writes; restart overwrite cleared only after cloud accepts). |
| `client/src/game/saveConflict.ts` | Pure local-vs-cloud preference (`pickPreferredSave`: explicit restart overwrite, else newer cloud run, else playTime) + playtime-overwrite helpers (`isNewGame` alone does not grant overwrite). |
| `client/src/game/stateHelpers.ts` | Pure state mutations; `buildGameState()` / `UI_ONLY_PROPERTIES` / dialog reset-on-load delegate to `persistedStateBoundary.ts`. |
| `client/src/game/dialogRegistry.ts` | SSOT for transient dialog store keys: blocking pause, save exclusion, reset-on-load. |
| `client/src/game/persistedStateBoundary.ts` | Schema-driven allowlist for save blobs; strips runtime/dialog keys via `dialogRegistry.ts`. |
| `shared/schema.ts` | Zod `gameStateSchema` / `SaveData` + shared shop constants. |
| `client/src/components/game/GameContainer.tsx` | Main game UI shell: tabs, panel switching, mounts all dialogs, hotkeys. |
| `client/src/pages/game.tsx` | Thin game route shell; init via `gameplayInitOrchestrator.ts`, loop stop on unmount. |
| `client/src/i18n/index.ts` | i18next bootstrap (lazy locale shards via `loadLocaleResources.ts`). |
| `server/index.ts` | Express API + static hosting entry point. |

---

## Client structure (`client/src/`)

| Directory | Role | Key files |
|-----------|------|-----------|
| entry | React root â†’ router | `main.tsx` (bootstraps text scale from `lib/textScale.ts`, tab-hidden CSS flag from `lib/tabVisibility.ts`; `BOOT_LOCALE_TIMEOUT_MS` (20s) â†’ fatal error screen), `App.tsx`, `components/AppErrorBoundary.tsx` (root React error boundary; auto `hardReload` on stale lazy chunks, else dig-deeper screen), `components/DeferredAppChrome.tsx` (idle-loads Radix `TooltipProvider` + `Toaster` so start-screen HTML skips `vendor-radix` modulepreload), `index.html` (black boot shell + SEO fallback; deferred `/boot.js` for `#adc-boot-spinner` after 500ms + boot watchdog matching `FATAL_UI_TIMEOUT_MS` (45s) / exhausted script-retry â†’ fatal error markup), `public/boot.js` (cache-bust `_cb` strip, module-load retry, spinner/watchdog), `index.css` (`--adc-text-scale` text utilities + `--adc-control-scale` button size chrome) |
| `pages/` | Route-level components (lazy-loaded) | `start-screen-page.tsx` (small save-header routing; dynamically imports the full store for started/cloud saves or Light Fire), `game.tsx`, `end-screen.tsx`, `reset-password.tsx`, `withdrawal.tsx`, `not-found.tsx`, `admin/dashboard.tsx`, `starship-shader-demo.tsx` (dev-only `/dev/starship-shader` preview), `animations-demo.tsx` (dev-only `/dev/animations` shell), `animations-demo/catalog.ts` (SSOT nav + section list), `animations-demo/DemoSection.tsx` (shared section/row chrome), `animations-demo/cssEffects.ts` (CSS class effect catalog), `animations-demo/section*.tsx` (split playground sections mounting real game components; click/hover particle galleries driven by `CLICK_PARTICLE_DEMO_PRESETS` / `HOVER_PARTICLE_DEMO_PRESETS` in `bubbly-button.particles.ts`), `combat-dialog-demo.tsx` + `combat-dialog-demo/seedState.ts` (dev-only `/dev/combat-dialog` â€” full combat loadout sandbox), `demo-end-screen-demo.tsx` (dev-only `/dev/demo-end` â€” Steam / Galaxy `DemoTimeUpDialog` preview) |
| `game/` | **Game engine** (see below) | `state.ts`, `loop.ts`, `playTimeAutoPrompts.ts` (play-time rewards/feedback auto-open; one blocking modal per tick), `actions.ts`, `save.ts` (cloud full-replace by default; kill switch `VITE_SAVE_FULL_REPLACE=0`), `saveStorage.ts` (lightweight IndexedDB names + edition save key), `startupSaveHeader.ts` (small localStorage routing/preferences header with existing-save backfill), `startupGameLoader.ts` (isolated full-store/game-loop bridge dynamically imported by the start page), `startupUrlCleanup.ts` (strip auth/campaign/stripe/boost/shop query params after consume), `gameplayInitOrchestrator.ts` (auth, hydrate, URL cleanup, Stripe return, loop start for `pages/game.tsx`), `dialogRegistry.ts` (transient dialog metadata SSOT), `persistedStateBoundary.ts` (save allowlist + runtime-key strip), `saveConflict.ts` (local/cloud restart reconciliation), `saveCodec.ts`, `stateHelpers.ts`, `sleepBonusTimers.ts` (freeze feast/heartfire/etc. wall-clock timers across sleep; applied on wake in `IdleModeDialog`), `sleepGainDisplay.ts` (cap sleep total-gain column / deltas to storage room), `winAchievements.ts` (Normal/Cruel/Speedrunner/Cave Veteran Epic win flags + `lifetimeGamesWon` from cube endings), `resourceStorageMax.ts` (Great Vault cap-hit tracking for Overall Resource Maxer; `lifetimeStorageMaxHits` persists across restarts), `estateUpgradeMax.ts` (Estate-tab upgrade max tracking for Overall Upgrade Maxer; `lifetimeEstateUpgradeMaxHits` persists across restarts), `demoLimit.ts` (Galaxy + Steam demo wooden-hut cap + footer progress segments; `processDemoLimit()` from `loop.ts`), `boost.ts`, `villagerCapUpgrades.ts`, `villagerJobPresets.ts`, `constructionQueueSlots.ts`, `weaponEnchantments.ts`, `villageEffectThemes.ts` (symbol/border themes for village timed-effect outcome dialogs), `auth.ts`, `referralCloudRefresh.ts` (merge referral-owned cloud fields into live state without full gameplay replace), `shopPurchases.ts`, `shopOpenSource.ts`, `socialTaskRewards.ts`, `socialTasksGold.ts`, `playlightExitIntent.ts`, `tabUnlockBlink.ts`, `achievementTabPulse.ts`, `bloodMoonOverlay.ts` (blood moon background/smoke overlay visibility + dev preview flag), `versionCheck.ts` (polls `/api/version` vs baked `__BUILD_SHA__`; triggers update toast in `GameContainer`), `constants.ts`, `rules/` |
| `components/game/` | Game-specific UI | `GameContainer.tsx`, `GameActionButtonStack.tsx` (in-flow wrapper for action buttons + badges), `GameHeader.tsx` (title + profile/playlight/leaderboard shortcuts; footer-matched chrome), `FullscreenButton.tsx` (Steam shell full-screen toggle in header/start screen), `gameChrome.ts` (header/footer inset constant), `panelResize.ts` (`usePanelResize` â€” drag limits, refs/styles, persists `panelSizes` desktop/mobile), `PanelResizeHandle.tsx` (separator grab handle on side-panel/log dividers), `TraderTabButton.tsx` (shop tab â—¬ + lime hover particles; periodic 15m hover hint), `GameTabs.tsx`, `GameButton.tsx`, `GameUiIcon.tsx` (CSS-mask white SVG icons from `public/icons/` for profile/settings/footer/tab menus), `SidePanelSectionIcon.tsx` (CSS-mask section headers from `public/icons/side-panel/`), `panels/`, `*Dialog.tsx`, `DemoTimeUpDialog.tsx` (blocking Galaxy/Steam demo end modal â†’ Steam wishlist; flame background via `EndScreenShaderBackground`), `VillageEffectDialog.tsx` (themed feast/curse/frostfall/etc. announcement modal via `OutcomeDialog`), `BlessingOfferDialog.tsx` (Insight blessing 3-card picker from timed tab), `ConstructionBoostBadge.tsx` (â© Insight badge on in-progress builds â€” one-time 50% time skip via Builder's Lodge tier 2+), `VillagerCapUpgradeBadge.tsx` (Insight villager-cap upgrade badge on VillagePanel job rows, one per cap group), `ShareDialog.tsx` (1080Ã—1350 social share image: title + resource column + 2Ã—2 achievement rings + overall % via `html-to-image`; silver `GlowingShadow` on CTA; header Share button in `ProfileMenu`), `GameFooter.tsx` (pause/shop/donate + Steam desktop Feedback → Google Form + Steam demo centered green progress bar), `FeedbackDialog.tsx` (play-time feedback prompt; form CTA + social/email links), `SettingsDialog.tsx` (Profileâ†’Settings: music/sfx volume sliders + mute, text size + language selectors, DEV Game Mode dropdown, and web-only email opt-in + delete-account; non-blocking, opened from `ProfileMenu`), `TextScaleSelector.tsx` (Normal/Large text size dropdown for Settings; persists via `lib/textScale.ts`), `EndScreen.tsx`, `StatEffectsTooltip.tsx` (per-stat luck/strength/knowledge/madness effect breakdown in side-panel tooltips, `BonusCompositionTooltip.tsx` (per-source bonus breakdown for side-panel Bonuses rows)), `StripePoweredBy.tsx` (checkout Stripe + payment-methods footer), `paymentMethodLogos.tsx` (Visa/MC/PayPal/Apple Pay/Google Pay SVG marks) |
| `components/ui/` | shadcn/ui design system + game visuals | `button.tsx`, `card.tsx`, `dialog`, `toast.tsx`, `text-shimmer.tsx` (loading button label shimmer), `bubbly-button.components.tsx` (inline click particles in `CooldownButton`; `BubblyButtonGlobalPortal` for coin/hover bursts), `bubbly-button.particles.ts` (craft/mine/explore burst presets; `FIRE_LOAD_PARTICLE_CONFIG` for boot spinner; `CHECKOUT_SUCCESS_PARTICLE_CONFIG` for shop purchase close), `page-load-spinner.tsx` (black loading screen + fire spinner/particles; â‰¥500ms delay; hands off `#adc-boot-spinner` from `index.html`; escalates via `FATAL_UI_TIMEOUT_MS`), `page-error-screen.tsx` (thin React wrapper â†’ `mountFatalErrorScreen()`), `mist-background.tsx`, `cloud-shader.tsx`, `starship-shader.tsx` (WebGL2 fullscreen starship fragment shader), `smoke-shader.tsx` (WebGL1 Smoke flow shader; shop first-purchase Insight banner), `spooky-smoke-animation.tsx` (WebGL2 blood moon smoke overlay), `vapour-text-effect.tsx` (canvas particle text vaporize cycle; start-screen intro dissolve after Make Fire), `glowing-shadow.tsx` + `glowing-shadow.css` (animated glowing border shell; silver/frame used on share-image border), `limelight-nav.tsx` |
| `hooks/` | React hooks | `use-toast.ts`, `useCooldown.ts`, `use-mobile.tsx`, `useFullscreen.ts` (Steam `steamBridge` full-screen state + toggle), `useSteamEditionActive.ts` (reactive Steam / Galaxy / DEV Game Mode; also `useDemoEditionActive` / `useSteamDemoActive`), `useIOSChromeViewportShell.ts` (CriOS: pin `GameContainer` shell to `visualViewport`), `useNewItemPulseTooltip.ts` (first-time `new-item-pulse` on tooltip triggers until hover/open; persisted in `hoveredTooltips`; `VillagePanel` indicators) |
| `i18n/` | Localization (see below) | `index.ts`, `locales.ts`, `useTextScale.ts` (text size hook; `localStorage` + DOM sync), `resolveGameText.ts`, `logDisplay.ts`, `locales/` |
| `lib/` | Cross-cutting utilities | `logger.ts` (always use instead of `console.*`), `fatalErrorScreen.ts` (`mountFatalErrorScreen()` dig-deeper DOM fallback; `BOOT_LOCALE_TIMEOUT_MS` / `FATAL_UI_TIMEOUT_MS`; soft i18n upgrade), `hardReload.ts` (cache-busting reload after deploy — navigates with `_cb`, strips param at boot in `public/boot.js` + `main.tsx`, purges Cache Storage/SW after load; `recoverFromStaleChunkLoad` from `AppErrorBoundary` because React.lazy swallows unhandledrejection; retry guard cleared only after StartScreen/Game mount, not App shell), `queryClient.ts`, `sessionTracker.ts`, `textScale.ts` (Normal/Large readable text preference; `--adc-text-scale` + milder `--adc-control-scale` on `<html>`, `localStorage`), `tabVisibility.ts` (`data-tab-hidden` on `<html>` while tab backgrounded — pauses decorative CSS animations), `viewportSize.ts` (layout viewport size + resize/full-screen subscriptions for shader canvases), `particlePortal.ts` (`getGameParticlePortalTarget()`, `resolveParticlePortalTarget()` — game-layer vs body portal mount for click bursts), `tailwindColors.ts`, Supabase/audio clients; `playlight.ts` (Playlight SDK + CSS loaded on demand after Light Fire / game mount — not on start screen; exit-intent sync from store, discovery pause); `playlightExitIntentClose.ts` (injected red close on SDK exit-intent bar); `firaSansFontFace.ts` (same-origin Fira Sans `@font-face` loader; start screen mounts 400/500 only, gameplay upgrades to full weights); `public/fonts/inter-heart.woff2` (tiny Inter subset for donate ❤ glyph only); `notoSansSymbols2FontFace.ts` (same-origin Noto symbols `@font-face` loader); `shareImageFonts.ts` (base64-inlined `@font-face` CSS for the share-image PNG export); `exclusivePromoShockwave.ts` (CSS class toggles for rewards-task shockwave hover/ping + donate-heart pump); `gameFeedbackForm.ts` (hosted Google Form URL; `openFeedbackDialog(source)` → FeedbackDialog form CTA; used by footer, end screen, play-time prompt) |
| `achievements/` | Achievement configs, charts, claim logic | `AchievementMiniRingChart.tsx` (sizeable ring donut), `achievementProgress.ts` (overall/per-category % complete), `achievementEdition.ts` (`webOnly` filter for Steam UI/sync), `nonOverallCompletion.ts` (Achievement Maxer: all non-overall complete), `configs/` (basic/building/item/action + non-claimable `overall` with Resource Maxer / Upgrade Maxer / Achievement Maxer / Cave Veteran; Supporter is `webOnly`) |

**Lazy-loading:** start screen loads first; the full `Game` chunk loads only after "Light Fire"
or when a saved `gameStarted` flag exists â€” keeps the initial bundle small.

---

## Game engine (`client/src/game/`)

Data-flow mental model:

```
startupIntent.ts + startupUrlCleanup.ts + startupCoordinator.ts
  â†’ parse intent, consume OAuth before URL cleanup, resolve StartScreen or Game
startupGameLoader.ts + gameplayInitOrchestrator.ts
  â†’ prepared-store handoff; state.loadGame() hydrates once; ordered post-load tasks
UI (GameContainer, panels, dialogs)
  â†• useGameStore (Zustand)
state.ts        â€” GameStore = persisted GameState + UI slice + store methods
  â†•
loop.ts         â€” rAF ~4 FPS: production cycle, events, autosave, timers, pause gates
  â†•
rules/          â€” declarative actions + events (data-driven, not a runtime VM)
actions.ts      â€” dispatch action ID â†’ handler, deduct costs, run effects
dialogRegistry.ts + persistedStateBoundary.ts
  â€” dialog pause/reset SSOT + schema-driven save allowlist
stateHelpers.ts â€” pure mutations + buildGameState() wrapper
save.ts         â€” IndexedDB + Supabase cloud sync
shared/schema.tsâ€” Zod GameState schema (source of truth for persisted shape)
```

- **`state.ts`** â€” central Zustand store. Exports `useGameStore`, `createInitialState()`,
  `StateManager` (batched derived-stat recompute), `isModalDialogOpen()` (sim freeze gate),
  `shouldBlockGameHotkeys()`, `detectRewards()`. Its `loadGame()` method is the single startup
  hydration path and reports whether persisted state was found.
- **`startupIntent.ts` / `startupUrlCleanup.ts` / `startupCoordinator.ts` / `startupGameLoader.ts` /
  `gameplayInitOrchestrator.ts`** â€” parse callback and campaign intent once, consume OAuth before
  URL cleanup, resolve StartScreen vs Game outside React, transfer any store prepared during
  auth/Steam checks or Light Fire, and run ordered gameplay init from `pages/game.tsx`.
- **`dialogRegistry.ts` / `persistedStateBoundary.ts`** â€” single dialog metadata source for blocking
  pause, reset-on-load, and runtime-only keys; schema-derived allowlist for `buildGameState()`.
- **`loop.ts`** â€” `TARGET_FPS = 4`. ~15s production cycle (`PRODUCTION_INTERVAL`), fixed tick
  (`TICK_INTERVAL` from `constants.ts`), pause gates (manual pause, idle, inactivity,
  `isModalDialogOpen`), autosave (15s guest / 60s signed-in cloud diff),
  attack-wave timer, play-time accumulation. Started from `gameplayInitOrchestrator.ts`; stopped on `pages/game.tsx` unmount via
  `stopGameLoop()`.
- **`rules/`** â€” `actionsRegistry.ts` (central `gameActions`), per-area action modules
  (`caveLogFallbacks.ts`, `caveExploreActions.ts`, `villageBuildActions.ts`, `forestSacrificeActions.ts`,
  `forestResearchActions.ts`, `bastionActions.ts`, â€¦), `index.ts` (visibility/affordability + `allEvents`), effects
  (`actionEffects.ts`, `effectsCalculation.ts`, `bonusComposition.ts` (side-panel bonus source breakdown), `costCalculation.ts`, `skillUpgrades.ts` (Estate/combat skill tiers incl. Crushing Strike, Bloodflame Sphere, Feral Howl), `executionTime.ts`), events (`events.ts`
  â†’ `EventManager`, `LogEntry`, plus topic files `events*.ts` incl. `eventsLadyMountains.ts` â€” DEV-only Lady/Liquid Death/Man/night attack + The Hound fellowship (Feral Howl); `eventsWanderingCollector.ts` / `collectorRejectedItems.ts` â€” wandering collector buy/sell timed tab + rejected-item tracking; `eventsChainmaster.ts` â€” Leatherbound Book discovery + collector timed tab; `eventsInsightBlessings.ts` / `insightBlessings.ts` â€” Insight-paid blessing timed tab + 3-card offer), `insightReveal.ts` /
  `insightRevealTooltip.tsx` (bulk building/craft description unlock via header insight badges;
  per-action reveal removed), `actionTooltipLayout.tsx` (`composeActionTooltip` â€” cost,
  description, revealed effects), `focusTooltipIndicator.tsx` (focus `â˜©` icon on eligible action
  tooltips while focus is active), `buildingUpgradeTooltipIndicator.tsx` (upgrade `ðŸ •` icon on
  construction tooltips for buildings that replace earlier tiers), `tooltips.tsx` / `itemTooltips.tsx`.
- **Action path:** UI â†’ `useGameStore.executeAction(id)` â†’ `actions.ts` maps ID â†’ `handle*`
  function in a rule module â†’ `StateManager.scheduleEffectsUpdate()` recomputes derived stats.
- **Event path:** `loop.ts`/store â†’ `checkEvents()` â†’ `EventManager` evaluates `allEvents`
  â†’ opens `EventDialog`, `VillageEffectDialog` (themed village timed-effect outcomes), or `timedEventTab`.
- **`villageEffectThemes.ts`** â€” maps event outcomes to produce-header symbols/colors; `resolveVillageEffectAnnouncementTheme()` in `applyEventChoice` (`state.ts`) schedules `VillageEffectDialog`.
- **`playlightExitIntent.ts`** â€” play-time exit-intent milestones (90m/150m/210m/270m/330m);
  skips 150m and 270m when Playlight discover social task is fulfilled;
  `getActivePlaylightExitMilestone()`; consumed count persisted as `playlightExitIntentMilestoneIndex`
  in save (read/written by `lib/playlight.ts` on SDK `exitIntent`).
- **`versionCheck.ts`** â€” polls `/api/version` against compile-time `__BUILD_SHA__` (focus/visibility + 5m interval); on mismatch saves game and shows a sticky update toast in `GameContainer` with a live `M:SS` countdown, then force `hardReload` after 5 minutes (or via toast action / tab-return after grace). Counts real hardReload navigations per server SHA (max 3); after that, sticky manual refresh only (no auto-reload loop). Skips when `__BUILD_SHA__` is `"dev"` (Vite non-production); local `npm run dev` also omits leftover `dist/build-meta.json` from `/api/version`.
- **`boost.ts`** â€” one-time `/boost` URL resource bonus for started saves; gated by persisted
  `boostApplied` (`shared/schema.ts`, migrated from legacy `boostMode`); applied on load in
  `gameplayInitOrchestrator.ts` via `canApplySaveBoost` / `applySaveBoost`.
- **`tabUnlockBlink.ts`** â€” one-time tab unlock blink (`story.seen` `tabUnlockBlinkSeen_*`);
- **`achievementTabPulse.ts`** â€” achievements tab pulse until opened (`story.seen` `achievementTabPulseSeen_*`);
- **`villagerCapUpgrades.ts`** â€” per-profession villager caps via Insight upgrades (group/building mapping,
  cap/cost tables, `flags.villagerCapsEnabled` new-games gate + `import.meta.env.DEV` until shipped); enforced in
  `assignVillagerToJob`, `upgradeVillagerCap` in `state.ts`, UI in `VillagePanel` / `SidePanelSection` /
  `itemTooltips.tsx`.
- **`villagerJobPresets.ts`** â€” villager job presets unlocked by the Scribe's Office â†’ Records Hall â†’ Grand Archive
  building chain (2 + 1 + 2 slots = 5 max). Snapshot/apply helpers (proportional shrink, surplus â†’
  free, cap-clamped); persisted in `villagerJobPresets` / `activePresetSlot` (`shared/schema.ts`). Store methods
  `saveVillagerJobPreset` / `applyVillagerJobPreset` / `setActivePresetSlot` (`state.ts`); UI row in the
  `VillagePanel` "Produce" header.
- **`constructionQueueSlots.ts`** â€” parallel construction queue (base 1 slot; Builder's Lodge/Guild
  unlock 2 extra slots purchasable with Insight = 3 max), build-time/cost reductions from Builder building tiers,
  and Construction Boost (Insight skip 50% of build time). Same boost logic applies to crafting (Insight skip 50%
  of craft time) when Advanced Blacksmith is built; enforced in `canExecuteAction`, `getExecutionTime`,
  `getTotalBuildingCostReduction`; persisted in `constructionQueueSlotsPurchased` / `constructionBoostsUsed`
  (`shared/schema.ts`); store methods `purchaseConstructionQueueSlot` / `boostConstruction` (`state.ts`); UI queue
  indicators + `ConstructionBoostBadge` on build buttons in `VillagePanel` and craft buttons in `CavePanel`.
- **`weaponEnchantments.ts`** â€” weapon enchantment via Insight, unlocked by Tomewarden Academy
  (`buildings.inkwardenAcademy`). Tiered bow/sword chains: only `blacksteel_bow` / `blacksteel_sword` are
  enchantable; other weapons enchant once (+`1 + floor(stat/10)` Strength/Knowledge each, cost `(added) Ã— 250`);
  Nightshade Bow has a 2-level table (+base/enchant Strength, +1 poison DoT round).
  Levels persist in `weaponEnchantments` (`shared/schema.ts`); bonuses applied in `calculateTotalEffects`,
  spent via `enchantWeapon` (`state.ts`), UI badge + blue tooltip stats in `SidePanelSection` / `itemTooltips.tsx`,
  combat poison rounds via `getPoisonArrowsDotFightRounds` (`CombatDialog`, `tooltips.tsx`).

---

## State persistence

- **`stateHelpers.ts` / `persistedStateBoundary.ts`** â€” `buildGameState(state)` builds saves from a
  schema-derived allowlist plus documented store extensions (execution timers, timed visits, audio
  prefs). Dialog/runtime keys come from `dialogRegistry.ts`. Forces `isPaused: false` on save.
- **`save.ts`** â€” IndexedDB (`ADarkCaveDB`); guest saves encode via `saveCodec.ts`
  (XOR+Base64, `ADC2:` prefix). Signed-in cloud save (V1 edge `save-game`):
  **full-document replace by default** (`fullReplace: true` â†’ SQL `p_full_replace`,
  migration 030); kill switch `VITE_SAVE_FULL_REPLACE=0` restores diff + deep-merge
  against `lastCloudState` (legacy clients omit the flag and keep merge).
  Migration `037` union-merges `referrals` on save (with row lock) so server-written
  invite rewards survive stale full-replace payloads; `shared/referralMerge.ts` mirrors
  that merge on load.
  Load applies migrations (e.g. `migrateTraderShopUnlockOnLoad`).
- **`auth.ts`** â€” Supabase auth (incl. anonymous guest-checkout via `ensureAnonymousSession`),
  `saveGameToSupabase`/`loadGameFromSupabase`, referral metadata; live referral sync via `referralCloudRefresh.ts`.
- **`referralCloudRefresh.ts`** - `applyReferralCloudRefreshPatch()` merges referral-owned cloud fields (lists, codes, one-time gold) into the live store without replacing gameplay.
- **`shopPurchases.ts`** â€” Supabase `purchases` fetch/rehydrate, feast-activation merge, purchase ID helpers (used by `ShopDialog`, payment return).
- **`shopPostPurchaseState.ts`** â€” After paid checkout: discount consumption + first-purchase Insight bonus (`shared/firstPurchaseInsightBonus.ts`).
- **`shopOpenSource.ts`** — Trader shop open entry sources → `shop-open-{source}` button_clicks IDs (tab/footer/gratitude/url); `traderDialogOpens` remains for events.
- **`shared/schema.ts`** â€” Zod schema = source of truth; `createInitialState()` derives defaults from it.
  Playlight exit-intent quota: `playlightExitIntentMilestoneIndex` (load floor from `playTime` in `state.ts` `loadGame`, same pattern as `socialPromptMilestoneIndex`).
- **`socialTaskRewards.ts`** â€” `isSocialRewardFulfilled()` / `isSocialRewardClaimed()`: shared helpers for rewards-dialog tasks where action completion (`fulfilled`) and gold grant (`claimed`) are separate (legacy saves treat `claimed` as fulfilled).
- **`socialTasksGold.ts`** â€” `computePersistedSocialTasksGold()`: re-applies one-time rewards-task gold on `restartGame()` when claim flags persist (sign-up welcome, email, social follows, Playlight discover, claimed referrals).

> **Modal-pause convention:** add blocking dialogs to `GAME_DIALOG_REGISTRY` in
> `dialogRegistry.ts` (drives pause, reset-on-load, and save exclusion). See
> `.cursor/rules/modal-dialog-pause.mdc`.

---

## i18n (`client/src/i18n/`)

- **`index.ts`** â€” i18next bootstrap; lazy `import.meta.glob` of `locales/*/*.json` and
  `locales/*/ui/*.json` via **`loadLocaleResources.ts`** (StartScreen boot loads only `ui/shell`
  + `ui/seo` for English and the selected locale; `pages/game.tsx` loads complete catalogs before
  gameplay; language changes load the startup subset or full catalog based on the active phase).
  UI namespace is assembled from shards under `locales/{lang}/ui/`.
- **`locales.ts`** â€” supported: **en, de, fr, es, it, pt-BR, zh-CN, ru**. Namespaces: `common`, `ui`,
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
| `build` | Vite + `write-build-meta.mjs` + esbuild | Client bundle (`__BUILD_SHA__` baked in), server bundle, `dist/build-meta.json` for `/api/version`. |
| `i18n:extract` | `extract-i18n.mjs` | Scan client strings â†’ locale JSON. |
| `i18n:translate` | `translate-locales.mjs` | Machine-translate missing locale keys. |
| `i18n:events:extract` / `i18n:events:migrate` | `extract-events-i18n.mjs`, `migrate-events-i18n.mjs` | Events namespace extraction + migration. |
| `i18n:verify` | `list-unmigrated-events.mjs`, `check-event-coverage.mjs`, `audit-i18n-ui.mjs`, `audit-locale-length.mjs` | CI-style i18n parity checks (+ Vitest i18n tests). |
| `i18n:sync` | `sync-locale-keys.mjs`, `fill-identical-locale-strings.mjs` | Align locale key sets across languages (`sync-locale-keys.test.ts` covers insert/prune). |
| `export:resend-csvs` | `export-resend-contact-csvs.ts` | Marketing contact CSV export (uses gender proxy). |
| `sync:resend-marketing` | `sync-resend-marketing-contacts.ts` | Push marketing opt-in contacts to Resend via Contacts Import API (with `unsubscribe_url` tokens). |
| `import:resend-legacy-segments` | `import-legacy-resend-segments.ts` | One-time import of two legacy cohorts into Resend **Segments** (oldestâ†’newest): pre-consent users (no `marketing_preferences` row) and currently-subscribed users. Shares env with `resendScriptEnv.ts`. |
| `rebuild:resend-marketing` | `rebuild-resend-marketing-contacts.ts` | Wipe all Resend contacts, then re-import pre-consent + subscribed cohorts (excludes opt-outs; `--dry-run` / `--skip-delete`). |
| `test:gender` | `test-gender-service.js` | Smoke-test `services/gender-service/`. |

Support modules (not always npm-wired): `write-build-meta.mjs` (git HEAD â†’ `dist/build-meta.json` after client build), `generate-logo-assets.py` (resize `build-resources/logo-source.png` â†’ favicons, PWA, OG, Electron icons), `locale-catalog.mjs`, `parse-locale-json.mjs`,
`i18n-ui-shards.mjs`, `audit-locale-translations.mjs`, `audit-timed-tab-i18n.mjs`,
`apply-*-fix-translations.mjs`, `apply-cube-translations.mjs`, `restore-ok-comments.mjs`,
`fix-es-locale-encoding.mjs`, `sync-resend-marketing-contacts.mjs` (ad hoc Resend import from MCP SQL export),
`resendScriptEnv.ts` (shared Supabase + Resend key resolution for the Resend CLI scripts),
plus `*-fix-translations.json` / `cube-events-translations.json`
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
| `electron/main.ts` | Electron main process: Steamworks init + overlay, loopback server, save-file IPC (shared cloud path + legacy demo read/dual-write), full-screen/layout IPC, window icon/title, single-instance, external-link handling. |
| `electron/paths.ts` | Electron `APP_USER_DATA_NAME` (IndexedDB) + shared Auto-Cloud path (`STEAM_CLOUD_DIR_NAME` / `STEAM_CLOUD_SAVE_FILE`); demo keeps userdata `A Dark Cave Demo` but writes the same cloud file as full; legacy demo path read/dual-write in `main.ts`. |
| `electron/preload.ts` | `contextBridge` exposing `window.steamBridge` (achievements, Cloud save, full-screen toggle/events) to the sandboxed renderer. |
| `electron/loopbackServer.ts` | Serves built `dist/public` over `http://127.0.0.1:<port>` (absolute-path routing needs HTTP, not `file://`). |
| `electron/steam.ts` | Defensive `steamworks.js` wrapper; `enableSteamOverlay` + `initSteam` must run before `app.whenReady()` (Chromium overlay switches). |
| `client/src/lib/edition.ts` | `isSteamBuild`, `isSteamDemoBuild`, `isSteamPlaytestBuild`, `isDemoEdition()`, `isSteamDemoActive()`, `isSteamEditionActive()` (+ DEV Settings â†’ Game Mode: Normal / Steam Game / Playtest / Demo). |
| `client/src/lib/steam.ts` | Renderer-side safe wrapper over `window.steamBridge` (achievements, saves, full-screen; no-ops on web). |
| `client/src/game/steamSaveAdapter.ts` | Mirrors the encoded `ADC2:` save blob to the Steam Cloud file; reconciles with IndexedDB by `playTime`. |
| `client/src/achievements/steamAchievements.ts` | Maps ring achievements to Steam API names (`ACH_*`), skipping `webOnly` (e.g. Supporter); unlocks on criteria-met (loop + load backfill). |
| `scripts/build-electron.mjs` | esbuild bundles `main`/`preload` to `dist-electron/*.cjs` (`ADC_STEAM_DEMO=1` / `ADC_STEAM_PLAYTEST=1` for variants). |
| `scripts/package-steam-demo.mjs` | `npm run electron:package:demo` â€” Vite demo build + Electron bundle + `electron-builder.demo.yml`. |
| `scripts/package-steam-playtest.mjs` | `npm run electron:package:playtest` â€” Vite playtest build + Electron bundle + `electron-builder.playtest.yml`. |
| `scripts/steam-upload.ps1` | Uploads `release/win-unpacked` to SteamPipe via `steamcmd` (`npm run steam:upload`). |
| `scripts/steam-upload-demo.ps1` | Demo SteamPipe upload (`npm run steam:demo:upload`). |
| `scripts/steam-upload-playtest.ps1` | Playtest SteamPipe upload (`npm run steam:playtest:upload`). |
| `scripts/UploadToSteam.cmd` | Desktop wrapper for `steam-upload.ps1`. |
| `scripts/UploadDemoToSteam.cmd` | Desktop wrapper for `steam-upload-demo.ps1`. |
| `scripts/UploadPlaytestToSteam.cmd` | Desktop wrapper for `steam-upload-playtest.ps1`. |
| `scripts/steam-upload-all.ps1` | Build/stage/upload full + demo + playtest in one SteamCMD session (`npm run steam:upload-all`). Stages under `%LOCALAPPDATA%\a-dark-cave-steam\` (outside the repo). |
| `scripts/UploadAllToSteam.cmd` | Desktop wrapper for `steam-upload-all.ps1`. |

**Edition seams (guarded by `isSteamBuild`):** Supabase short-circuits in `lib/supabase.ts`;
`pages/game.tsx` skips Playlight init, session tracker, auth, purchase rehydrate,
and Stripe return; `game/save.ts` takes the local-only path + Steam Cloud mirror; `game/loop.ts`
syncs Steam achievements; `state.ts` `createInitialState`/`restartGame`
set `BTP=1` and grant `activatedPurchases.full_game` as an entitlement sentinel (merchant
artifacts + BTP economy; web no longer sells a Full Game SKU — MTX shop only);
`GameContainer`/`ProfileMenu` hide shop/leaderboard/share/invite/auth; `pages/end-screen.tsx`
unlocks Cruel Mode free once `hasWonAnyGame` is set and opens the hosted feedback form
(`lib/gameFeedbackForm.ts`) from the Feedback button (same helper as the Steam footer).

**Scripts:** `build:steam` (Vite client build with the flag), `electron:build` (bundle shell),
`electron:dev` (build + run), `electron:package` (electron-builder Windows installer â†’ `release/`).

The Steam Vite build omits web-only chunks (Stripe, Supabase, admin dashboard, shop/leaderboard
dialogs, legal pages) via `vite.config.ts` aliases to `client/src/stubs/steam/` and build-time
lazy-import guards in `App.tsx` / `WebOnlyDialogs.tsx`.

**Steamworks Auto-Cloud** (partner backend â†’ app â†’ Technical Settings â†’ Steam Cloud): enable
Steam Cloud, then add one Auto-Cloud row (Windows-only build):

| Field (DE / EN) | Value |
|-----------------|-------|
| Stammverzeichnis / Root | `WinAppDataRoaming` |
| Unterverzeichnis / Subdirectory | `A Dark Cave` (`electron/paths.ts` â†’ `STEAM_CLOUD_DIR_NAME`) |
| Muster / Pattern | `adc-steam-save.dat` (`STEAM_CLOUD_SAVE_FILE`) |
| Betriebssystem / OS | Windows |
| Rekursiv / Recursive | off |

On disk: `%APPDATA%\A Dark Cave\adc-steam-save.dat`. Root overrides empty (Windows-only).
App ID **4882240** in `steam_appid.txt`. Full + demo share this Auto-Cloud path (demoâ†’full continue). At full release, set the demo appâ€™s **Shared cloud APP ID** to `4882240`.

**SteamPipe upload** (partner backend â†’ SteamPipe â†’ Builds):

1. **Depot anlegen** (falls noch keiner da): SteamPipe â†’ *Depots* â†’ Windows-Depot. Depot-ID in `steam/config.local.json` eintragen (Vorlage: `steam/config.example.json`).
2. **Lokal bauen:** `npm run electron:package` â†’ erzeugt `release/win-unpacked/` (Spieldateien) und `release/A Dark Cave-*-setup.exe` (Installer, **nicht** zu Steam hochladen).
3. **Steamworks SDK** von der Partner-Seite laden, Pfad in `config.local.json` â†’ `steamworksSdk`.
4. **Hochladen:** `npm run steam:upload` (baut bei Bedarf, lÃ¤dt `release/win-unpacked/` direkt hoch). `SetLive` bleibt leer â€” Steam erlaubt kein automatisches Setzen von Branch `default` per steamcmd; Build danach manuell in SteamPipe â†’ Builds auf `default` setzen (optional `setLiveBranch` in `config.local.json` fÃ¼r Beta-Branches).
5. **Installation** (SteamPipe â†’ Installation / Launch Options): Startprogramm = `A Dark Cave.exe` (demo build sets `executableName: A Dark Cave` in `electron-builder.demo.yml`).
6. **Testen:** Paket *developer comp* muss das Depot enthalten â†’ Build-Branch `default` in der Steam-Bibliothek testen.
7. **VerÃ¶ffentlichen** (Tab *VerÃ¶ffentlichen*): Cloud-, Build- und Store-Ã„nderungen live schalten.

**Steam demo** (separate Steamworks child app, capped at 8 wooden huts):

| Path | Responsibility |
|------|----------------|
| `client/src/lib/edition.ts` | `isSteamDemoBuild` (`VITE_STEAM_DEMO=1`), `isDemoEdition()`, `isSteamFullBuild`. |
| `client/src/game/demoLimit.ts` | Shared wooden-hut demo limit + `processDemoLimit()` (Galaxy + Steam demo). |
| `client/src/game/galaxyDemo.ts` | Deprecated re-exports from `demoLimit.ts`. |
| `client/src/components/game/DemoTimeUpDialog.tsx` | Blocking end-of-demo modal â†’ Steam wishlist. |
| `electron/paths.ts` | Demo keeps Electron userdata `A Dark Cave Demo` (IndexedDB) when `ADC_STEAM_DEMO_BUILD=1`; cloud file is the shared full-game path. |
| `steam_appid_demo.txt` | Demo App ID **4971800** baked into demo packages. |
| `scripts/package-steam-demo.mjs` | `npm run electron:package:demo` â€” build + package demo. |
| `scripts/steam-upload-demo.ps1` | `npm run steam:demo:upload` â€” build (optional) + SteamPipe upload. |
| `scripts/UploadDemoToSteam.cmd` | Double-click / desktop shortcut wrapper for `steam-upload-demo.ps1`. |
| `steam/config.demo.example.json` | Demo `appId` / `depotId` template for upload script. |

Demo saves: IndexedDB key `steamDemoSave` under `%APPDATA%\A Dark Cave Demo\` + Steam Cloud file `%APPDATA%\A Dark Cave\adc-steam-save.dat` (same Auto-Cloud row as the full game). Legacy file `%APPDATA%\A Dark Cave Demo\adc-steam-demo-save.dat` is still read as fallback and dual-written by the demo during cutover â€” keep a second Auto-Cloud row for that legacy path until the transition is done. Achievements use the same `ACH_*` mapping as the full game.

**Scripts:** `build:steam-demo`, `electron:package:demo`, `steam:demo:upload` / `steam:demo:upload-only` / `steam:demo:stage`.

**Steam playtest** (separate Steamworks child app, **full game**, gated signups on main store page):

| Path | Responsibility |
|------|----------------|
| `client/src/lib/edition.ts` | `isSteamPlaytestBuild` (`VITE_STEAM_PLAYTEST=1`), `isSteamFullBuild`. |
| `electron/paths.ts` | Playtest userdata subdirectory + cloud filename when `ADC_STEAM_PLAYTEST_BUILD=1`. |
| `steam_appid_playtest.txt` | Playtest App ID **4972040** baked into playtest packages. |
| `scripts/package-steam-playtest.mjs` | `npm run electron:package:playtest` â€” build + package playtest. |
| `scripts/steam-upload-playtest.ps1` | `npm run steam:playtest:upload` â€” build (optional) + SteamPipe upload. |
| `scripts/UploadPlaytestToSteam.cmd` | Double-click / desktop shortcut wrapper for `steam-upload-playtest.ps1`. |
| `steam/config.playtest.example.json` | Playtest `appId` / `depotId` template for upload script. |

Playtest saves: IndexedDB key `steamPlaytestSave` + `%APPDATA%\A Dark Cave Playtest\adc-steam-playtest-save.dat` (matching Auto-Cloud row on the **playtest** app). No wooden-hut cap â€” same full-game content as release.

**Scripts:** `build:steam-playtest`, `electron:package:playtest`, `steam:playtest:upload` / `steam:playtest:upload-only` / `steam:playtest:stage`.

---

## Galaxy demo (`/galaxy`)

Web demo for [galaxy.click](https://galaxy.click) at **`https://a-dark-cave.com/galaxy`**. Same gameplay
shell as the Steam edition (no shop, Playlight, leaderboard, auth, or Supabase cloud saves) with the
full game unlocked locally until the cap. Saves use IndexedDB key `galaxySave` (isolated from `mainSave`). The demo
ends when the player builds their **8th wooden hut**; `DemoTimeUpDialog` then blocks the sim and links to the
[Steam store page](https://store.steampowered.com/app/4882240/A_Dark_Cave/).

| Path | Responsibility |
|------|----------------|
| `client/src/lib/edition.ts` | `isGalaxyEdition()` (URL prefix `/galaxy`), `isDemoEdition()`, `isLocalOnlyEdition()`, `isFullGameUnlockedEdition()`. |
| `client/src/game/demoLimit.ts` | Wooden-hut demo limit + `processDemoLimit()` (called from `loop.ts`). |
| `client/src/game/galaxyDemo.ts` | Deprecated re-exports from `demoLimit.ts`. |
| `client/src/components/game/DemoTimeUpDialog.tsx` | Blocking end-of-demo modal â†’ Steam wishlist. |
| `client/src/App.tsx` | Route `/galaxy` → `StartScreenPage`. |

Edition behavior reuses `isSteamEditionActive()` / `useSteamEditionActive()` for UI (shop hidden, etc.).

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
| `/api/admin/*` | inline + `server/adminDashboardData.ts` | Admin dashboard: split endpoints (`metrics`, `dau`, `saves`, `save-analysis`, `clicks`, `purchases`, `sessions`, `sessions/intraday`); Resend marketing CSV download + sync; saves return slim `game_state` projection (PostgREST ~1000-row page); `save-analysis` deep-scans last 100 full saves via `shared/saveGameAnalysis.ts` (wipes, slice shape, craft/unlock mismatches, population, `clientBuildSha` vs published build via `server/publishedBuildSha.ts` — prod fetches `a-dark-cave.com/api/version`; lazy-loaded tab) |
| `/api/config` | inline | Public Supabase keys |
| `/api/version` | inline | Deploy build sha + semver (`no-store`; client compares against `__BUILD_SHA__`) |

Support: `server/vite.ts` (dev/prod hosting + SPA fallback with route allowlist/404 and per-route HTML head patching via `server/spaHtml.ts` + `shared/publicSeo.ts`; `boot.js` served with no-cache like `index.html`), `server/securityHeaders.ts` (Phase A: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), `server/supabaseServerClient.ts` (service-role client),
`server/paymentVerifyAuth.ts` (payment-verify session/body user match), `server/stripeFxQuote.ts`,
`server/stripeWebhook.ts` (`POST /api/payment/webhook`, raw body + `STRIPE_WEBHOOK_SECRET_DEV` / `_PROD`),
`server/resendContactCsv.ts` (marketing CSV rows + `unsubscribe_url` tokens; `loadResendLegacyCohorts` splits confirmed users into pre-consent / subscribed cohorts, oldestâ†’newest),
`server/resendContactSync.ts` (Resend Contacts Import API upload for admin sync / CLI; Segment create/list/find-or-create + per-segment import helpers).

---

## Testing

- **Runner:** Vitest 4 (`vitest.config.ts`, env `node`, aliases `@`/`@shared`; `vitest.setup.ts`
  adds jest-dom + `ResizeObserver` polyfill).
- **Layout:** `*.test.ts` / `*.test.tsx` co-located with source.
- **Coverage:** engine (`state.test.ts`, `loop.test.ts`, `save*.test.ts`, `demoLimit.test.ts`, `rules/*.test.ts`),
  i18n (`i18n/*.test.ts`), server (`stripe*.test.ts`, `referral*.test.ts`), shared, components.
- **Run:** `npm test` (watch) or `npm run i18n:verify` (i18n subset + audits).

---

## Conventions

1. **Single game store** â€” all gameplay reads/writes go through `useGameStore`; UI state is mixed
   in but stripped on save via `persistedStateBoundary.ts` (`UI_ONLY_PROPERTIES` alias).
2. **Declarative actions/events** â€” actions are objects (`show_when`, `cost`, `effects`,
   optional `executionTime`); events are records merged into `allEvents`.
3. **Handler dispatch table** â€” `actions.ts` maps action IDs to `handle*` functions in rule modules.
4. **Modal-pause SSOT** â€” `dialogRegistry.ts` â†’ `isModalDialogOpen` in `state.ts`.
5. **Log entries carry i18n keys** â€” `{ logKey, logVars }` resolved by `i18n/logDisplay.ts`.
6. **Shared Zod schema** â€” `shared/schema.ts` is authoritative; defaults flow into `createInitialState()`.
7. **Logging** â€” use `client/src/lib/logger.ts`, never `console.*`.
8. **Backward-compatible saves** â€” add new fields with `z.default()`; don't rename stored IDs.
9. **Tooltips** â€” `TooltipWrapper` + `useGlobalTooltip` on item/action triggers; side-panel
   section titles are plain labels (no separate info-glyph component). Panel action buttons
   compose layout via `rules/actionTooltipLayout.tsx` (`composeActionTooltip`); focus glow
   actions add `â˜©` via `rules/focusTooltipIndicator.tsx` while focus is active; building
   upgrade construction tooltips add `ðŸ •` via `rules/buildingUpgradeTooltipIndicator.tsx`.
10. **Dual persistence** â€” IndexedDB always; Supabase when authenticated (optimistic diff saves).

> See `.cursorrules` for the full coding-style/philosophy guide; this file is the navigational map.
