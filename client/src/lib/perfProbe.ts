/**
 * Long-session performance probe for soak runs (lag after many hours).
 *
 * Quiet by default in production. Enable with `?perf=1` (prod or DEV) or any
 * Vite DEV session. Dump samples from DevTools:
 *
 *   __adcPerf.dump()
 *   copy(__adcPerf.toCsv())
 *
 * Full usage: `client/src/lib/perfProbe.md`
 */

import { tryGetBoundGameStore } from "@/game/gameStoreHolder";
import { logger } from "@/lib/logger";

export const PERF_QUERY_PARAM = "perf";
export const PERF_INTERVALS_QUERY_PARAM = "perfIntervals";
export const PERF_SAMPLE_MS_QUERY_PARAM = "perfSampleMs";

export const ADC_SAVE_MEASURE = "adc-save";
export const ADC_SAVE_STRINGIFY_MEASURE = "adc-save-stringify";

const DEFAULT_SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
const MIN_SAMPLE_INTERVAL_MS = 10_000;
const MAX_SAMPLE_INTERVAL_MS = 60 * 60 * 1000;
const MAX_ROWS = 500;
const MAX_LONG_TASKS = 2000;

const noop = () => {};

export type AdcPerfLongTask = {
  t: number;
  dur: number;
  name: string;
  type: "longtask" | "loaf";
};

export type AdcPerfSaveRecord = {
  iso: string;
  stringifyMs: number;
  encodeMs: number;
  totalMs: number;
  jsonBytes: number;
  encodedBytes: number;
};

export type AdcPerfSample = {
  label: string;
  iso: string;
  sinceBootMs: number;
  usedMB: number | null;
  totalMB: number | null;
  heapLimitMB: number | null;
  domNodes: number | null;
  howlCount: number | null;
  longTasksLastMin: number;
  longTasksLastMinMaxMs: number;
  loafLastMin: number;
  logLen: number;
  logReadEntries: number;
  resourceChangeEvents: number;
  consumedResourceChangeIds: number;
  storySeen: number;
  triggeredEvents: number;
  eventCooldowns: number;
  hoveredTooltips: number;
  scrollIndicatorSeen: number;
  clickAnalytics: number;
  cooldowns: number;
  activeCooldowns: number;
  executionStartTimes: number;
  priorAssigned: number;
  cooldownUiPolls: number;
  liveSetIntervals: number | null;
  storeNotifyTotal: number;
  storeNotifySinceLast: number;
  storeNotifyPerSec: number | null;
  saveStringifyMs: number | null;
  saveEncodeMs: number | null;
  saveTotalMs: number | null;
  saveJsonBytes: number | null;
  saveEncodedBytes: number | null;
  playTime: number;
  lifetimePlayTimeMs: number;
  activeTab: string | null;
};

export type AdcPerfApi = {
  sample: (label?: string) => AdcPerfSample;
  rows: AdcPerfSample[];
  longTasks: AdcPerfLongTask[];
  lastSave: AdcPerfSaveRecord | null;
  dump: () => AdcPerfSample[];
  toCsv: () => string;
  copyCsv: () => Promise<boolean>;
  mark: (label: string) => AdcPerfSample;
  clear: () => void;
  clearLongTasks: () => void;
  start: (intervalMs?: number) => void;
  stop: () => void;
};

export type PerfMeasureHandle = {
  name: string;
  id: number;
  t0: number;
} | null;

type ChromePerformanceMemory = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

type UiCounterKey = "logReadEntries" | "consumedResourceChangeIds";

const SAMPLE_CSV_COLUMNS: (keyof AdcPerfSample)[] = [
  "iso",
  "label",
  "sinceBootMs",
  "usedMB",
  "totalMB",
  "heapLimitMB",
  "domNodes",
  "howlCount",
  "longTasksLastMin",
  "longTasksLastMinMaxMs",
  "loafLastMin",
  "logLen",
  "logReadEntries",
  "resourceChangeEvents",
  "consumedResourceChangeIds",
  "storySeen",
  "triggeredEvents",
  "eventCooldowns",
  "hoveredTooltips",
  "scrollIndicatorSeen",
  "clickAnalytics",
  "cooldowns",
  "activeCooldowns",
  "executionStartTimes",
  "priorAssigned",
  "cooldownUiPolls",
  "liveSetIntervals",
  "storeNotifyTotal",
  "storeNotifySinceLast",
  "storeNotifyPerSec",
  "saveStringifyMs",
  "saveEncodeMs",
  "saveTotalMs",
  "saveJsonBytes",
  "saveEncodedBytes",
  "playTime",
  "lifetimePlayTimeMs",
  "activeTab",
];

