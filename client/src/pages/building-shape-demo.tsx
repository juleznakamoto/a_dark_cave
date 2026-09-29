import { useMemo, useState, type ReactNode } from "react";
import { Redirect } from "wouter";
import { BUILDINGS, DEFAULT_TUNING, GROUP_ORDER } from "@/pages/village-map-demo/catalog";
import { markSize } from "@/pages/village-map-demo/geometry";
import {
  BuildingMark,
  MapInkProvider,
  UPGRADE_ICON_SIZE,
  buildingFootprint,
} from "@/pages/village-map-demo/VillageMap";
const FRAME = 52;
const PAGE_GROUND = "#0e0e0e";
/** Upgrade icons were fitted to ±34. Scale them into this frame. */
const FIT = 44 / 34;

const HAND_SIZE: Record<string, number> = {
  woodenHut: 58,
  stoneHut: 58,
  longhouse: 42,
  furTents: 80,
  heartfire: 84,
  blackMonolith: 76,
  pillarOfClarity: 74,
  boneyard: 78,
  quarry: 76,
  herbGarden: 80,
  bastion: 16,
  wizardTower: 62,
  pit: 20,
  cabin: 60,
  blacksmith: 60,
  tannery: 52,
  timberMill: 36,
  storage: 72,
  trade: 68,
  altar: 70,
  clerksHut: 56,
  archive: 50,
  builders: 44,
  coinhouse: 48,
  watchtower: 66,
  estate: 16,
  foundry: 28,
  alchemistHall: 18,
  boneTemple: 52,
};

function oldMarkSize(id: string): number {
  const fitted = UPGRADE_ICON_SIZE[id];
  if (fitted && !(id in HAND_SIZE)) return fitted * FIT;
  return HAND_SIZE[id] ?? 56;
}

/**
 * One drawing size for every stage of a building.
 * Upgrade icons were fitted to the largest stage. Single-stage marks keep
 * the hand size, which was fitted to that one drawing.
 * Later stages add wings and towers. They do not enlarge the first body.
 */
function stageMarkSize(id: string, _tier: number, stageCount: number): number {
  const fitted = UPGRADE_ICON_SIZE[id];
  if (stageCount <= 1 || fitted == null) return oldMarkSize(id);
  return fitted * FIT;
}

function mapSizeLabel(id: string): string {
  const hut = markSize("woodenHut", DEFAULT_TUNING.squareSize);
  const ratio = markSize(id, DEFAULT_TUNING.squareSize) / hut;
  return `${ratio.toFixed(1)}× a wooden hut on the map`;
}

function MarkFrame({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg
      viewBox={`${-FRAME} ${-FRAME} ${FRAME * 2} ${FRAME * 2}`}
      className="h-40 w-full"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

export default function BuildingShapeDemo() {
  const [group, setGroup] = useState<string>("all");
  const buildings = useMemo(
    () => BUILDINGS.filter((building) => group === "all" || building.group === group),
    [group],
  );

  if (!import.meta.env.DEV) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-[100dvh] flex-col text-stone-200" style={{ background: PAGE_GROUND }}>
      <header className="shrink-0 border-b border-stone-800 bg-[#0c0b09] px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-stone-100">Building shapes</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-400">
              Every building from above, at each stage already drawn on the village map.
            </p>
          </div>
          <a href="/dev/village-map" className="text-xs text-stone-400 underline decoration-stone-600 underline-offset-2">
            Village map
          </a>
        </div>
        <div className="mx-auto mt-3 flex max-w-6xl flex-wrap gap-1.5">
          <FilterChip active={group === "all"} onClick={() => setGroup("all")}>
            All
          </FilterChip>
          {GROUP_ORDER.map((name) => (
            <FilterChip key={name} active={group === name} onClick={() => setGroup(name)}>
              {name}
            </FilterChip>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
          {buildings.map((building) => (
              <section
                key={building.id}
                className="rounded-md border border-stone-800 bg-[#141311] p-3"
                data-building={building.id}
              >
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-medium text-stone-100">{building.names[0]}</h2>
                  <p className="text-[11px] text-stone-500">
                    {building.group}
                    <span className="px-1.5 text-stone-700">/</span>
                    {mapSizeLabel(building.id)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {building.names.map((name, index) => {
                    const tier = index + 1;
                    const stageCount = building.names.length;
                    return (
                      <figure key={name} className="min-w-0">
                        <div className="rounded bg-[#0e0e0e] px-1 py-1">
                          <MapInkProvider ink={DEFAULT_TUNING.ink}>
                            <MarkFrame label={`${name}, stage ${tier}`}>
                              <BuildingMark
                                buildingId={building.id}
                                size={stageMarkSize(building.id, tier, stageCount)}
                                tier={tier}
                                tuning={DEFAULT_TUNING}
                                shape={buildingFootprint(building.id)}
                              />
                            </MarkFrame>
                          </MapInkProvider>
                        </div>
                        <figcaption className="mt-1.5 text-center text-[11px] leading-tight text-stone-300">
                          {stageCount > 1 ? name : "Current"}
                          <span className="mt-0.5 block text-[10px] text-stone-500">
                            {stageCount > 1 ? `Stage ${tier} of ${stageCount}` : "On the map"}
                          </span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              </section>
          ))}
        </div>
      </main>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-900"
          : "rounded-full border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300"
      }
    >
      {children}
    </button>
  );
}
