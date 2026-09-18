/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindGameStore } from "@/game/gameStoreHolder";
import {
  ADC_SAVE_MEASURE,
  ADC_SAVE_STRINGIFY_MEASURE,
  beginPerfMeasure,
  collectPerfSample,
  endPerfMeasure,
  hasPerfIntervalPatchFlag,
  hasPerfQueryFlag,
  installPerfProbe,
  isPerfProbeEnabled,
  parsePerfSampleIntervalMs,
  recordSaveEncode,
  recordSaveStringify,
  resetPerfProbeForTests,
  samplesToCsv,
  setPerfProbeEnabledForTests,
  setPerfUiCounter,
  storeCountersFromState,
  trackCooldownUiPoll,
} from "./perfProbe";

describe("perf probe flags", () => {
  afterEach(() => {
    resetPerfProbeForTests();
  });

  it("treats perf=1 / true / yes as on", () => {
    expect(hasPerfQueryFlag("?perf=1")).toBe(true);
    expect(hasPerfQueryFlag("?perf=true")).toBe(true);
    expect(hasPerfQueryFlag("?perf=yes")).toBe(true);
    expect(hasPerfQueryFlag("?perf=0")).toBe(false);
    expect(hasPerfQueryFlag("")).toBe(false);
  });

  it("keeps the setInterval patch off unless perfIntervals=1", () => {
    expect(hasPerfIntervalPatchFlag("?perf=1")).toBe(false);
    expect(hasPerfIntervalPatchFlag("?perf=1&perfIntervals=1")).toBe(true);
  });

  it("clamps the sample interval", () => {
    expect(parsePerfSampleIntervalMs("")).toBe(5 * 60 * 1000);
    expect(parsePerfSampleIntervalMs("?perfSampleMs=60000")).toBe(60_000);
    expect(parsePerfSampleIntervalMs("?perfSampleMs=1")).toBe(10_000);
    expect(parsePerfSampleIntervalMs("?perfSampleMs=99999999")).toBe(
      60 * 60 * 1000,
    );
  });
});

describe("storeCountersFromState", () => {
  it("counts maps, arrays, and active cooldowns from live state", () => {
    const counters = storeCountersFromState({
      log: [{ id: "a" }, { id: "b" }],
      resourceChangeEvents: [{ id: "r1" }],
      story: { seen: { fire: true, hut: 1 } },
      triggeredEvents: { wolf: true },
      eventCooldowns: { wolf: 12 },
      hoveredTooltips: { gather: true },
      scrollIndicatorSeen: {},
      clickAnalytics: { gatherWood: 4, feedFire: 2 },
      cooldowns: { gatherWood: 1.2, feedFire: 0 },
      executionStartTimes: { gatherWood: 99 },
      priorAssignedActions: ["gatherWood", "feedFire"],
      playTime: 12_000,
      lifetimePlayTimeMs: 45_000,
      activeTab: "village",
    });

    expect(counters.logLen).toBe(2);
    expect(counters.storySeen).toBe(2);
    expect(counters.clickAnalytics).toBe(2);
    expect(counters.cooldowns).toBe(2);
    expect(counters.activeCooldowns).toBe(1);
    expect(counters.executionStartTimes).toBe(1);
    expect(counters.priorAssigned).toBe(2);
    expect(counters.activeTab).toBe("village");
  });

  it("returns zeros for an empty snapshot", () => {
    expect(storeCountersFromState(null).logLen).toBe(0);
    expect(storeCountersFromState({}).storySeen).toBe(0);
  });
});