let enabledOverride: boolean | null = null;
let enabledCache: boolean | null = null;
let installed = false;
let verboseConsole = false;
let bootNow = 0;
let sampleTimer: ReturnType<typeof setInterval> | null = null;
let nativeSetInterval = globalThis.setInterval.bind(globalThis);
let nativeClearInterval = globalThis.clearInterval.bind(globalThis);
let intervalsPatched = false;
let liveIntervalIds: Set<unknown> | null = null;
let measureSeq = 0;
let storeNotifyCount = 0;
let storeNotifyAtLastSample = 0;
let lastSampleNow = 0;
let storeNotifyUnsub: (() => void) | null = null;
let cooldownUiPolls = 0;
let pendingStringify = { ms: 0, jsonBytes: 0 };
let lastSave: AdcPerfSaveRecord | null = null;

const rows: AdcPerfSample[] = [];
const longTasks: AdcPerfLongTask[] = [];
const observers: PerformanceObserver[] = [];
const uiCounters: Record<UiCounterKey, number> = {
  logReadEntries: 0,
  consumedResourceChangeIds: 0,
};

function truthyQueryFlag(raw: string | null): boolean {
  if (raw == null) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function hasPerfQueryFlag(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): boolean {
  return truthyQueryFlag(new URLSearchParams(search).get(PERF_QUERY_PARAM));
}

export function hasPerfIntervalPatchFlag(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): boolean {
  return truthyQueryFlag(
    new URLSearchParams(search).get(PERF_INTERVALS_QUERY_PARAM),
  );
}

export function parsePerfSampleIntervalMs(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): number {
  const raw = new URLSearchParams(search).get(PERF_SAMPLE_MS_QUERY_PARAM);
  const parsed = raw == null || raw === "" ? DEFAULT_SAMPLE_INTERVAL_MS : Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLE_INTERVAL_MS;
  return Math.min(
    MAX_SAMPLE_INTERVAL_MS,
    Math.max(MIN_SAMPLE_INTERVAL_MS, Math.floor(parsed)),
  );
}

export function isPerfProbeEnabled(): boolean {
  if (enabledOverride != null) return enabledOverride;
  if (enabledCache != null) return enabledCache;
  const fromUrl =
    typeof window !== "undefined" && hasPerfQueryFlag(window.location.search);
  enabledCache = Boolean(import.meta.env.DEV) || fromUrl;
  return enabledCache;
}

export function setPerfProbeEnabledForTests(value: boolean | null): void {
  enabledOverride = value;
  enabledCache = null;
}

function bytesToMb(bytes: number | undefined): number | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
  return Math.round((bytes / 1048576) * 10) / 10;
}

