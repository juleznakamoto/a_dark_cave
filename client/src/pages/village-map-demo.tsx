import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import {
  BUILDINGS,
  DEFAULT_TUNING,
  GROUP_ORDER,
  GROWTH_STEPS,
  MAP_PRESETS,
  SANCTUM_GODS,
  applyGrowth,
  emptyBuild,
  growthLabel,
  sameBuild,
  sanitizeSnapshot,
  stageForPreset,
  VILLAGE_MAP_DEMO_STORAGE_KEY,
  randomTreeSize,
  randomTreeTurn,
  TREE_CAP,
  zeroCounts,
  type BuildState,
  type BuildingDef,
  type DemoSnapshot,
  type MapTree,
  type PresetId,
  type SanctumGod,
  type Tuning,
} from "@/pages/village-map-demo/catalog";
import type { Point } from "@/pages/village-map-demo/geometry";
import { TreeMark } from "@/pages/village-map-demo/TreeMark";
import { TREE_VARIANTS, treeVariant } from "@/pages/village-map-demo/trees";
import { UpgradeRuleIcon, VillageMap } from "@/pages/village-map-demo/VillageMap";
import TreeSheet from "@/pages/village-map-demo/TreeSheet";
import { saveVillageMapToGame } from "@/pages/village-map-demo/saveLayout";

const STORAGE_KEY = VILLAGE_MAP_DEMO_STORAGE_KEY;

function isSanctumGod(value: string): value is SanctumGod {
  return (SANCTUM_GODS as readonly string[]).includes(value);
}

const GOD_LABELS: Record<SanctumGod, string> = {
  dagon: "Dagon",
  flame: "First Flame",
  raven: "Ravenborn",
  ash: "Ashbringer",
};

function dedicationChoice(build: BuildState): string {
  if (build.dedication.length > 1) return "all";
  const god = build.dedication[0];
  if (!god) return "";
  return build.dedicationDeepened === god ? `${god}-deep` : god;
}

type DemoState = {
  stage: number;
  build: BuildState;
  tuning: Tuning;
  overrides: Record<string, Point>;
  pathOverrides: Record<string, Point>;
  trees: MapTree[];
  presetId: PresetId | null;
};

/** Fills from the removed shade sheets. A saved copy of one of those returns to the current colors. */
const SHADE_FILLS = new Set(["#ebeae7", "#e4e3e0", "#dddcd9", "#d5d4d2", "#cecdca", "#c6c6c3"]);

const SHEET_COLOR_KEYS = [
  "fill",
  "ground",
  "interior",
  "wallColor",
  "trapColor",
  "ink",
  "water",
  "waterFill",
  "fire",
  "chitin",
] as const;

function currentSheet(tuning: Tuning): Tuning {
  if (!SHADE_FILLS.has(tuning.fill.toLowerCase())) return tuning;
  const next = { ...tuning };
  for (const key of SHEET_COLOR_KEYS) next[key] = DEFAULT_TUNING[key];
  return next;
}

function readSaved(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const snapshot = sanitizeSnapshot(JSON.parse(raw));
    if (!snapshot) return null;
    return {
      ...snapshot,
      tuning: currentSheet(snapshot.tuning),
      pathOverrides: snapshot.pathOverrides ?? {},
      trees: snapshot.trees ?? [],
      presetId: null,
    };
  } catch {
    return null;
  }
}