describe("samplesToCsv", () => {
  it("emits a stable header and one data row", () => {
    const csv = samplesToCsv([
      collectPerfSample("boot"),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("usedMB");
    expect(lines[0]).toContain("executionStartTimes");
    expect(lines[0]).toContain("cooldownUiPolls");
    expect(lines[1]).toContain("boot");
    expect(lines).toHaveLength(2);
  });
});

describe("installPerfProbe", () => {
  beforeEach(() => {
    resetPerfProbeForTests();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    resetPerfProbeForTests();
    bindGameStore({
      getState: () => ({}),
      setState: () => {},
      isModalDialogOpen: () => false,
    });
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("does not attach window.__adcPerf when forced off", () => {
    setPerfProbeEnabledForTests(false);
    expect(isPerfProbeEnabled()).toBe(false);
    expect(installPerfProbe()).toBeNull();
    expect(window.__adcPerf).toBeUndefined();
  });

  it("exposes dump/csv and records store + UI counters", () => {
    setPerfProbeEnabledForTests(true);
    bindGameStore({
      getState: () => ({
        log: [{ id: "1" }, { id: "2" }, { id: "3" }],
        story: { seen: { a: true } },
        triggeredEvents: { e1: true, e2: true },
        executionStartTimes: { gatherWood: 1 },
        priorAssignedActions: ["gatherWood"],
        playTime: 5000,
        activeTab: "cave",
      }),
      setState: () => {},
      isModalDialogOpen: () => false,
    });
    setPerfUiCounter("logReadEntries", 11);
    setPerfUiCounter("consumedResourceChangeIds", 7);
    const stopPoll = trackCooldownUiPoll();

    const api = installPerfProbe();
    expect(api).not.toBeNull();
    expect(window.__adcPerf).toBeDefined();

    const tableSpy = vi.spyOn(console, "table").mockImplementation(() => {});
    const row = window.__adcPerf!.sample("soak");
    expect(row.label).toBe("soak");
    expect(row.logLen).toBe(3);
    expect(row.storySeen).toBe(1);
    expect(row.triggeredEvents).toBe(2);
    expect(row.executionStartTimes).toBe(1);
    expect(row.priorAssigned).toBe(1);
    expect(row.logReadEntries).toBe(11);
    expect(row.consumedResourceChangeIds).toBe(7);
    expect(row.cooldownUiPolls).toBe(1);
    expect(row.liveSetIntervals).toBeNull();
    expect(window.__adcPerf!.toCsv()).toContain("soak");
    expect(window.__adcPerf!.dump()).toHaveLength(2); // boot + soak
    expect(tableSpy).toHaveBeenCalled();

    stopPoll();
    expect(window.__adcPerf!.sample("after-poll").cooldownUiPolls).toBe(0);
  });

  it("counts live setInterval handles only when patched", () => {
    window.history.replaceState({}, "", "/?perfIntervals=1");
    setPerfProbeEnabledForTests(true);
    installPerfProbe();

    const id = window.setInterval(() => {}, 1000);
    const withInterval = window.__adcPerf!.sample("with-interval").liveSetIntervals;
    expect(withInterval).toBeGreaterThan(0);
    window.clearInterval(id);
    const after = window.__adcPerf!.sample("cleared").liveSetIntervals;
    expect(after).toBeTypeOf("number");
    expect(after).toBeLessThan(withInterval ?? 0);
  });
});

describe("save encode measures", () => {
  beforeEach(() => {
    resetPerfProbeForTests();
    setPerfProbeEnabledForTests(true);
  });

  afterEach(() => {
    resetPerfProbeForTests();
    vi.restoreAllMocks();
  });

  it("records stringify + encode without changing the payload", () => {
    const markSpy = vi.spyOn(performance, "mark");
    const measureSpy = vi.spyOn(performance, "measure");

    const stringifyHandle = beginPerfMeasure(ADC_SAVE_STRINGIFY_MEASURE);
    const json = JSON.stringify({ ok: true });
    recordSaveStringify(endPerfMeasure(stringifyHandle), json.length);

    const encodeHandle = beginPerfMeasure(ADC_SAVE_MEASURE);
    const encoded = `ADC2:${json}`;
    recordSaveEncode(endPerfMeasure(encodeHandle), encoded.length);

    expect(json).toBe('{"ok":true}');
    expect(window.__adcPerf).toBeUndefined();
    installPerfProbe();
    const save = window.__adcPerf!.lastSave;
    expect(save).not.toBeNull();
    expect(save?.jsonBytes).toBe(json.length);
    expect(save?.encodedBytes).toBe(encoded.length);
    expect(save?.totalMs).toBeGreaterThanOrEqual(save?.encodeMs ?? 0);
    expect(markSpy).toHaveBeenCalled();
    expect(measureSpy).toHaveBeenCalled();
  });

  it("is a no-op when the probe is off", () => {
    vi.restoreAllMocks();
    setPerfProbeEnabledForTests(false);
    const markSpy = vi.spyOn(performance, "mark");
    const handle = beginPerfMeasure(ADC_SAVE_MEASURE);
    expect(handle).toBeNull();
    expect(endPerfMeasure(handle)).toBe(0);
    recordSaveEncode(12, 99);
    expect(markSpy).not.toHaveBeenCalled();
    markSpy.mockRestore();
  });
});