function keyCount(value: unknown): number {
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object") return Object.keys(value as object).length;
  return 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pushCapped<T>(list: T[], item: T, max: number): void {
  list.push(item);
  if (list.length > max) {
    list.splice(0, list.length - max);
  }
}

function csvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function storeCountersFromState(state: Record<string, unknown> | null | undefined) {
  const s = state ?? {};
  const story = asRecord(s.story);
  const seen = story?.seen;
  const cooldowns = asRecord(s.cooldowns) ?? {};
  let activeCooldowns = 0;
  for (const value of Object.values(cooldowns)) {
    if (typeof value === "number" && value > 0) activeCooldowns += 1;
  }
  const priorAssigned = s.priorAssignedActions;
  return {
    logLen: keyCount(s.log),
    resourceChangeEvents: keyCount(s.resourceChangeEvents),
    storySeen: keyCount(seen),
    triggeredEvents: keyCount(s.triggeredEvents),
    eventCooldowns: keyCount(s.eventCooldowns),
    hoveredTooltips: keyCount(s.hoveredTooltips),
    scrollIndicatorSeen: keyCount(s.scrollIndicatorSeen),
    clickAnalytics: keyCount(s.clickAnalytics),
    cooldowns: keyCount(cooldowns),
    activeCooldowns,
    executionStartTimes: keyCount(s.executionStartTimes),
    priorAssigned: Array.isArray(priorAssigned) ? priorAssigned.length : 0,
    playTime: typeof s.playTime === "number" ? s.playTime : 0,
    lifetimePlayTimeMs:
      typeof s.lifetimePlayTimeMs === "number" ? s.lifetimePlayTimeMs : 0,
    activeTab: typeof s.activeTab === "string" ? s.activeTab : null,
  };
}

function readChromeHeap(): {
  usedMB: number | null;
  totalMB: number | null;
  heapLimitMB: number | null;
} {
  const memory = (performance as Performance & { memory?: ChromePerformanceMemory })
    .memory;
  return {
    usedMB: bytesToMb(memory?.usedJSHeapSize),
    totalMB: bytesToMb(memory?.totalJSHeapSize),
    heapLimitMB: bytesToMb(memory?.jsHeapSizeLimit),
  };
}

function readHowlCount(): number | null {
  try {
    const howler = (globalThis as { Howler?: { _howls?: unknown } }).Howler;
    const howls = howler?._howls;
    return Array.isArray(howls) ? howls.length : null;
  } catch {
    return null;
  }
}

function readDomNodeCount(): number | null {
  if (typeof document === "undefined") return null;
  try {
    return document.getElementsByTagName("*").length;
  } catch {
    return null;
  }
}

function countRecent(entries: AdcPerfLongTask[], type: AdcPerfLongTask["type"], windowMs: number) {
  const cutoff = performance.now() - windowMs;
  let count = 0;
  let maxDur = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.t < cutoff) break;
    if (entry.type !== type) continue;
    count += 1;
    if (entry.dur > maxDur) maxDur = entry.dur;
  }
  return { count, maxDur };
}

function ensureStoreNotifySubscription(): void {
  if (storeNotifyUnsub) return;
  const store = tryGetBoundGameStore();
  if (!store?.subscribe) return;
  storeNotifyUnsub = store.subscribe(() => {
    storeNotifyCount += 1;
  });
}

export function collectPerfSample(label = "tick"): AdcPerfSample {
  ensureStoreNotifySubscription();
  const now = performance.now();
  const heap = readChromeHeap();
  const longtaskWindow = countRecent(longTasks, "longtask", 60_000);
  const loafWindow = countRecent(longTasks, "loaf", 60_000);
  const store = storeCountersFromState(tryGetBoundGameStore()?.getState());
  const notifyDelta = storeNotifyCount - storeNotifyAtLastSample;
  const elapsedSec =
    lastSampleNow > 0 ? Math.max(0.001, (now - lastSampleNow) / 1000) : null;
  storeNotifyAtLastSample = storeNotifyCount;
  lastSampleNow = now;

  return {
    label,
    iso: new Date().toISOString(),
    sinceBootMs: bootNow > 0 ? Math.round(now - bootNow) : 0,
    usedMB: heap.usedMB,
    totalMB: heap.totalMB,
    heapLimitMB: heap.heapLimitMB,
    domNodes: readDomNodeCount(),
    howlCount: readHowlCount(),
    longTasksLastMin: longtaskWindow.count,
    longTasksLastMinMaxMs: Math.round(longtaskWindow.maxDur * 10) / 10,
    loafLastMin: loafWindow.count,
    logLen: store.logLen,
    logReadEntries: uiCounters.logReadEntries,
    resourceChangeEvents: store.resourceChangeEvents,
    consumedResourceChangeIds: uiCounters.consumedResourceChangeIds,
    storySeen: store.storySeen,
    triggeredEvents: store.triggeredEvents,
    eventCooldowns: store.eventCooldowns,
    hoveredTooltips: store.hoveredTooltips,
    scrollIndicatorSeen: store.scrollIndicatorSeen,
    clickAnalytics: store.clickAnalytics,
    cooldowns: store.cooldowns,
    activeCooldowns: store.activeCooldowns,
    executionStartTimes: store.executionStartTimes,
    priorAssigned: store.priorAssigned,
    cooldownUiPolls,
    liveSetIntervals: liveIntervalIds ? liveIntervalIds.size : null,
    storeNotifyTotal: storeNotifyCount,
    storeNotifySinceLast: notifyDelta,
    storeNotifyPerSec:
      elapsedSec == null ? null : Math.round((notifyDelta / elapsedSec) * 10) / 10,
    saveStringifyMs: lastSave ? Math.round(lastSave.stringifyMs * 10) / 10 : null,
    saveEncodeMs: lastSave ? Math.round(lastSave.encodeMs * 10) / 10 : null,
    saveTotalMs: lastSave ? Math.round(lastSave.totalMs * 10) / 10 : null,
    saveJsonBytes: lastSave?.jsonBytes ?? null,
    saveEncodedBytes: lastSave?.encodedBytes ?? null,
    playTime: store.playTime,
    lifetimePlayTimeMs: store.lifetimePlayTimeMs,
    activeTab: store.activeTab,
  };
}

