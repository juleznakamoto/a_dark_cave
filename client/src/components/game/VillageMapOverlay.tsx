import { useCallback, useEffect, useMemo, useRef } from "react";
import { useGameStore } from "@/game/state";
import {
  VILLAGE_MAP_PATH_OVERRIDES,
  VILLAGE_MAP_POSITIONS,
  VILLAGE_MAP_TREES,
} from "@/game/villageMapLayout";
import {
  DEFAULT_TUNING,
  sanitizeSnapshot,
  VILLAGE_MAP_DEMO_STORAGE_KEY,
  type DemoSnapshot,
} from "@/pages/village-map-demo/catalog";
import { VillageMap } from "@/pages/village-map-demo/VillageMap";
import { placedSlots } from "@/pages/village-map-demo/geometry";
import { buildStateFromPlayer } from "@/game/villageMapBuild";
import {
  mapHighlightFromSidePanelHover,
  setVillageMapHoveredBuilding,
  sidePanelRowFromMapBuilding,
} from "@/game/villageMapHighlight";
import {
  holdRevealForMapOpen,
  revealForMapChange,
  villageMapFeatureMarks,
  VILLAGE_MAP_FADE_IN_MS,
  VILLAGE_MAP_OPEN_FADE_DELAY_MS,
  type VillageMapReveal,
} from "@/game/villageMapReveal";
import { useSidePanelActiveTooltipHoverId } from "./panels/SidePanelSection";

