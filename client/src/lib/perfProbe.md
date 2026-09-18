# Long-session performance probe

Use this when the SPA feels laggy after many hours. The probe is **off in
production** unless the URL asks for it. It does not change gameplay.

## Turn it on

Open the game with **`?perf=1`** (production or local):

```
https://a-dark-cave.com/?perf=1
http://localhost:5000/?perf=1
```

Combine with a DEV fixture if you want a late save without clicking through:

```
http://localhost:5000/?perf=1&devSave=village
```

A Vite **DEV** session also installs the probe without the flag (silent
samples — no `console.table` unless `?perf=1` is present).

Optional query flags:

| Flag | Effect |
|------|--------|
| `perf=1` | Enable probe + print each sample with `console.table` |
| `perfSampleMs=60000` | Sample every 60s (default 5 minutes; min 10s) |
| `perfIntervals=1` | Wrap `setInterval`/`clearInterval` and expose live handle count |

Reload after changing the query string.

## Dump samples after a soak

In DevTools console:

```js
__adcPerf.dump()                 // table of samples
copy(__adcPerf.toCsv())          // CSV on the clipboard
__adcPerf.sample("prior-on")     // extra labeled row (tab switch, combat, …)
__adcPerf.lastSave               // last stringify + encode timing / bytes
__adcPerf.longTasks              // raw longtask / LoAF entries (capped)
```

Paste the CSV into a sheet. Columns include JS heap (Chrome), long tasks in
the last minute, store sizes (`log`, `story.seen`, `triggeredEvents`,
`clickAnalytics`, `executionStartTimes`, …), Prior assignment count, live
100ms CooldownButton overlay polls (`cooldownUiPolls`), Zustand notify rate,
and last autosave encode.

## Verify the overlay-poll fix

After the shared UI-clock / CSS wipe change, **N executing buttons must not
mean N×10Hz React `forceUpdate`s**. With Prior auto-exec on:

```
http://localhost:5000/?perf=1&perfIntervals=1&devSave=village
```

In DevTools:

```js
__adcPerf.sample("prior-stress")
```

Check:

| Field | What good looks like |
| --- | --- |
| `cooldownUiPolls` | **0** even while `executionStartTimes` is large (was ≈ that count at 10 Hz) |
| FPS | Stays near the display refresh (the old storm dropped ~54 → ~15) |
| `liveSetIntervals` | Should not climb with each extra Prior job (`perfIntervals=1` only) |

Hover an executing button: remaining time in the tooltip still ticks once per
second via the shared `useUiNow` clock, not a per-button 100ms poll.

## Autosave marks (Performance panel)

With the probe on, local save stringify/encode is wrapped in:

- `adc-save-stringify` — `JSON.stringify` of the envelope
- `adc-save-encode` / `adc-save` — XOR+Base64 of that JSON (not IndexedDB I/O)

Look for ~15s cadence on guest/local and ~60s when signed in.

## What not to expect

- No per-frame console spam.
- Event log length should stay near **40** (already capped). Growing
  `logReadEntries` / `consumedResourceChangeIds` are session Sets (H4).
- `cooldownUiPolls` is live 100ms CooldownButton/badge overlay polls. After
  the CSS wipe + `useUntilTimestamp` fix this should stay **0** under Prior
  (H1). A rising count again means a 10 Hz `forceUpdate` poll came back.
- `liveSetIntervals` is `null` unless you passed `perfIntervals=1`.