export function samplesToCsv(samples: AdcPerfSample[]): string {
  const header = SAMPLE_CSV_COLUMNS.join(",");
  const body = samples.map((row) =>
    SAMPLE_CSV_COLUMNS.map((key) => csvCell(row[key])).join(","),
  );
  return [header, ...body].join("\n");
}

function attachWindowApi(api: AdcPerfApi): void {
  if (typeof window === "undefined") return;
  window.__adcPerf = api;
}

function logBootHint(sampleMs: number): void {
  const message =
    `[adcPerf] probe on (sample every ${Math.round(sampleMs / 1000)}s). ` +
    `Dump: __adcPerf.dump()  CSV: copy(__adcPerf.toCsv())`;
  if (verboseConsole) {
    console.info(message);
  } else {
    logger.debug(message);
  }
}

function observeLongTasks(): void {
  if (typeof PerformanceObserver === "undefined") return;

  const remember = (entry: PerformanceEntry, type: AdcPerfLongTask["type"]) => {
    pushCapped(
      longTasks,
      {
        t: Number.isFinite(entry.startTime) ? entry.startTime : performance.now(),
        dur: entry.duration,
        name: entry.name || type,
        type,
      },
      MAX_LONG_TASKS,
    );
  };

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) remember(entry, "longtask");
    });
    observer.observe({ type: "longtask", buffered: true });
    observers.push(observer);
  } catch {
    // Safari / jsdom: longtask is not implemented.
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) remember(entry, "loaf");
    });
    observer.observe({
      type: "long-animation-frame",
      buffered: true,
    } as PerformanceObserverInit);
    observers.push(observer);
  } catch {
    // Chrome 123+; ignore when missing.
  }
}

function patchSetInterval(): void {
  if (intervalsPatched || typeof window === "undefined") return;
  liveIntervalIds = new Set();
  const originalSet = window.setInterval.bind(window);
  const originalClear = window.clearInterval.bind(window);
  nativeSetInterval = originalSet;
  nativeClearInterval = originalClear;

  window.setInterval = ((
    handler: TimerHandler,
    timeout?: number,
    ...args: unknown[]
  ) => {
    const id = originalSet(handler, timeout, ...args);
    liveIntervalIds?.add(id);
    return id;
  }) as typeof window.setInterval;

  window.clearInterval = ((id?: unknown) => {
    if (id != null) liveIntervalIds?.delete(id);
    return originalClear(id as Parameters<typeof originalClear>[0]);
  }) as typeof window.clearInterval;

  intervalsPatched = true;
}

function unpatchSetInterval(): void {
  if (!intervalsPatched || typeof window === "undefined") return;
  window.setInterval = nativeSetInterval as typeof window.setInterval;
  window.clearInterval = nativeClearInterval as typeof window.clearInterval;
  intervalsPatched = false;
  liveIntervalIds = null;
}

function takeSample(label: string, echo: boolean): AdcPerfSample {
  const row = collectPerfSample(label);
  pushCapped(rows, row, MAX_ROWS);
  if (echo && verboseConsole) {
    console.table([row]);
  }
  return row;
}

function createApi(): AdcPerfApi {
  return {
    get rows() {
      return rows;
    },
    get longTasks() {
      return longTasks;
    },
    get lastSave() {
      return lastSave;
    },
    sample(label = "manual") {
      return takeSample(label, true);
    },
    dump() {
      if (typeof console.table === "function") {
        console.table(rows);
      } else {
        console.info(rows);
      }
      return rows.slice();
    },
    toCsv() {
      return samplesToCsv(rows);
    },
    async copyCsv() {
      const csv = samplesToCsv(rows);
      try {
        await navigator.clipboard.writeText(csv);
        return true;
      } catch {
        console.info(csv);
        return false;
      }
    },
    mark(label: string) {
      return takeSample(label, true);
    },
    clear() {
      rows.length = 0;
    },
    clearLongTasks() {
      longTasks.length = 0;
    },
    start(intervalMs?: number) {
      startSampler(intervalMs ?? parsePerfSampleIntervalMs());
    },
    stop() {
      stopSampler();
    },
  };
}