function readDemoSnapshotRaw(): string | null {
  try {
    return localStorage.getItem(VILLAGE_MAP_DEMO_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The arrangement currently saved by /dev/village-map, if this browser has one. */
function parseDemoSnapshot(raw: string | null): DemoSnapshot | null {
  if (!raw) return null;
  try {
    return sanitizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** An empty reveal would still be a new object and force the SVG to rebuild. */
function revealIfFading(reveal: VillageMapReveal): VillageMapReveal | null {
  return Object.keys(reveal.fadeIn).length > 0 ? reveal : null;
}

const ignoreMapEdit = () => { };

/**
 * Village map, shown in the middle panel while the Map tab is open.
 * Kept after the first visit. Closing the tab used to destroy the SVG, and
 * opening it rebuilt every path and wobble filter.
 */
export default function VillageMapOverlay() {
  const open = useGameStore((state) => state.activeTab === "map");
  const keptRef = useRef(open);
  if (open) keptRef.current = true;
  const sidePanelHover = useSidePanelActiveTooltipHoverId();
  const moved = useGameStore((state) => state.villageMapOverrides);
  const pathMoved = useGameStore((state) => state.villageMapPathOverrides);
  const buildings = useGameStore((state) => state.buildings);
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const blessings = useGameStore((state) => state.blessings);
  const onHoverBuilding = useCallback((buildingId: string | null) => {
    setVillageMapHoveredBuilding(
      buildingId ? sidePanelRowFromMapBuilding(buildingId, buildingsRef.current) : null,
    );
  }, []);
  const heartfireLevel = useGameStore((state) => state.heartfireState?.level ?? 0);
  const wasOpen = useRef(false);
  const demoRawRef = useRef<string | null>(null);
  const demoRef = useRef<DemoSnapshot | null>(null);
  if (open && !wasOpen.current) {
    wasOpen.current = true;
    const raw = readDemoSnapshotRaw();
    if (raw !== demoRawRef.current) {
      demoRawRef.current = raw;
      demoRef.current = parseDemoSnapshot(raw);
    }
  } else if (!open) {
    wasOpen.current = false;
  }
  const demo = demoRef.current;
  const build = useMemo(() => buildStateFromPlayer(buildings, blessings), [buildings, blessings]);
  const overrides = useMemo(
    () => ({ ...VILLAGE_MAP_POSITIONS, ...(demo?.overrides ?? {}), ...(moved ?? {}) }),
    [demo, moved],
  );
  const pathOverrides = useMemo(
    () => ({ ...VILLAGE_MAP_PATH_OVERRIDES, ...(demo?.pathOverrides ?? {}), ...(pathMoved ?? {}) }),
    [demo, pathMoved],
  );
  const highlightId = open ? mapHighlightFromSidePanelHover(sidePanelHover) : null;
  const slotMarks = useMemo(
    () =>
      placedSlots(build, DEFAULT_TUNING, overrides).map((slot) => ({
        id: slot.id,
        tier: slot.tier,
      })),
    [build, overrides],
  );
  const featureMarks = useMemo(() => villageMapFeatureMarks(build), [build]);
  const markKey = [...slotMarks, ...featureMarks].map((mark) => `${mark.id}:${mark.tier}`).join("|");
  const revealRef = useRef<VillageMapReveal | null>(null);
  const shownRef = useRef<Record<string, number>>({});
  const markKeyRef = useRef("");
  const sessionRef = useRef(false);
  const applyMarks = (current: VillageMapReveal | null, shown: Record<string, number>) => {
    const next = revealForMapChange(current, slotMarks, shown);
    const seen = { ...next.shown };
    for (const feature of featureMarks) seen[feature.id] = feature.tier;
    return { reveal: next.reveal, shown: seen };
  };
  if (open && !sessionRef.current) {
    sessionRef.current = true;
    const seen = useGameStore.getState().villageMapSeenTiers ?? {};
    const next = applyMarks(null, seen);
    revealRef.current = revealIfFading(holdRevealForMapOpen(next.reveal));
    shownRef.current = next.shown;
    markKeyRef.current = markKey;
  } else if (open && markKey !== markKeyRef.current) {
    const next = applyMarks(revealRef.current, shownRef.current);
    revealRef.current = revealIfFading(next.reveal);
    shownRef.current = next.shown;
    markKeyRef.current = markKey;
  }
  useEffect(() => {
    if (!open) {
      if (sessionRef.current) {
        sessionRef.current = false;
        revealRef.current = null;
        markKeyRef.current = "";
        useGameStore.getState().setVillageMapSeenTiers(shownRef.current);
        shownRef.current = {};
      }
      setVillageMapHoveredBuilding(null);
      return;
    }
    const openWait = revealRef.current?.openWait;
    const openDelay =
      openWait && Object.keys(openWait).length > 0 ? VILLAGE_MAP_OPEN_FADE_DELAY_MS : 0;
    const timer = window.setTimeout(() => {
      useGameStore.getState().setVillageMapSeenTiers({ ...shownRef.current });
    }, VILLAGE_MAP_FADE_IN_MS + openDelay);
    return () => window.clearTimeout(timer);
  }, [open, markKey]);

  if (!keptRef.current) return null;

  return (
    // px-2 matches the location-tab row (pl-2 pr-2) so the map clears the column walls.
    // pb-4 matches the other location tabs (pb-2 plus mb-2) so the drawing clears the footer.
    // Kept in the DOM so the next open does not rebuild the SVG.
    // display is inline because the flex class would override the hidden attribute.
    // Reveal is cleared while hidden so a later fade can start again.
    <div
      hidden={!open}
      className="absolute inset-0 z-30 flex flex-col px-2 pb-4"
      style={{
        backgroundColor: DEFAULT_TUNING.ground,
        display: open ? undefined : "none",
      }}
      data-testid="village-map-overlay"
    >
      <div className="min-h-0 min-w-0 flex-1">
        <VillageMap
          build={build}
          tuning={DEFAULT_TUNING}
          overrides={overrides}
          pathOverrides={pathOverrides}
          trees={demo?.trees ?? VILLAGE_MAP_TREES}
          highlightId={highlightId}
          reveal={open ? revealRef.current : null}
          onOverride={ignoreMapEdit}
          onPathOverride={ignoreMapEdit}
          onActiveLabel={ignoreMapEdit}
          onHoverBuilding={onHoverBuilding}
          readOnly
          heartfireLevel={heartfireLevel}
        />
      </div>
    </div>
  );
}