function freshState(): DemoState {
  const stage = stageForPreset("village");
  return {
    stage,
    build: applyGrowth(stage),
    tuning: DEFAULT_TUNING,
    overrides: {},
    pathOverrides: {},
    trees: [],
    presetId: "village",
  };
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  digits = 0,
  readout,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  digits?: number;
  readout?: number;
}) {
  const shown = readout ?? value;
  return (
    <label className="flex flex-col gap-1 text-xs text-stone-400">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="tabular-nums text-stone-200">
          {digits > 0 ? shown.toFixed(digits) : Math.round(shown)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-stone-200"
      />
    </label>
  );
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round((h / 6) * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else[r, g, b] = [c, 0, x];
  const m = lig - c / 2;
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round((value + m) * 255)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const hsl = hexToHsl(value);
  const update = (part: Partial<typeof hsl>) => {
    onChange(hslToHex(part.h ?? hsl.h, part.s ?? hsl.s, part.l ?? hsl.l));
  };
  return (
    <div className="space-y-2 border-t border-stone-800 pt-2">
      <div className="flex items-center justify-between gap-2 text-xs text-stone-300">
        <span>{label}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono tabular-nums text-stone-500">{value}</span>
          <input
            type="color"
            aria-label={`${label} color`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-5 w-7 cursor-pointer border border-stone-600 bg-transparent p-0"
          />
        </span>
      </div>
      <Slider label="Hue" min={0} max={360} step={1} value={hsl.h} onChange={(h) => update({ h })} />
      <Slider
        label="Saturation"
        min={0}
        max={100}
        step={1}
        value={hsl.s}
        onChange={(s) => update({ s })}
      />
      <Slider
        label="Lightness"
        min={0}
        max={100}
        step={1}
        value={hsl.l}
        onChange={(l) => update({ l })}
      />
    </div>
  );
}

export default function VillageMapDemo() {
  const [state, setState] = useState<DemoState>(() => readSaved() ?? freshState());
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const captionRef = useRef<HTMLSpanElement>(null);
  const captionTextRef = useRef("");
  const [jsonText, setJsonText] = useState("");
  const [jsonNote, setJsonNote] = useState<string | null>(null);
  const [showTrees, setShowTrees] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [placingTree, setPlacingTree] = useState<string | null>(null);

  const { stage, build, tuning, overrides, pathOverrides, trees, presetId } = state;

  useEffect(() => {
    const snapshot: DemoSnapshot = {
      version: 1,
      stage,
      build,
      tuning,
      overrides,
      pathOverrides,
      trees,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [stage, build, tuning, overrides, pathOverrides, trees]);

  useEffect(() => {
    if (!playing) return;
    if (stage >= GROWTH_STEPS.length) {
      setPlaying(false);
      return;
    }
    const id = window.setInterval(() => {
      setState((current) => {
        const next = Math.min(GROWTH_STEPS.length, current.stage + 1);
        const mark = next === 0 ? "empty" : GROWTH_STEPS[next - 1]?.mark;
        return {
          ...current,
          stage: next,
          build: applyGrowth(next),
          presetId: mark ?? null,
        };
      });
    }, 450);
    return () => window.clearInterval(id);
  }, [playing, stage]);

  const visibleSquares = useMemo(() => {
    return BUILDINGS.reduce((sum, building) => {
      const count = build.counts[building.id] ?? 0;
      if (count <= 0) return sum;
      return sum + (building.kind === "stack" ? Math.min(count, building.slots.length) : 1);
    }, 0);
  }, [build]);

  const onActiveLabel = useCallback((label: string | null) => {
    const node = captionRef.current;
    if (!node) return;
    node.textContent = label ?? captionTextRef.current;
  }, []);

  const saveLayoutToGame = useCallback(async () => {
    const snapshot: DemoSnapshot = { version: 1, stage, build, tuning, overrides, pathOverrides, trees };
    try {
      const saved = await saveVillageMapToGame(snapshot);
      const bends = saved.pathBends === "kept" ? "kept path bends" : `${saved.pathBends} path bends`;
      const crowns = saved.trees === "kept" ? "kept trees" : `${saved.trees} trees`;
      setJsonNote(`Saved ${saved.positions} positions, ${bends}, ${crowns}.`);
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the layout.";
      setJsonNote(message);
      throw error;
    }
  }, [stage, build, tuning, overrides, pathOverrides, trees]);

  useEffect(() => {
    window.__adcSaveVillageMapLayout = saveLayoutToGame;
    return () => {
      delete window.__adcSaveVillageMapLayout;
    };
  }, [saveLayoutToGame]);

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  const stopPlay = () => setPlaying(false);

  const applyStage = (next: number) => {
    const stageValue = Math.max(0, Math.min(GROWTH_STEPS.length, next));
    const mark = stageValue === 0 ? "empty" : GROWTH_STEPS[stageValue - 1]?.mark;
    setPlaying(false);
    setState((current) => ({
      ...current,
      stage: stageValue,
      build: applyGrowth(stageValue),
      presetId: mark ?? null,
    }));
  };

  const applyPreset = (id: PresetId) => {
    applyStage(stageForPreset(id));
    setState((current) => ({ ...current, presetId: id }));
  };

  const patchBuild = (updater: (current: BuildState) => BuildState) => {
    setPlaying(false);
    setState((current) => ({
      ...current,
      build: updater(current.build),
      presetId: null,
    }));
  };

  const setCount = (id: string, value: number) => {
    patchBuild((current) => ({
      ...current,
      counts: { ...current.counts, [id]: value },
    }));
  };

  const soloBuilding = (building: BuildingDef) => {
    patchBuild((current) => {
      const counts = zeroCounts();
      const existing = current.counts[building.id] ?? 0;
      counts[building.id] = existing > 0 ? existing : building.max;
      return {
        counts,
        wall: 0,
        traps: 0,
        moat: false,
        chitin: false,
        ebonGrace: current.ebonGrace,
        brimstoneInfusion: current.brimstoneInfusion,
        dedication: current.dedication,
        dedicationDeepened: current.dedicationDeepened,
      };
    });
  };

  const showAll = () => {
    patchBuild((current) => ({
      counts: Object.fromEntries(BUILDINGS.map((building) => [building.id, building.max])),
      wall: 4,
      traps: 2,
      moat: true,
      chitin: true,
      ebonGrace: current.ebonGrace,
      brimstoneInfusion: current.brimstoneInfusion,
      dedication: current.dedication,
      dedicationDeepened: current.dedicationDeepened,
    }));
  };

  const showNone = () => {
    patchBuild(() => emptyBuild());
  };

  const filteredGroups = GROUP_ORDER.map((group) => ({
    group,
    buildings: BUILDINGS.filter((building) => {
      if (building.group !== group) return false;
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      const haystack = [building.id, building.group, ...building.names].join(" ").toLowerCase();
      return haystack.includes(needle);
    }),
  })).filter((entry) => entry.buildings.length > 0);

  const setDedication = (choice: string) => {
    patchBuild((current) => {
      if (choice === "all") {
        return { ...current, dedication: [...SANCTUM_GODS], dedicationDeepened: null };
      }
      const deepened = choice.endsWith("-deep");
      const god = deepened ? choice.slice(0, -"-deep".length) : choice;
      if (isSanctumGod(god)) {
        return {
          ...current,
          dedication: [god],
          dedicationDeepened: deepened ? god : null,
        };
      }
      return { ...current, dedication: [], dedicationDeepened: null };
    });
  };

  const patchTuning = (partial: Partial<Tuning>) => {
    setState((current) => ({ ...current, tuning: { ...current.tuning, ...partial } }));
  };

  const placeTree = (point: Point) => {
    if (!placingTree || !treeVariant(placingTree)) return;
    const variant = placingTree;
    setState((current) => {
      if (current.trees.length >= TREE_CAP) return current;
      return {
        ...current,
        trees: [
          ...current.trees,
          {
            id: `tree-${crypto.randomUUID()}`,
            variant,
            x: point.x,
            y: point.y,
            turn: randomTreeTurn(),
            size: randomTreeSize(),
          },
        ],
      };
    });
  };

  const moveTree = (id: string, point: Point) => {
    setState((current) => ({
      ...current,
      trees: current.trees.map((tree) => (tree.id === id ? { ...tree, x: point.x, y: point.y } : tree)),
    }));
  };

  const removeTree = (id: string) => {
    setState((current) => ({
      ...current,
      trees: current.trees.filter((tree) => tree.id !== id),
    }));
  };

  const copyLayout = async () => {
    const text = JSON.stringify(
      { version: 1, stage, build, tuning, overrides, pathOverrides, trees },
      null,
      2,
    );
    setJsonText(text);
    try {
      await navigator.clipboard.writeText(text);
      setJsonNote("Copied.");
    } catch {
      setJsonNote("Clipboard blocked. The layout is in the box below.");
    }
  };

  const applyJson = () => {
    try {
      const snapshot = sanitizeSnapshot(JSON.parse(jsonText));
      if (!snapshot) {
        setJsonNote("That JSON does not match this map.");
        return;
      }
      setPlaying(false);
      setState({
        stage: snapshot.stage,
        build: snapshot.build,
        tuning: snapshot.tuning,
        overrides: snapshot.overrides,
        pathOverrides: snapshot.pathOverrides ?? {},
        trees: snapshot.trees ?? [],
        presetId: null,
      });
      setJsonNote("Applied.");
    } catch {
      setJsonNote("Could not read that JSON.");
    }
  };

  const idleCaption = placingTree
    ? `Click ground to plant ${treeVariant(placingTree)?.label ?? "a tree"}. It appears when that ground is drawn.`
    : (caption ?? `${visibleSquares} ${visibleSquares === 1 ? "building" : "buildings"}`);
  captionTextRef.current = idleCaption;

  return (
    <div
      className="flex h-[100dvh] flex-col text-stone-200 md:flex-row"
      style={{ background: tuning.ground }}
    >
      <div className="relative h-[52dvh] shrink-0 md:h-auto md:min-h-0 md:flex-1">
        <Button
          size="xs"
          variant="outline"
          className="absolute left-3 top-3 z-10 bg-[#0c0b09] text-stone-100"
          data-testid="toggle-trees"
          onClick={() => setShowTrees((current) => !current)}
        >
          {showTrees ? "Back to the map" : "Tree sketches"}
        </Button>
        {showTrees ? (
          <TreeSheet tuning={tuning} />
        ) : (
          <>
            <div className="absolute inset-x-0 top-[20px] bottom-[20px]">
              <VillageMap
                build={build}
                tuning={tuning}
                overrides={overrides}
                pathOverrides={pathOverrides}
                highlightId={highlightId}
                trees={trees}
                placingTree={placingTree}
                onPlaceTree={placeTree}
                onMoveTree={moveTree}
                onRemoveTree={removeTree}
                onOverride={(id, point) => {
                  stopPlay();
                  setState((current) => {
                    const next = { ...current.overrides };
                    if (point) next[id] = point;
                    else delete next[id];
                    return { ...current, overrides: next };
                  });
                }}
                onPathOverride={(id, point) => {
                  stopPlay();
                  setState((current) => {
                    const next = { ...current.pathOverrides };
                    if (point) next[id] = point;
                    else delete next[id];
                    return { ...current, pathOverrides: next };
                  });
                }}
                onActiveLabel={onActiveLabel}
              />
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-stone-400">
              <span ref={captionRef}>{idleCaption}</span>
            </div>
          </>
        )}
      </div>

      <aside className="min-h-0 flex-1 overflow-y-auto border-t border-stone-800 md:w-[390px] md:flex-none md:border-l md:border-t-0">
        <div className="sticky top-0 z-10 space-y-3 border-b border-stone-800 bg-[#0c0b09]/95 px-3 py-3 backdrop-blur">
          <div>
            <h1 className="text-sm font-semibold text-stone-100">Village map</h1>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              Top-down plan on gray paper. Buildings are pale blocks, the heartfire is a circle, the pale cross is a Christian cross, and the shallow pit is an irregular cut in the south. Each building draws its own upgrade. Stone paths run from each door to the heartfire, joining instead of crossing. The pale cross, monolith, and pillar have none. The palisade is a round wall, and traps are crosses between the wall and the moat. Saved in this browser.
            </p>
            <a
              href="/dev/building-shapes"
              className="mt-2 inline-block text-xs text-stone-300 underline decoration-stone-600 underline-offset-2"
            >
              Compare building shapes
            </a>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MAP_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                size="xs"
                variant={presetId === preset.id ? "default" : "outline"}
                data-testid={`preset-${preset.id}`}
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-b border-stone-800 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-stone-400">
              Growth:{" "}
              {sameBuild(build, applyGrowth(stage)) ? growthLabel(stage) : "Custom mix"}
            </p>
            <Button
              size="xs"
              variant={playing ? "default" : "outline"}
              onClick={() => {
                if (playing) {
                  setPlaying(false);
                  return;
                }
                if (stage >= GROWTH_STEPS.length) {
                  setState((current) => ({
                    ...current,
                    stage: 0,
                    build: applyGrowth(0),
                    presetId: "empty",
                  }));
                }
                setPlaying(true);
              }}
            >
              {playing ? "Pause" : "Play"}
            </Button>
          </div>
          <input
            type="range"
            min={0}
            max={GROWTH_STEPS.length}
            step={1}
            value={stage}
            aria-label="Growth stage"
            data-testid="growth-stage"
            onChange={(event) => applyStage(Number(event.target.value))}
            className="w-full accent-stone-200"
          />
          <p className="text-[11px] text-stone-500">
            The slider sets the village to that moment of growth.
          </p>
          <div className="space-y-2 border-t border-stone-800 pt-2">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-300">
              <span>Map background</span>
              <span className="flex items-center gap-2">
                <span className="font-mono tabular-nums text-stone-500">{tuning.interior}</span>
                <input
                  type="color"
                  aria-label="Map background color"
                  value={tuning.interior}
                  onChange={(event) => patchTuning({ interior: event.target.value })}
                  className="h-5 w-7 cursor-pointer border border-stone-600 bg-transparent p-0"
                />
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    patchTuning({
                      interior: DEFAULT_TUNING.interior,
                      interiorOpacity: DEFAULT_TUNING.interiorOpacity,
                    })
                  }
                >
                  Reset
                </Button>
              </span>
            </div>
            <Slider
              label="Opacity"
              min={0}
              max={100}
              step={1}
              value={Math.round(tuning.interiorOpacity * 100)}
              onChange={(percent) => patchTuning({ interiorOpacity: percent / 100 })}
            />
          </div>
        </div>

        <details open className="border-b border-stone-800 px-3 py-3">
          <summary className="cursor-pointer text-sm font-medium">Buildings</summary>
          <div className="mt-3 space-y-3">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a building"
              className="w-full rounded border border-stone-700 bg-black px-2 py-1 text-xs"
            />
            <div className="flex flex-wrap gap-1.5">
              <Button size="xs" variant="outline" onClick={showAll}>
                All
              </Button>
              <Button size="xs" variant="outline" onClick={showNone}>
                None
              </Button>
              <Button
                size="xs"
                variant={tuning.showNames ? "default" : "outline"}
                onClick={() => patchTuning({ showNames: !tuning.showNames })}
              >
                Names
              </Button>
            </div>

            {filteredGroups.map(({ group, buildings }) => (
              <section key={group} className="space-y-1">
                <h2 className="text-[11px] uppercase tracking-wide text-stone-500">
                  {group}
                </h2>
                {buildings.map((building) => (
                  <BuildingRow
                    key={building.id}
                    building={building}
                    value={build.counts[building.id] ?? 0}
                    tuning={tuning}
                    highlighted={highlightId === building.id}
                    onChange={(value) => setCount(building.id, value)}
                    onSolo={() => soloBuilding(building)}
                    onHover={(on) => {
                      setHighlightId(on ? building.id : null);
                      setCaption(on ? building.names[0] : null);
                    }}
                  />
                ))}
              </section>
            ))}
          </div>
        </details>

        <details open className="border-b border-stone-800 px-3 py-3">
          <summary className="cursor-pointer text-sm font-medium">Trees</summary>
          <div className="mt-3 space-y-3">
            <p className="text-[11px] leading-relaxed text-stone-500">
              Pick a crown, then click ground, including ground that is not drawn yet. The tree appears when that ground is drawn. A trap hides a tree it covers. Click that crown again to stop. Drag a tree to move it. Double-click removes it.
            </p>
            <div className="grid grid-cols-5 gap-1.5" data-testid="tree-palette">
              {TREE_VARIANTS.map((variant) => {
                const armed = placingTree === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    title={variant.label}
                    aria-label={variant.label}
                    aria-pressed={armed}
                    data-testid={`place-tree-${variant.id}`}
                    className={`rounded bg-[#dedcd8] p-0.5 ${armed ? "ring-2 ring-stone-100" : "ring-1 ring-stone-700"}`}
                    onClick={() => setPlacingTree((current) => (current === variant.id ? null : variant.id))}
                  >
                    <svg viewBox="-62 -48 124 96" className="h-12 w-full" aria-hidden>
                      <TreeMark variant={variant} ink={tuning.ink} fill={tuning.fill} />
                    </svg>
                  </button>
                );
              })}
            </div>
            {trees.length > 0 ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setState((current) => ({ ...current, trees: [] }))}
              >
                Clear trees
              </Button>
            ) : null}
          </div>
        </details>

        <details open className="border-b border-stone-800 px-3 py-3">
          <summary className="cursor-pointer text-sm font-medium">Defense</summary>
          <div className="mt-3 space-y-3">
            <section className="space-y-2">
              <DefenseSelect
                label="Palisades"
                value={build.wall}
                options={["Hidden", "Palisades 1", "Palisades 2", "Palisades 3", "Palisades 4"]}
                onChange={(wall) => patchBuild((current) => ({ ...current, wall }))}
                onSolo={() =>
                  patchBuild((current) => ({
                    ...emptyBuild(),
                    wall: current.wall > 0 ? current.wall : 4,
                  }))
                }
              />
              <DefenseSelect
                label="Traps"
                value={build.traps}
                options={["Hidden", "Traps", "Improved Traps"]}
                onChange={(traps) => patchBuild((current) => ({ ...current, traps }))}
                onSolo={() =>
                  patchBuild((current) => ({
                    ...emptyBuild(),
                    traps: current.traps > 0 ? current.traps : 2,
                  }))
                }
              />
              <label className="flex items-center justify-between gap-2 text-xs text-stone-300">
                <span>Fortified Moat</span>
                <input
                  type="checkbox"
                  checked={build.moat}
                  onChange={(event) =>
                    patchBuild((current) => ({ ...current, moat: event.target.checked }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-stone-300">
                <span>Chitin Plating</span>
                <input
                  type="checkbox"
                  checked={build.chitin}
                  onChange={(event) =>
                    patchBuild((current) => ({
                      ...current,
                      chitin: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-stone-300">
                <span>Brimstone infusion</span>
                <input
                  type="checkbox"
                  checked={build.brimstoneInfusion}
                  onChange={(event) =>
                    patchBuild((current) => ({
                      ...current,
                      brimstoneInfusion: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-stone-300">
                <span>Ebon Grace</span>
                <input
                  type="checkbox"
                  checked={build.ebonGrace}
                  onChange={(event) =>
                    patchBuild((current) => ({
                      ...current,
                      ebonGrace: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="block text-xs text-stone-200">
                Dedication
                <select
                  aria-label="Dedication"
                  value={dedicationChoice(build)}
                  onChange={(event) => setDedication(event.target.value)}
                  className="mt-1 w-full rounded border border-stone-700 bg-black px-1 py-0.5 text-xs text-stone-200"
                >
                  <option value="">None</option>
                  {SANCTUM_GODS.map((god) => (
                    <option key={god} value={god}>
                      {GOD_LABELS[god]}
                    </option>
                  ))}
                  {SANCTUM_GODS.map((god) => (
                    <option key={`${god}-deep`} value={`${god}-deep`}>
                      {GOD_LABELS[god]}, deepened
                    </option>
                  ))}
                  <option value="all">All four</option>
                </select>
              </label>
            </section>
          </div>
        </details>

        <details className="border-b border-stone-800 px-3 py-3">
          <summary className="cursor-pointer text-sm font-medium">Wall and traps</summary>
          <div className="mt-3 space-y-3">
            <Slider
              label="Roundness wobble"
              min={0}
              max={0.2}
              step={0.005}
              digits={3}
              value={tuning.wallWobble}
              onChange={(wallWobble) => patchTuning({ wallWobble })}
            />
            <Slider
              label="Wobble lobes"
              min={2}
              max={7}
              step={1}
              value={tuning.wallLobes}
              onChange={(wallLobes) => patchTuning({ wallLobes })}
            />
            <Slider
              label="Wall smoothness"
              min={8}
              max={32}
              step={1}
              value={tuning.wallSides}
              onChange={(wallSides) => patchTuning({ wallSides })}
            />
            <Slider
              label="Wall thickness"
              min={2}
              max={18}
              step={0.5}
              digits={1}
              value={tuning.wallThickness}
              onChange={(wallThickness) => patchTuning({ wallThickness })}
            />
            <Slider
              label="Wall oval"
              min={0.75}
              max={1.15}
              step={0.01}
              digits={2}
              value={tuning.wallOval}
              onChange={(wallOval) => patchTuning({ wallOval })}
            />
            <ColorField
              label="Wall"
              value={tuning.wallColor}
              onChange={(wallColor) => patchTuning({ wallColor })}
            />
            <ColorField
              label="Moat wash"
              value={tuning.waterFill}
              onChange={(waterFill) => patchTuning({ waterFill })}
            />
            <ColorField
              label="Moat lines"
              value={tuning.water}
              onChange={(water) => patchTuning({ water })}
            />
            <ColorField
              label="Chitin"
              value={tuning.chitin}
              onChange={(chitin) => patchTuning({ chitin })}
            />
            <label className="flex items-center justify-between gap-2 text-xs text-stone-300">
              <span>Show wall guide when palisades are hidden</span>
              <input
                type="checkbox"
                checked={tuning.showWallGuide}
                onChange={(event) => patchTuning({ showWallGuide: event.target.checked })}
              />
            </label>
            <Slider
              label="Trap size"
              min={4}
              max={16}
              step={0.5}
              digits={1}
              value={tuning.trapSize}
              onChange={(trapSize) => patchTuning({ trapSize })}
            />
            <Slider
              label="Gap outside the moat"
              min={0}
              max={40}
              step={1}
              value={tuning.trapOffset}
              onChange={(trapOffset) => patchTuning({ trapOffset })}
            />
            <Slider
              label="Trap stroke"
              min={0.8}
              max={4}
              step={0.1}
              digits={1}
              value={tuning.trapStroke}
              onChange={(trapStroke) => patchTuning({ trapStroke })}
            />
            <ColorField
              label="Traps"
              value={tuning.trapColor}
              onChange={(trapColor) => patchTuning({ trapColor })}
            />
          </div>
        </details>

        <details className="px-3 py-3">
          <summary className="cursor-pointer text-sm font-medium">Layout</summary>
          <div className="mt-3 space-y-3">
            <Slider
              label="Hut ring"
              min={0.6}
              max={1.3}
              step={0.01}
              digits={2}
              value={tuning.ringHut}
              onChange={(ringHut) => patchTuning({ ringHut })}
            />
            <Slider
              label="Workplace ring"
              min={0.6}
              max={1.3}
              step={0.01}
              digits={2}
              value={tuning.ringCivic}
              onChange={(ringCivic) => patchTuning({ ringCivic })}
            />
            <Slider
              label="Stone hut ring"
              min={0.6}
              max={1.3}
              step={0.01}
              digits={2}
              value={tuning.ringStone}
              onChange={(ringStone) => patchTuning({ ringStone })}
            />
            <Slider
              label="Outer ring"
              min={0.6}
              max={1.3}
              step={0.01}
              digits={2}
              value={tuning.ringOuter}
              onChange={(ringOuter) => patchTuning({ ringOuter })}
            />
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                setState((current) => ({ ...current, overrides: {}, pathOverrides: {} }))
              }
            >
              Reset dragged positions
            </Button>
            <label className="flex items-center justify-between gap-2 text-xs text-stone-300">
              <span>Fit the frame to what is built</span>
              <input
                type="checkbox"
                checked={tuning.fitView}
                onChange={(event) => patchTuning({ fitView: event.target.checked })}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              <Button size="xs" variant="outline" onClick={() => void copyLayout()}>
                Copy JSON
              </Button>
              <Button
                size="xs"
                variant="outline"
                data-testid="save-village-map-layout"
                onClick={() => void saveLayoutToGame()}
              >
                Save to game
              </Button>
              <Button size="xs" variant="outline" onClick={applyJson}>
                Apply JSON
              </Button>
            </div>
            {jsonNote ? <p className="text-[11px] text-stone-400">{jsonNote}</p> : null}
            <textarea
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              spellCheck={false}
              rows={6}
              className="w-full rounded border border-stone-700 bg-black p-2 font-mono text-[11px] text-stone-300"
              placeholder="Copy JSON lands here. Paste a snapshot and apply it."
            />
          </div>
        </details>
      </aside>
    </div>
  );
}

function BuildingRow({
  building,
  value,
  tuning,
  highlighted,
  onChange,
  onSolo,
  onHover,
}: {
  building: BuildingDef;
  value: number;
  tuning: Tuning;
  highlighted: boolean;
  onChange: (value: number) => void;
  onSolo: () => void;
  onHover: (on: boolean) => void;
}) {
  return (
    <div
      data-testid={`building-${building.id}`}
      className={`flex items-start gap-2 rounded px-1 py-1 ${highlighted ? "bg-stone-900" : ""}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <button
        type="button"
        className="mt-0.5 w-9 shrink-0 text-left text-[10px] uppercase tracking-wide text-stone-500 hover:text-stone-200"
        onClick={onSolo}
      >
        Only
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <UpgradeRuleIcon buildingId={building.id} tier={value} tuning={tuning} />
          <div className="min-w-0 truncate text-xs text-stone-200">{building.names[0]}</div>
        </div>
        {building.kind === "stack" ? (
          <input
            type="range"
            min={0}
            max={building.max}
            step={1}
            value={value}
            aria-label={building.names[0]}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full accent-stone-200"
          />
        ) : (
          <select
            value={value}
            aria-label={building.names[0]}
            onChange={(event) => onChange(Number(event.target.value))}
            className="mt-1 w-full rounded border border-stone-700 bg-black px-1 py-0.5 text-xs text-stone-200"
          >
            <option value={0}>Hidden</option>
            {building.names.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
      <span className="w-5 pt-0.5 text-right text-xs tabular-nums text-stone-400">{value}</span>
    </div>
  );
}

function DefenseSelect({
  label,
  value,
  options,
  onChange,
  onSolo,
}: {
  label: string;
  value: number;
  options: string[];
  onChange: (value: number) => void;
  onSolo: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        className="mt-0.5 w-9 shrink-0 text-left text-[10px] uppercase tracking-wide text-stone-500 hover:text-stone-200"
        onClick={onSolo}
      >
        Only
      </button>
      <label className="min-w-0 flex-1 text-xs text-stone-200">
        {label}
        <select
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-1 w-full rounded border border-stone-700 bg-black px-1 py-0.5 text-xs text-stone-200"
        >
          {options.map((option, index) => (
            <option key={option} value={index}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