function startSampler(intervalMs: number): void {
  stopSampler();
  sampleTimer = nativeSetInterval(() => {
    takeSample("tick", true);
  }, intervalMs);
}

function stopSampler(): void {
  if (sampleTimer != null) {
    nativeClearInterval(sampleTimer);
    sampleTimer = null;
  }
}

export function beginPerfMeasure(name: string): PerfMeasureHandle {
  if (!isPerfProbeEnabled()) return null;
  const id = ++measureSeq;
  try {
    performance.mark(`${name}-${id}-start`);
  } catch {
    // performance.mark can throw if the name collides in some engines.
  }
  return { name, id, t0: performance.now() };
}

export function endPerfMeasure(handle: PerfMeasureHandle): number {
  if (!handle) return 0;
  const ms = performance.now() - handle.t0;
  try {
    performance.mark(`${handle.name}-${handle.id}-end`);
    performance.measure(
      handle.name,
      `${handle.name}-${handle.id}-start`,
      `${handle.name}-${handle.id}-end`,
    );
  } catch {
    // Missing marks (overlapping saves, unsupported performance) — ignore.
  }
  return ms;
}

export function recordSaveStringify(durationMs: number, jsonBytes: number): void {
  if (!isPerfProbeEnabled()) return;
  pendingStringify = {
    ms: durationMs,
    jsonBytes,
  };
}

export function recordSaveEncode(durationMs: number, encodedBytes: number): void {
  if (!isPerfProbeEnabled()) return;
  const stringifyMs = pendingStringify.ms;
  const jsonBytes = pendingStringify.jsonBytes;
  pendingStringify = { ms: 0, jsonBytes: 0 };
  lastSave = {
    iso: new Date().toISOString(),
    stringifyMs,
    encodeMs: durationMs,
    totalMs: stringifyMs + durationMs,
    jsonBytes,
    encodedBytes,
  };
}

export function setPerfUiCounter(key: UiCounterKey, value: number): void {
  if (!isPerfProbeEnabled()) return;
  uiCounters[key] = value;
}

export function trackCooldownUiPoll(): () => void {
  if (!isPerfProbeEnabled()) return noop;
  cooldownUiPolls += 1;
  return () => {
    cooldownUiPolls = Math.max(0, cooldownUiPolls - 1);
  };
}

export function installPerfProbe(): AdcPerfApi | null {
  if (typeof window === "undefined") return null;
  if (!isPerfProbeEnabled()) return null;
  if (installed) return window.__adcPerf ?? createApi();

  installed = true;
  verboseConsole = hasPerfQueryFlag(window.location.search);
  bootNow = performance.now();
  lastSampleNow = bootNow;

  if (hasPerfIntervalPatchFlag(window.location.search)) {
    patchSetInterval();
  }

  observeLongTasks();
  ensureStoreNotifySubscription();

  const api = createApi();
  attachWindowApi(api);

  const sampleMs = parsePerfSampleIntervalMs(window.location.search);
  logBootHint(sampleMs);
  takeSample("boot", verboseConsole);
  startSampler(sampleMs);

  return api;
}

export function resetPerfProbeForTests(): void {
  stopSampler();
  for (const observer of observers) {
    try {
      observer.disconnect();
    } catch {
      // ignore
    }
  }
  observers.length = 0;
  unpatchSetInterval();
  if (storeNotifyUnsub) {
    storeNotifyUnsub();
    storeNotifyUnsub = null;
  }
  if (typeof window !== "undefined") {
    delete window.__adcPerf;
  }
  rows.length = 0;
  longTasks.length = 0;
  lastSave = null;
  pendingStringify = { ms: 0, jsonBytes: 0 };
  storeNotifyCount = 0;
  storeNotifyAtLastSample = 0;
  lastSampleNow = 0;
  bootNow = 0;
  cooldownUiPolls = 0;
  uiCounters.logReadEntries = 0;
  uiCounters.consumedResourceChangeIds = 0;
  measureSeq = 0;
  installed = false;
  verboseConsole = false;
  enabledOverride = null;
  enabledCache = null;
  nativeSetInterval = globalThis.setInterval.bind(globalThis);
  nativeClearInterval = globalThis.clearInterval.bind(globalThis);
}
