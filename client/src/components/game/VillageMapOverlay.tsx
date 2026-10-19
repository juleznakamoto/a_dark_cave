import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { GAME_CHROME_NO_BG_HOVER } from "@/components/game/gameChrome";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import {
  villageEvolutionFrames,
  villageEvolutionStepMs,
} from "@/game/villageMapPlayback";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  resettleVillageSilverCoins,
  visibleVillageSilverCoins,
  type VillageMapCoinMetal,
} from "@/game/villageMapSilver";
import "@/i18n";
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

const MAP_PLAY_BUTTON =
  `group absolute left-2 top-1 z-10 shrink-0 px-1 py-1 text-xs font-medium text-neutral-300 pointer-events-auto ${GAME_CHROME_NO_BG_HOVER}`;
const MAP_PLAY_ICON =
  "opacity-80 transition-[opacity,color] group-hover:opacity-100 text-neutral-300 group-hover:!text-neutral-300";

type MapPlayback = {
  frames: ReturnType<typeof villageEvolutionFrames>;
  index: number;
  stepMs: number;
};

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
  const { t } = useTranslation("common");
  const { t: tUi } = useUiTranslation();
  const open = useGameStore((state) => state.activeTab === "map");
  const [playback, setPlayback] = useState<MapPlayback | null>(null);
  const silverCoins = useGameStore((state) => state.villageSilverCoins);
  const seenResources = useGameStore((state) => state.seenResources);
  const silverHeld = useGameStore((state) => state.resources.silver ?? 0);
  const goldHeld = useGameStore((state) => state.resources.gold ?? 0);
  const visibleCoins = useMemo(
    () =>
      visibleVillageSilverCoins(
        { seenResources, resources: { silver: silverHeld, gold: goldHeld } },
        silverCoins ?? [],
      ),
    [silverCoins, seenResources, silverHeld, goldHeld],
  );
  const keptRef = useRef(open);
  if (open) keptRef.current = true;
  const sidePanelHover = useSidePanelActiveTooltipHoverId();
  const moved = useGameStore((state) => state.villageMapOverrides);
  const pathMoved = useGameStore((state) => state.villageMapPathOverrides);
  const buildings = useGameStore((state) => state.buildings);
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const blessings = useGameStore((state) => state.blessings);
  const collectSilverCoin = useCallback((id: string) => {
    useGameStore.getState().collectVillageSilverCoin(id);
  }, []);
  const coinHoverRef = useRef<VillageMapCoinMetal | null>(null);
  const onHoverCoin = useCallback((metal: VillageMapCoinMetal | null) => {
    coinHoverRef.current = metal;
    useGameStore.getState().setHighlightedResources(metal ? [metal] : []);
  }, []);
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
  const liveBuild = useMemo(
    () => buildStateFromPlayer(buildings, blessings),
    [buildings, blessings],
  );
  const evolution = useMemo(() => villageEvolutionFrames(liveBuild), [liveBuild]);
  const shownBuild = playback?.frames[playback.index] ?? liveBuild;
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
      placedSlots(liveBuild, DEFAULT_TUNING, overrides).map((slot) => ({
        id: slot.id,
        tier: slot.tier,
      })),
    [liveBuild, overrides],
  );
  const featureMarks = useMemo(() => villageMapFeatureMarks(liveBuild), [liveBuild]);
  const markKey = [...slotMarks, ...featureMarks].map((mark) => `${mark.id}:${mark.tier}`).join("|");
  const revealRef = useRef<VillageMapReveal | null>(null);
  /** Mark key frozen while a replay is up, so the open-map fade does not restart when it ends. */
  const revealCutRef = useRef<string | null>(null);
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
  useLayoutEffect(() => {
    if (!open) return;
    const patch = resettleVillageSilverCoins(useGameStore.getState());
    if (patch) useGameStore.setState(patch);
  }, [open, liveBuild, overrides, pathOverrides]);

  if (!open) {
    revealCutRef.current = null;
  } else if (playback && revealCutRef.current == null) {
    revealCutRef.current = markKey;
  } else if (!playback && revealCutRef.current != null && revealCutRef.current !== markKey) {
    revealCutRef.current = null;
  }
  const replaying = playback != null;

  const onPlayClick = () => {
    if (playback) {
      setPlayback(null);
      return;
    }
    if (evolution.length < 2) return;
    if (coinHoverRef.current) {
      coinHoverRef.current = null;
      useGameStore.getState().setHighlightedResources([]);
    }
    setPlayback({
      frames: evolution,
      index: 0,
      stepMs: villageEvolutionStepMs(liveBuild),
    });
  };

  useEffect(() => {
    useGameStore.getState().setVillageMapReplaying(open && playback != null);
  }, [open, playback]);

  useEffect(() => {
    return () => {
      useGameStore.getState().setVillageMapReplaying(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setPlayback(null);
      return;
    }
    if (!playback) return;
    const timer = window.setTimeout(() => {
      setPlayback((current) => {
        if (!current) return null;
        const next = current.index + 1;
        if (next >= current.frames.length) return null;
        return { ...current, index: next };
      });
    }, playback.stepMs);
    return () => window.clearTimeout(timer);
  }, [open, playback]);

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
      if (coinHoverRef.current) {
        coinHoverRef.current = null;
        useGameStore.getState().setHighlightedResources([]);
      }
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
          build={shownBuild}
          tuning={DEFAULT_TUNING}
          overrides={overrides}
          pathOverrides={pathOverrides}
          trees={demo?.trees ?? VILLAGE_MAP_TREES}
          highlightId={replaying ? null : highlightId}
          reveal={open && !replaying && revealCutRef.current == null ? revealRef.current : null}
          onOverride={ignoreMapEdit}
          onPathOverride={ignoreMapEdit}
          onActiveLabel={ignoreMapEdit}
          onHoverBuilding={onHoverBuilding}
          readOnly
          heartfireLevel={heartfireLevel}
          silverCoins={replaying ? [] : visibleCoins}
          onSilverCoin={collectSilverCoin}
          onHoverSilverCoin={onHoverCoin}
          silverCoinLabel={t("resources.silver", { defaultValue: "Silver" })}
          goldCoinLabel={t("resources.gold", { defaultValue: "Gold" })}
        />
      </div>
      {(playback || evolution.length > 1) && (
        <Button
          variant="ghost"
          size="xs"
          button_id="village-map-play"
          data-testid="button-village-map-play"
          aria-pressed={replaying}
          aria-label={
            replaying
              ? tUi("map.stopGrowth", { defaultValue: "Stop village growth" })
              : tUi("map.playGrowth", { defaultValue: "Play village growth" })
          }
          className={MAP_PLAY_BUTTON}
          onClick={onPlayClick}
        >
          <GameUiIcon
            name={replaying ? "pause" : "unpause"}
            sizeClassName="game-tab-icon"
            className={MAP_PLAY_ICON}
          />
        </Button>
      )}
    </div>
  );
}
