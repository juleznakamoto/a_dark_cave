import { useEffect, useMemo, useRef } from "react";
import { useGameStore } from "@/game/state";
import { VILLAGE_MAP_POSITIONS } from "@/game/villageMapLayout";
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
  revealForMapChange,
  villageMapFeatureMarks,
  VILLAGE_MAP_FADE_IN_MS,
  type VillageMapReveal,
} from "@/game/villageMapReveal";
import { useSidePanelActiveTooltipHoverId } from "./panels/SidePanelSection";

/** The arrangement currently saved by /dev/village-map, if this browser has one. */
function readDemoSnapshot(): DemoSnapshot | null {
  try {
    const raw = localStorage.getItem(VILLAGE_MAP_DEMO_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Village map, shown in the middle panel while the Map tab is open. */
export default function VillageMapOverlay() {
  const open = useGameStore((state) => state.activeTab === "map");
  const sidePanelHover = useSidePanelActiveTooltipHoverId();
  const canMove = useGameStore((state) => state.hasWonAnyGame);
  const moved = useGameStore((state) => state.villageMapOverrides);
  const buildings = useGameStore((state) => state.buildings);
  const blessings = useGameStore((state) => state.blessings);
  const heartfireLevel = useGameStore((state) => state.heartfireState?.level ?? 0);
  const wasOpen = useRef(false);
  const demoRef = useRef<DemoSnapshot | null>(null);
  if (open !== wasOpen.current) {
    wasOpen.current = open;
    demoRef.current = open ? readDemoSnapshot() : null;
  }
  const demo = demoRef.current;
  const build = useMemo(() => buildStateFromPlayer(buildings, blessings), [buildings, blessings]);
  const overrides = useMemo(
    () => ({ ...VILLAGE_MAP_POSITIONS, ...(demo?.overrides ?? {}), ...(moved ?? {}) }),
    [demo, moved],
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
    revealRef.current = next.reveal;
    shownRef.current = next.shown;
    markKeyRef.current = markKey;
  } else if (open && markKey !== markKeyRef.current) {
    const next = applyMarks(revealRef.current, shownRef.current);
    revealRef.current = next.reveal;
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
    const timer = window.setTimeout(() => {
      useGameStore.getState().setVillageMapSeenTiers({ ...shownRef.current });
    }, VILLAGE_MAP_FADE_IN_MS);
    return () => window.clearTimeout(timer);
  }, [open, markKey]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ backgroundColor: DEFAULT_TUNING.ground }}
      data-testid="village-map-overlay"
    >
      <VillageMap
        build={build}
        tuning={DEFAULT_TUNING}
        overrides={overrides}
        highlightId={highlightId}
        reveal={revealRef.current}
        onOverride={(id, point) => {
          if (!canMove) return;
          useGameStore.getState().setVillageMapOverride(id, point);
        }}
        onActiveLabel={() => { }}
        onHoverBuilding={(buildingId) => {
          setVillageMapHoveredBuilding(
            buildingId ? sidePanelRowFromMapBuilding(buildingId, buildings) : null,
          );
        }}
        readOnly={!canMove}
        heartfireLevel={heartfireLevel}
      />
    </div>
  );
}
